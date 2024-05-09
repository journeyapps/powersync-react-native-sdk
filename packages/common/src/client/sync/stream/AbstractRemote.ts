import Logger, { ILogger } from 'js-logger';
import { fetch } from 'cross-fetch';
import { PowerSyncCredentials } from '../../connection/PowerSyncCredentials';
import { StreamingSyncLine, StreamingSyncRequest } from './streaming-sync-types';
import { DataStream } from '../../../utils/DataStream';
import ndjsonStream from 'can-ndjson-stream';
import { RSocket, RSocketConnector, Requestable } from 'rsocket-core';
import { WebsocketClientTransport } from 'rsocket-websocket-client';
import { serialize, deserialize } from 'bson';
import { AbortOperation } from '../../../utils/AbortOperation';
import { Buffer } from 'buffer';

export type RemoteConnector = {
  fetchCredentials: () => Promise<PowerSyncCredentials | null>;
};

// Refresh at least 30 sec before it expires
const REFRESH_CREDENTIALS_SAFETY_PERIOD_MS = 30_000;
const SYNC_QUEUE_REQUEST_N = 10;
const SYNC_QUEUE_REQUEST_LOW_WATER = 5;

export const DEFAULT_REMOTE_LOGGER = Logger.get('PowerSyncRemote');

export type SyncStreamOptions = {
  path: string;
  data: StreamingSyncRequest;
  headers?: Record<string, string>;
  abortSignal?: AbortSignal;
  fetchOptions?: Request;
};

export type AbstractRemoteOptions = {
  /**
   * Transforms the PowerSync base URL which might contain
   * `http(s)://` to the corresponding web socket variant
   * e.g. `ws(s)://`
   */
  socketUrlTransformer: (url: string) => string;

  /**
   * Optionally provide the fetch implementation to use.
   * Note that this usually needs to be bound to the global scope.
   * Binding should be done before passing here.
   */
  fetchImplementation: typeof fetch;
};

export const DEFAULT_REMOTE_OPTIONS: AbstractRemoteOptions = {
  socketUrlTransformer: (url) =>
    url.replace(/^https?:\/\//, function (match) {
      return match === 'https://' ? 'wss://' : 'ws://';
    }),
  fetchImplementation: fetch.bind(globalThis)
};

export abstract class AbstractRemote {
  protected credentials: PowerSyncCredentials | null = null;
  protected options: AbstractRemoteOptions;

  constructor(
    protected connector: RemoteConnector,
    protected logger: ILogger = DEFAULT_REMOTE_LOGGER,
    options?: Partial<AbstractRemoteOptions>
  ) {
    this.options = {
      ...DEFAULT_REMOTE_OPTIONS,
      ...(options ?? {})
    };
  }

  get fetch() {
    return this.options.fetchImplementation;
  }

  async getCredentials(): Promise<PowerSyncCredentials | null> {
    const { expiresAt } = this.credentials ?? {};
    if (expiresAt && expiresAt > new Date(new Date().valueOf() + REFRESH_CREDENTIALS_SAFETY_PERIOD_MS)) {
      return this.credentials!;
    }
    this.credentials = await this.connector.fetchCredentials();
    return this.credentials;
  }

  protected async buildRequest(path: string) {
    const credentials = await this.getCredentials();
    if (credentials != null && (credentials.endpoint == null || credentials.endpoint == '')) {
      throw new Error('PowerSync endpoint not configured');
    } else if (credentials?.token == null || credentials?.token == '') {
      const error: any = new Error(`Not signed in`);
      error.status = 401;
      throw error;
    }

    return {
      url: credentials.endpoint + path,
      headers: {
        'content-type': 'application/json',
        Authorization: `Token ${credentials.token}`
      }
    };
  }

  async post(path: string, data: any, headers: Record<string, string> = {}): Promise<any> {
    const request = await this.buildRequest(path);
    const res = await fetch(request.url, {
      method: 'POST',
      headers: {
        ...headers,
        ...request.headers
      },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      throw new Error(`Received ${res.status} - ${res.statusText} when posting to ${path}: ${await res.text()}}`);
    }

    return res.json();
  }

  async get(path: string, headers?: Record<string, string>): Promise<any> {
    const request = await this.buildRequest(path);

    const res = await this.fetch(request.url, {
      method: 'GET',
      headers: {
        ...headers,
        ...request.headers
      }
    });

    if (!res.ok) {
      throw new Error(`Received ${res.status} - ${res.statusText} when getting from ${path}: ${await res.text()}}`);
    }

    return res.json();
  }

  async postStreaming(
    path: string,
    data: any,
    headers: Record<string, string> = {},
    signal?: AbortSignal
  ): Promise<any> {
    const request = await this.buildRequest(path);

    const res = await this.fetch(request.url, {
      method: 'POST',
      headers: { ...headers, ...request.headers },
      body: JSON.stringify(data),
      signal,
      cache: 'no-store'
    }).catch((ex) => {
      this.logger.error(`Caught ex when POST streaming to ${path}`, ex);
      throw ex;
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Could not POST streaming to ${path} - ${res.status} - ${res.statusText}: ${text}`);
      const error: any = new Error(`HTTP ${res.statusText}: ${text}`);
      error.status = res.status;
      throw error;
    }

    return res;
  }

  /**
   * Connects to the sync/stream websocket endpoint
   */
  async socketStream(options: SyncStreamOptions): Promise<DataStream<StreamingSyncLine>> {
    const { path } = options;
    const request = await this.buildRequest(path);

    const connector = new RSocketConnector({
      transport: new WebsocketClientTransport({
        url: this.options.socketUrlTransformer(request.url)
      }),
      setup: {
        dataMimeType: 'application/bson',
        metadataMimeType: 'application/bson',
        payload: {
          data: null,
          metadata: Buffer.from(
            serialize({
              token: request.headers.Authorization
            })
          )
        }
      }
    });

    let rsocket: RSocket;
    try {
      rsocket = await connector.connect();
    } catch (ex) {
      /**
       * On React native the connection exception can be `undefined` this causes issues
       * with detecting the exception inside async-mutex
       */
      throw new Error(`Could not connect to PowerSync instance: ${JSON.stringify(ex)}`);
    }

    const stream = new DataStream({
      logger: this.logger,
      pressure: {
        lowWaterMark: SYNC_QUEUE_REQUEST_LOW_WATER
      }
    });

    let socketIsClosed = false;
    const closeSocket = () => {
      if (socketIsClosed) {
        return;
      }
      socketIsClosed = true;
      rsocket.close();
    }
    // We initially request this amount and expect these to arrive eventually
    let pendingEventsCount = SYNC_QUEUE_REQUEST_N;

    const socket = await new Promise<Requestable>((resolve, reject) => {
      let connectionEstablished = false;

      const res = rsocket.requestStream(
        {
          data: Buffer.from(serialize(options.data)),
          metadata: Buffer.from(
            serialize({
              path
            })
          )
        },
        SYNC_QUEUE_REQUEST_N, // The initial N amount
        {
          onError: (e) => {
            // Don't log closed as an error
            if (e.message !== 'Closed. ') {
              this.logger.error(e);
            }
            // RSocket will close this automatically
            // Attempting to close multiple times causes a console warning
            socketIsClosed = true;
            stream.close();
            // Handles cases where the connection failed e.g. auth error or connection error
            if (!connectionEstablished) {
              reject(e);
            }
          },
          onNext: (payload) => {
            // The connection is active
            if (!connectionEstablished) {
              connectionEstablished = true;
              resolve(res);
            }
            const { data } = payload;
            // Less events are now pending
            pendingEventsCount--;
            if (!data) {
              return;
            }

            const deserializedData = deserialize(data);
            stream.enqueueData(deserializedData);
          },
          onComplete: () => {
            stream.close();
          },
          onExtension: () => {}
        }
      );
    });

    const l = stream.registerListener({
      lowWater: async () => {
        // Request to fill up the queue
        const required = SYNC_QUEUE_REQUEST_N - pendingEventsCount;
        if (required > 0) {
          socket.request(SYNC_QUEUE_REQUEST_N - pendingEventsCount);
          pendingEventsCount = SYNC_QUEUE_REQUEST_N;
        }
      },
      closed: () => {
        closeSocket();
        l?.();
      }
    });

    /**
     * Handle abort operations here.
     * Unfortunately cannot insert them into the connection.
     */
    if (options.abortSignal?.aborted) {
      stream.close();
    } else {
      options.abortSignal?.addEventListener('abort', () => {
        stream.close();
      });
    }

    return stream;
  }

  /**
   * Connects to the sync/stream http endpoint
   */
  async postStream(options: SyncStreamOptions): Promise<DataStream<StreamingSyncLine>> {
    const { data, path, headers, abortSignal } = options;

    const request = await this.buildRequest(path);

    /**
     * This abort controller will abort pending fetch requests.
     * If the request has resolved, it will be used to close the readable stream.
     * Which will cancel the network request.
     *
     * This nested controller is required since:
     *  Aborting the active fetch request while it is being consumed seems to throw
     *  an unhandled exception on the window level.
     */
    const controller = new AbortController();
    let requestResolved = false;
    abortSignal?.addEventListener('abort', () => {
      if (!requestResolved) {
        // Only abort via the abort controller if the request has not resolved yet
        controller.abort(
          abortSignal.reason ??
            new AbortOperation('Cancelling network request before it resolves. Abort signal has been received.')
        );
      }
    });

    const res = await this.fetch(request.url, {
      method: 'POST',
      headers: { ...headers, ...request.headers },
      body: JSON.stringify(data),
      signal: controller.signal,
      cache: 'no-store',
      ...options.fetchOptions
    }).catch((ex) => {
      if (ex.name == 'AbortError') {
        throw new AbortOperation(`Pending fetch request to ${request.url} has been aborted.`);
      }
      throw ex;
    });

    if (!res) {
      throw new Error('Fetch request was aborted');
    }

    requestResolved = true;

    if (!res.ok || !res.body) {
      const text = await res.text();
      this.logger.error(`Could not POST streaming to ${path} - ${res.status} - ${res.statusText}: ${text}`);
      const error: any = new Error(`HTTP ${res.statusText}: ${text}`);
      error.status = res.status;
      throw error;
    }

    /**
     * The can-ndjson-stream does not handle aborted streams well.
     * This will intercept the readable stream and close the stream if
     * aborted.
     */
    const reader = res.body.getReader();
    // This will close the network request and read stream
    const closeReader = async () => {
      try {
        await reader.cancel();
      } catch (ex) {
        // an error will throw if the reader hasn't been used yet
      }
      reader.releaseLock();
    };

    abortSignal?.addEventListener('abort', () => {
      closeReader();
    });

    const outputStream = new ReadableStream({
      start: (controller) => {
        const processStream = async () => {
          while (!abortSignal?.aborted) {
            try {
              const { done, value } = await reader.read();
              // When no more data needs to be consumed, close the stream
              if (done) {
                break;
              }
              // Enqueue the next data chunk into our target stream
              controller.enqueue(value);
            } catch (ex) {
              this.logger.error('Caught exception when reading sync stream', ex);
              break;
            }
          }
          if (!abortSignal?.aborted) {
            // Close the downstream readable stream
            await closeReader();
          }
          controller.close();
        };
        processStream();
      }
    });

    const jsonS = ndjsonStream(new Response(outputStream).body);

    const stream = new DataStream({
      logger: this.logger
    });

    const r = jsonS.getReader();

    const l = stream.registerListener({
      lowWater: async () => {
        try {
          const { done, value } = await r.read();
          // Exit if we're done
          if (done) {
            stream.close();
            l?.();
            return;
          }
          stream.enqueueData(value);
        } catch (ex) {
          stream.close();
          throw ex;
        }
      },
      closed: () => {
        closeReader();
        l?.();
      }
    });

    return stream;
  }
}

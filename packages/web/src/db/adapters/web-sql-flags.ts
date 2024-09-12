import { SQLOpenOptions } from '@powersync/common';

/**
 * Common settings used when creating SQL connections on web.
 */
export interface WebSQLFlags {
  /**
   * Broadcast logs from shared workers, such as the shared sync worker,
   * to individual tabs. This defaults to true.
   */
  broadcastLogs?: boolean;

  /**
   * SQLite operations are currently not supported in SSR mode.
   * A warning will be logged if attempting to use SQLite in SSR.
   * Setting this to `true` will disabled the warning above.
   */
  disableSSRWarning?: boolean;

  /**
   * Enables multi tab support
   */
  enableMultiTabs?: boolean;

  /**
   * The SQLite connection is often executed through a web worker
   * in order to offload computation. This can be used to manually
   * disable the use of web workers in environments where web workers
   * might be unstable.
   */
  useWebWorker?: boolean;

  /**
   * Open in SSR placeholder mode. DB operations and Sync operations will be a No-op
   */
  ssrMode?: boolean;
}

export type RequiredWebSQLFlags = Required<WebSQLFlags>;

export interface BaseWebSQLOpenOptions extends SQLOpenOptions {
  /**
   * These should be the resolved flags.
   */
  flags?: WebSQLFlags;
}

/**
 * Options for opening a Web SQL connection
 */
export interface WebSQLOpenFactoryOptions extends BaseWebSQLOpenOptions {
  /**
   * Allows you to override the default wasqlite db worker.
   *
   * You can either provide a path to the worker script
   * or a factory method that returns a worker.
   */
  // TODO cleanup
  worker?: string | URL | ((options: BaseWebSQLOpenOptions & { flags: RequiredWebSQLFlags }) => Worker | SharedWorker);
}

export function isServerSide() {
  return typeof window == 'undefined';
}

export const DEFAULT_WEB_SQL_FLAGS: Required<WebSQLFlags> = {
  broadcastLogs: true,
  disableSSRWarning: false,
  ssrMode: isServerSide(),
  /**
   * Multiple tabs are by default not supported on Android, iOS and Safari.
   * Other platforms will have multiple tabs enabled by default.
   */
  enableMultiTabs:
    typeof globalThis.navigator !== 'undefined' && // For SSR purposes
    typeof SharedWorker !== 'undefined' &&
    !navigator.userAgent.match(/(Android|iPhone|iPod|iPad)/i) &&
    !(window as any).safari,
  useWebWorker: true
};

export function resolveWebSQLFlags(flags?: WebSQLFlags): Required<WebSQLFlags> {
  const resolvedFlags = {
    ...DEFAULT_WEB_SQL_FLAGS,
    ...(flags ?? {})
  };
  if (typeof flags?.enableMultiTabs != 'undefined') {
    resolvedFlags.enableMultiTabs = flags.enableMultiTabs;
  }
  if (flags?.useWebWorker === false) {
    resolvedFlags.enableMultiTabs = false;
  }
  return resolvedFlags;
}

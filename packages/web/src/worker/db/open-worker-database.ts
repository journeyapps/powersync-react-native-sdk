import * as Comlink from 'comlink';
import type { OpenDB } from '../../shared/types';

/**
 * Opens a shared or dedicated worker which exposes opening of database connections
 */
export function openWorkerDatabasePort(
  workerIdentifier: string,
  multipleTabs = true,
  worker: string | (() => Worker | SharedWorker) = ''
) {
  if (worker) {
    if (typeof worker === 'string') {
      return multipleTabs
        ? new SharedWorker(`${worker}`, {
            /* @vite-ignore */
            name: `shared-DB-worker-${workerIdentifier}`
          }).port
        : new Worker(`${worker}`, {
            /* @vite-ignore */
            name: `DB-worker-${workerIdentifier}`
          });
    }

    const workerInstance = worker();
    return isSharedWorker(workerInstance) ? workerInstance.port : workerInstance;
  } else {
    /**
     *  Webpack V5 can bundle the worker automatically if the full Worker constructor syntax is used
     *  https://webpack.js.org/guides/web-workers/
     *  This enables multi tab support by default, but falls back if SharedWorker is not available
     *  (in the case of Android)
     */
    return multipleTabs
      ? new SharedWorker(new URL('./SharedWASQLiteDB.worker.js', import.meta.url), {
          /* @vite-ignore */
          name: `shared-DB-worker-${workerIdentifier}`,
          type: 'module'
        }).port
      : new Worker(new URL('./WASQLiteDB.worker.js', import.meta.url), {
          /* @vite-ignore */
          name: `DB-worker-${workerIdentifier}`,
          type: 'module'
        });
  }
}

function isSharedWorker(worker: Worker | SharedWorker): worker is SharedWorker {
  return 'port' in worker;
}

/**
 * @returns A function which allows for opening database connections inside
 * a worker.
 */
export function getWorkerDatabaseOpener(
  workerIdentifier: string,
  multipleTabs = true,
  worker: string | (() => Worker | SharedWorker) = ''
) {
  return Comlink.wrap<OpenDB>(openWorkerDatabasePort(workerIdentifier, multipleTabs, worker));
}

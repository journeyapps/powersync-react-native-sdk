import * as Comlink from 'comlink';
import type { OpenDB } from '../../shared/types';

export type OpenWorkerOptions = {
  workerIdentifier: string;
  multipleTabs?: boolean;
  url?: URL;
};
/**
 * Opens a shared or dedicated worker which exposes opening of database connections
 */
export function openWorkerDatabasePort(options: OpenWorkerOptions) {
  const { workerIdentifier, multipleTabs = true, url } = options;
  /**
   *  Webpack V5 can bundle the worker automatically if the full Worker constructor syntax is used
   *  https://webpack.js.org/guides/web-workers/
   *  This enables multi tab support by default, but falls back if SharedWorker is not available
   *  (in the case of Android)
   */
  return multipleTabs
    ? new SharedWorker(url ?? new URL('./SharedWASQLiteDB.worker.js', import.meta.url), {
        /* @vite-ignore */
        name: `shared-DB-worker-${workerIdentifier}`,
        type: 'module'
      }).port
    : new Worker(url ?? new URL('./WASQLiteDB.worker.js', import.meta.url), {
        /* @vite-ignore */
        name: `DB-worker-${workerIdentifier}`,
        type: 'module'
      });
}

/**
 * @returns A function which allows for opening database connections inside
 * a worker.
 */
export function getWorkerDatabaseOpener(options: OpenWorkerOptions) {
  return Comlink.wrap<OpenDB>(openWorkerDatabasePort(options));
}

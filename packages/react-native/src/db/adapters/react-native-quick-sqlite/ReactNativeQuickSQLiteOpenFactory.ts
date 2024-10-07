import { DBAdapter, SQLOpenFactory, SQLOpenOptions } from '@powersync/common';
import { DeferedRNQSDBAdapter } from './DeferedRNQSDBAdapter';

/**
 * Opens a SQLite connection using React Native Quick SQLite
 */
export class ReactNativeQuickSqliteOpenFactory implements SQLOpenFactory {
  constructor(protected options: SQLOpenOptions) {}

  openDB(): DBAdapter {
    return new DeferedRNQSDBAdapter(this.options);
  }
}

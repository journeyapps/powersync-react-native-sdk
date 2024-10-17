import {
  BaseObserver,
  DBAdapter,
  DBAdapterListener,
  DBLockOptions,
  QueryResult,
  SQLOpenOptions,
  Transaction
} from '@powersync/common';
import { ANDROID_DATABASE_PATH, IOS_LIBRARY_PATH, open, type DB } from '@op-engineering/op-sqlite';
import Lock from 'async-lock';
import { OPSQLiteConnection } from './OPSQLiteConnection';
import { NativeModules, Platform } from 'react-native';
import { SqliteOptions } from './SqliteOptions';

/**
 * Adapter for React Native Quick SQLite
 */
export type OPSQLiteAdapterOptions = {
  name: string;
  dbLocation?: string;
  sqliteOptions?: SqliteOptions;
};

enum LockType {
  READ = 'read',
  WRITE = 'write'
}

const READ_CONNECTIONS = 5;

export class OPSQLiteDBAdapter extends BaseObserver<DBAdapterListener> implements DBAdapter {
  name: string;
  protected locks: Lock;

  protected initialized: Promise<void>;

  protected readConnections: OPSQLiteConnection[] | null;

  protected writeConnection: OPSQLiteConnection | null;

  constructor(protected options: OPSQLiteAdapterOptions) {
    super();
    this.name = this.options.name;

    this.locks = new Lock();
    this.readConnections = null;
    this.writeConnection = null;
    this.initialized = this.init();
  }

  protected async init() {
    const { lockTimeoutMs, journalMode, journalSizeLimit, synchronous, encryptionKey } = this.options.sqliteOptions;
    const dbFilename = this.options.name;

    this.writeConnection = await this.openConnection(dbFilename);

    const statements: string[] = [
      `PRAGMA busy_timeout = ${lockTimeoutMs}`,
      `PRAGMA journal_mode = ${journalMode}`,
      `PRAGMA journal_size_limit = ${journalSizeLimit}`,
      `PRAGMA synchronous = ${synchronous}`
    ];

    for (const statement of statements) {
      for (let tries = 0; tries < 30; tries++) {
        try {
          await this.writeConnection!.execute(statement);
          break;
        } catch (e: any) {
          if (e instanceof Error && e.message.includes('database is locked') && tries < 29) {
            continue;
          } else {
            throw e;
          }
        }
      }
    }

    // Changes should only occur in the write connection
    this.writeConnection!.registerListener({
      tablesUpdated: (notification) => this.iterateListeners((cb) => cb.tablesUpdated?.(notification))
    });

    this.readConnections = [];
    for (let i = 0; i < READ_CONNECTIONS; i++) {
      // Workaround to create read-only connections
      let dbName = './'.repeat(i + 1) + dbFilename;
      const conn = await this.openConnection(dbName);
      await conn.execute('PRAGMA query_only = true');
      this.readConnections.push(conn);
    }
  }

  protected async openConnection(filenameOverride?: string): Promise<OPSQLiteConnection> {
    const dbFilename = filenameOverride ?? this.options.name;
    const DB: DB = this.openDatabase(dbFilename, this.options.sqliteOptions.encryptionKey);

    //Load extension for all connections
    this.loadExtension(DB);

    await DB.execute('SELECT powersync_init()');

    return new OPSQLiteConnection({
      baseDB: DB
    });
  }

  private getDbLocation(dbLocation?: string): string {
    if (Platform.OS === 'ios') {
      return dbLocation ?? IOS_LIBRARY_PATH;
    } else {
      return dbLocation ?? ANDROID_DATABASE_PATH;
    }
  }

  private openDatabase(dbFilename: string, encryptionKey?: string): DB {
    //This is needed because an undefined/null dbLocation will cause the open function to fail
    const location = this.getDbLocation(this.options.dbLocation);
    //Simarlily if the encryption key is undefined/null when using SQLCipher it will cause the open function to fail
    if (encryptionKey) {
      return open({
        name: dbFilename,
        location: location,
        encryptionKey: encryptionKey
      });
    } else {
      return open({
        name: dbFilename,
        location: location
      });
    }
  }

  private loadExtension(DB: DB) {
    if (Platform.OS === 'ios') {
      const bundlePath: string = NativeModules.PowerSyncOpSqlite.getBundlePath();
      const libPath = `${bundlePath}/Frameworks/powersync-sqlite-core.framework/powersync-sqlite-core`;
      DB.loadExtension(libPath, 'sqlite3_powersync_init');
    } else {
      DB.loadExtension('libpowersync', 'sqlite3_powersync_init');
    }
  }

  close() {
    this.initialized.then(() => {
      this.writeConnection!.close();
      this.readConnections!.forEach((c) => c.close());
    });
  }

  async readLock<T>(fn: (tx: OPSQLiteConnection) => Promise<T>, options?: DBLockOptions): Promise<T> {
    await this.initialized;
    // TODO: Use async queues to handle multiple read connections
    const sortedConnections = this.readConnections!.map((connection, index) => ({
      lockKey: `${LockType.READ}-${index}`,
      connection
    })).sort((a, b) => {
      const aBusy = this.locks.isBusy(a.lockKey);
      const bBusy = this.locks.isBusy(b.lockKey);
      // Sort by ones which are not busy
      return aBusy > bBusy ? 1 : 0;
    });

    return new Promise(async (resolve, reject) => {
      try {
        await this.locks.acquire(
          sortedConnections[0].lockKey,
          async () => {
            resolve(await fn(sortedConnections[0].connection));
          },
          { timeout: options?.timeoutMs }
        );
      } catch (ex) {
        reject(ex);
      }
    });
  }

  async writeLock<T>(fn: (tx: OPSQLiteConnection) => Promise<T>, options?: DBLockOptions): Promise<T> {
    await this.initialized;

    return new Promise(async (resolve, reject) => {
      try {
        await this.locks.acquire(
          LockType.WRITE,
          async () => {
            resolve(await fn(this.writeConnection!));
          },
          { timeout: options?.timeoutMs }
        );
      } catch (ex) {
        reject(ex);
      }
    });
  }

  readTransaction<T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.readLock((ctx) => this.internalTransaction(ctx, fn));
  }

  writeTransaction<T>(fn: (tx: Transaction) => Promise<T>, options?: DBLockOptions): Promise<T> {
    return this.writeLock((ctx) => this.internalTransaction(ctx, fn));
  }

  getAll<T>(sql: string, parameters?: any[]): Promise<T[]> {
    return this.readLock((ctx) => ctx.getAll(sql, parameters));
  }

  getOptional<T>(sql: string, parameters?: any[]): Promise<T | null> {
    return this.readLock((ctx) => ctx.getOptional(sql, parameters));
  }

  get<T>(sql: string, parameters?: any[]): Promise<T> {
    return this.readLock((ctx) => ctx.get(sql, parameters));
  }

  execute(query: string, params?: any[]) {
    return this.writeLock((ctx) => ctx.execute(query, params));
  }

  async executeBatch(query: string, params: any[][] = []): Promise<QueryResult> {
    return this.writeLock((ctx) => ctx.executeBatch(query, params));
  }

  protected async internalTransaction<T>(
    connection: OPSQLiteConnection,
    fn: (tx: Transaction) => Promise<T>
  ): Promise<T> {
    let finalized = false;
    const commit = async (): Promise<QueryResult> => {
      if (finalized) {
        return { rowsAffected: 0 };
      }
      finalized = true;
      return connection.execute('COMMIT');
    };
    const rollback = async (): Promise<QueryResult> => {
      if (finalized) {
        return { rowsAffected: 0 };
      }
      finalized = true;
      return connection.execute('ROLLBACK');
    };
    try {
      await connection.execute('BEGIN');
      const result = await fn({
        execute: (query, params) => connection.execute(query, params),
        get: (query, params) => connection.get(query, params),
        getAll: (query, params) => connection.getAll(query, params),
        getOptional: (query, params) => connection.getOptional(query, params),
        commit,
        rollback
      });
      await commit();
      return result;
    } catch (ex) {
      await rollback();
      throw ex;
    }
  }
}

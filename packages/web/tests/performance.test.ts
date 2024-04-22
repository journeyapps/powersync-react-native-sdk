import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AbstractPowerSyncDatabase, Schema, TableV2, column } from '@powersync/common';
import { WASQLitePowerSyncDatabaseOpenFactory } from '@powersync/web';

describe('Basic', () => {
  const users = new TableV2({
    name: column.text,
    email: column.text
  });

  const factory = new WASQLitePowerSyncDatabaseOpenFactory({
    dbFilename: 'test-user.db',
    flags: {
      enableMultiTabs: false
    },
    schema: new Schema({ users })
  });

  let db: AbstractPowerSyncDatabase;

  beforeEach(() => {
    db = factory.getInstance();
  });

  afterEach(async () => {
    await db.disconnectAndClear();
    await db.close();
  });

  // Performance tests for CRUD
  describe('Performance tests', { timeout: 50000 }, async () => {
    it('INSERT 1000 records', async () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        await db.execute('INSERT INTO users (id, name, email) VALUES(uuid(), ?, ?)', ['Test User', 'user@test.com']);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      console.log(`Total time taken for 1000 inserts: ${totalTime.toFixed(2)} milliseconds`);
      expect(await db.get('SELECT count(*) as count FROM users')).deep.equals({ count: 1000 });
    });

    it('INSERT 1000 records in a transaction', async () => {
      const startTime = performance.now();
      await db.writeTransaction(async (tx) => {
        for (let i = 0; i < 1000; i++) {
          await tx.execute('INSERT INTO users(id, name, email) VALUES(uuid(), ?, ?)', [
            'Test User',
            'user@example.org'
          ]);
        }
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      console.log(`Total time taken for 1000 inserts in transaction: ${totalTime.toFixed(2)} milliseconds`);
      expect(await db.get('SELECT count(*) as count FROM users')).deep.equals({ count: 1000 });
    });

    it('INSERT 1000 records in batch', async () => {
      const startTime = performance.now();
      const values: any[][] = [];
      for (let i = 0; i < 1000; i++) {
        values.push(['Test User', 'user@example.org']);
      }
      await db.executeBatch('INSERT INTO users(id, name, email) VALUES(uuid(), ?, ?)', values);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      console.log(`Total time taken for 1000 inserts in batch: ${totalTime.toFixed(2)} milliseconds`);
      expect(await db.get('SELECT count(*) as count FROM users')).deep.equals({ count: 1000 });
    });
  });
});

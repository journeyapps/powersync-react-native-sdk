import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AbstractPowerSyncDatabase, Column, ColumnType, CrudEntry, Schema, Table, UpdateType } from '@powersync/common';
import { WASQLitePowerSyncDatabaseOpenFactory } from '@powersync/web';
import { v4 as uuid } from 'uuid';
import { testSchema } from './utils/test-schema';

const testId = '2290de4f-0488-4e50-abed-f8e8eb1d0b42';

describe('CRUD Tests', () => {
  let powersync: AbstractPowerSyncDatabase;

  beforeEach(async () => {
    powersync = new WASQLitePowerSyncDatabaseOpenFactory({
      /**
       * Deleting the IndexDB seems to freeze the test.
       * Use a new DB for each run to keep CRUD counters
       * consistent
       */
      dbFilename: `test-crud-${uuid()}.db`,
      schema: testSchema,
      flags: {
        enableMultiTabs: false
      }
    }).getInstance();
  });

  afterEach(async () => {
    await powersync.disconnectAndClear();
    await powersync.close();
  });

  it('INSERT', async () => {
    expect(await powersync.getAll('SELECT * FROM ps_crud')).empty;

    await powersync.execute('INSERT INTO assets(id, description) VALUES(?, ?)', [testId, 'test']);

    expect(await powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).deep.equals([
      {
        data: `{"op":"PUT","type":"assets","id":"${testId}","data":{"description":"test"}}`
      }
    ]);

    const tx = (await powersync.getNextCrudTransaction())!;
    expect(tx.transactionId).equals(1);
    const expectedCrudEntry = new CrudEntry(1, UpdateType.PUT, 'assets', testId, 1, { description: 'test' });
    expect(tx.crud[0].equals(expectedCrudEntry)).true;
  });

  it('BATCH INSERT', async () => {
    expect(await powersync.getAll('SELECT * FROM ps_crud')).empty;

    const query = `INSERT INTO assets(id, description) VALUES(?, ?)`;
    await powersync.executeBatch(query, [
      [testId, 'test'],
      ['mockId', 'test1']
    ]);

    expect(await powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).deep.equals([
      {
        data: `{"op":"PUT","type":"assets","id":"${testId}","data":{"description":"test"}}`
      },
      {
        data: `{"op":"PUT","type":"assets","id":"mockId","data":{"description":"test1"}}`
      }
    ]);

    const crudBatch = (await powersync.getCrudBatch(2))!;
    expect(crudBatch.crud.length).equals(2);
    const expectedCrudEntry = new CrudEntry(1, UpdateType.PUT, 'assets', testId, 1, { description: 'test' });
    const expectedCrudEntry2 = new CrudEntry(2, UpdateType.PUT, 'assets', 'mockId', 1, { description: 'test1' });
    expect(crudBatch.crud[0].equals(expectedCrudEntry)).true;
    expect(crudBatch.crud[1].equals(expectedCrudEntry2)).true;
  });

  it('INSERT OR REPLACE', async () => {
    await powersync.execute('INSERT INTO assets(id, description) VALUES(?, ?)', [testId, 'test']);
    await powersync.execute('DELETE FROM ps_crud WHERE 1');

    // Replace
    await powersync.execute('INSERT OR REPLACE INTO assets(id, description) VALUES(?, ?)', [testId, 'test2']);

    // This generates another PUT
    expect(await powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).deep.equals([
      {
        data: `{"op":"PUT","type":"assets","id":"${testId}","data":{"description":"test2"}}`
      }
    ]);

    expect(await powersync.get('SELECT count(*) AS count FROM assets')).deep.equals({ count: 1 });

    // Make sure uniqueness is enforced
    expect(powersync.execute('INSERT INTO assets(id, description) VALUES(?, ?)', [testId, 'test3'])).rejects.toThrow(
      /UNIQUE constraint failed/
    );
  });

  it('UPDATE', async () => {
    await powersync.execute('INSERT INTO assets(id, description, make) VALUES(?, ?, ?)', [testId, 'test', 'test']);
    await powersync.execute('DELETE FROM ps_crud WHERE 1');

    await powersync.execute('UPDATE assets SET description = ? WHERE id = ?', ['test2', testId]);

    expect(await powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).deep.equals([
      {
        data: `{"op":"PATCH","type":"assets","id":"${testId}","data":{"description":"test2"}}`
      }
    ]);

    const tx = (await powersync.getNextCrudTransaction())!;
    expect(tx.transactionId).equals(2);

    const expectedCrudEntry = new CrudEntry(2, UpdateType.PATCH, 'assets', testId, 2, { description: 'test2' });

    expect(tx.crud[0].equals(expectedCrudEntry)).true;
  });

  it('BATCH UPDATE', async () => {
    await powersync.executeBatch('INSERT INTO assets(id, description, make) VALUES(?, ?, ?)', [
      [testId, 'test', 'test'],
      ['mockId', 'test', 'test']
    ]);
    await powersync.execute('DELETE FROM ps_crud WHERE 1');

    await powersync.executeBatch('UPDATE assets SET description = ?, make = ?', [['test2', 'make2']]);

    expect(await powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).deep.equals([
      {
        data: `{"op":"PATCH","type":"assets","id":"${testId}","data":{"description":"test2","make":"make2"}}`
      },
      {
        data: `{"op":"PATCH","type":"assets","id":"mockId","data":{"description":"test2","make":"make2"}}`
      }
    ]);

    const crudBatch = (await powersync.getCrudBatch(2))!;
    expect(crudBatch.crud.length).equals(2);
    const expectedCrudEntry = new CrudEntry(3, UpdateType.PATCH, 'assets', testId, 2, {
      description: 'test2',
      make: 'make2'
    });
    const expectedCrudEntry2 = new CrudEntry(4, UpdateType.PATCH, 'assets', 'mockId', 2, {
      description: 'test2',
      make: 'make2'
    });
    expect(crudBatch.crud[0].equals(expectedCrudEntry)).true;
    expect(crudBatch.crud[1].equals(expectedCrudEntry2)).true;
  });

  it('DELETE', async () => {
    await powersync.execute('INSERT INTO assets(id, description, make) VALUES(?, ?, ?)', [testId, 'test', 'test']);
    await powersync.execute('DELETE FROM ps_crud WHERE 1');

    await powersync.execute('DELETE FROM assets WHERE id = ?', [testId]);

    expect(await powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).deep.equals([
      { data: `{"op":"DELETE","type":"assets","id":"${testId}"}` }
    ]);

    const tx = (await powersync.getNextCrudTransaction())!;
    expect(tx.transactionId).equals(2);
    const expectedCrudEntry = new CrudEntry(2, UpdateType.DELETE, 'assets', testId, 2);
    expect(tx.crud[0].equals(expectedCrudEntry)).true;
  });

  it('UPSERT not supported', async () => {
    // Just shows that we cannot currently do this
    expect(
      powersync.execute('INSERT INTO assets(id, description) VALUES(?, ?) ON CONFLICT DO UPDATE SET description = ?', [
        testId,
        'test2',
        'test3'
      ])
    ).rejects.toThrowError('cannot UPSERT a view');
  });

  it('INSERT-only tables', async () => {
    await powersync.disconnectAndClear();

    powersync = new WASQLitePowerSyncDatabaseOpenFactory({
      /**
       * Deleting the IndexDB seems to freeze the test.
       * Use a new DB for each run to keep CRUD counters
       * consistent
       */
      dbFilename: 'test.db' + uuid(),
      schema: new Schema([
        new Table({
          name: 'logs',
          insertOnly: true,
          columns: [
            new Column({ name: 'level', type: ColumnType.TEXT }),
            new Column({ name: 'content', type: ColumnType.TEXT })
          ]
        })
      ]),
      flags: {
        enableMultiTabs: false
      }
    }).getInstance();

    expect(await powersync.getAll('SELECT * FROM ps_crud')).empty;

    await powersync.execute('INSERT INTO logs(id, level, content) VALUES(?, ?, ?)', [testId, 'INFO', 'test log']);

    expect(await powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).deep.equals([
      {
        data: `{"op":"PUT","type":"logs","id":"${testId}","data":{"content":"test log","level":"INFO"}}`
      }
    ]);

    expect(await powersync.getAll('SELECT * FROM logs')).empty;

    const tx = (await powersync.getNextCrudTransaction())!;
    expect(tx.transactionId).equals(1);
    const expectedCrudEntry = new CrudEntry(1, UpdateType.PUT, 'logs', testId, 1, {
      content: 'test log',
      level: 'INFO'
    });
    expect(tx.crud[0].equals(expectedCrudEntry)).true;
  });

  it('big numbers - integer', async () => {
    const bigNumber = 1 << 62;
    await powersync.execute('INSERT INTO assets(id, quantity) VALUES(?, ?)', [testId, bigNumber]);

    expect(await powersync.get('SELECT quantity FROM assets WHERE id = ?', [testId])).deep.equals({
      quantity: bigNumber
    });
    expect(await powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).deep.equals([
      {
        data: `{"op":"PUT","type":"assets","id":"${testId}","data":{"quantity":${bigNumber}}}`
      }
    ]);

    const tx = (await powersync.getNextCrudTransaction())!;
    expect(tx.transactionId).equals(1);

    expect(tx.crud[0].equals(new CrudEntry(1, UpdateType.PUT, 'assets', testId, 1, { quantity: bigNumber }))).equals(
      true
    );
  });

  it('big numbers - text', async () => {
    const bigNumber = 1 << 62;
    await powersync.execute('INSERT INTO assets(id, quantity) VALUES(?, ?)', [testId, `${bigNumber}`]);

    // Cast as INTEGER when querying
    expect(await powersync.get('SELECT quantity FROM assets WHERE id = ?', [testId])).deep.equals({
      quantity: bigNumber
    });

    // Not cast as part of crud / persistance
    expect(await powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).deep.equals([
      {
        data: `{"op":"PUT","type":"assets","id":"${testId}","data":{"quantity":"${bigNumber}"}}`
      }
    ]);

    await powersync.execute('DELETE FROM ps_crud WHERE 1');

    await powersync.execute('UPDATE assets SET description = ?, quantity = quantity + 1 WHERE id = ?', [
      'updated',
      testId
    ]);

    expect(await powersync.getAll('SELECT data FROM ps_crud ORDER BY id')).deep.equals([
      {
        data: `{"op":"PATCH","type":"assets","id":"${testId}","data":{"description":"updated","quantity":${bigNumber + 1}}}`
      }
    ]);
  });

  it('Transaction grouping', async () => {
    expect(await powersync.getAll('SELECT * FROM ps_crud')).empty;
    await powersync.writeTransaction(async (tx) => {
      await tx.execute('INSERT INTO assets(id, description) VALUES(?, ?)', [testId, 'test1']);
      await tx.execute('INSERT INTO assets(id, description) VALUES(?, ?)', ['test2', 'test2']);
    });

    await powersync.writeTransaction(async (tx) => {
      await tx.execute('UPDATE assets SET description = ? WHERE id = ?', ['updated', testId]);
    });

    const tx1 = (await powersync.getNextCrudTransaction())!;
    expect(tx1.transactionId).equals(1);
    const expectedCrudEntries = [
      new CrudEntry(1, UpdateType.PUT, 'assets', testId, 1, { description: 'test1' }),
      new CrudEntry(2, UpdateType.PUT, 'assets', 'test2', 1, { description: 'test2' })
    ];

    expect(tx1.crud.map((entry, index) => entry.equals(expectedCrudEntries[index]))).deep.equals([true, true]);
    await tx1.complete();

    const tx2 = (await powersync.getNextCrudTransaction())!;
    expect(tx2.transactionId).equals(2);
    const expectedCrudEntry2 = new CrudEntry(3, UpdateType.PATCH, 'assets', testId, 2, { description: 'updated' });
    expect(tx2.crud[0].equals(expectedCrudEntry2)).true;
    await tx2.complete();
    expect(await powersync.getNextCrudTransaction()).equals(null);
  });
});

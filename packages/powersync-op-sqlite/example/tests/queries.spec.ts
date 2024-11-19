import Chance from 'chance';
import { OPSqliteOpenFactory, OPSQLiteOpenFactoryOptions } from '@powersync/op-sqlite';
import { afterEach, beforeEach, describe, it } from './MochaRNAdapter';
import chai from 'chai';
import { DBAdapter, QueryResult } from '@powersync/common';
const expect = chai.expect;
const chance = new Chance();

const NUM_READ_CONNECTIONS = 3;

let db: DBAdapter;

function generateUserInfo() {
  return {
    id: chance.integer(),
    name: chance.name(),
    age: chance.integer(),
    networth: chance.floating()
  };
}

function createTestUser(context: { execute: (sql: string, args?: any[]) => Promise<QueryResult> } = db) {
  const { id, name, age, networth } = generateUserInfo();
  return context.execute('INSERT INTO User (id, name, age, networth) VALUES(?, ?, ?, ?)', [id, name, age, networth]);
}

export function queriesTests() {
  // const factory = new OPSqliteOpenFactory({
  //   dbFilename: 'sqlite.db'
  // });

  // db = factory.openDB();

  beforeEach(async () => {
    try {
      // if (factory) {
      //   db.close();
      // }

      // global.db = db = open('test', {
      //   numReadConnections: NUM_READ_CONNECTIONS
      // });

      await db.execute('DROP TABLE IF EXISTS User; ');
      await db.execute('CREATE TABLE User ( id INT PRIMARY KEY, name TEXT NOT NULL, age INT, networth REAL) STRICT;');

      await db.execute('CREATE TABLE IF NOT EXISTS t1(id INTEGER PRIMARY KEY, a INTEGER, b INTEGER, c TEXT)');
    } catch (e) {
      console.warn('error on before each', e);
    }
  });

  describe('Raw queries', () => {
    it('Insert', async () => {
      const res = await createTestUser();
      expect(res.rowsAffected).to.equal(1);
      expect(res.insertId).to.equal(1);
      // expect(res.metadata).to.eql([]);
      expect(res.rows?._array).to.eql([]);
      expect(res.rows?.length).to.equal(0);
      expect(res.rows?.item).to.be.a('function');
    });
  });

  // let db: DB;

  // describe('Queries tests', () => {
  //   beforeEach(async () => {
  //     db = open({
  //       name: 'queries.sqlite',
  //       encryptionKey: 'test',
  //     });

  //     await db.execute('DROP TABLE IF EXISTS User;');
  //     await db.execute('DROP TABLE IF EXISTS T1;');
  //     await db.execute('DROP TABLE IF EXISTS T2;');
  //     await db.execute(
  //       'CREATE TABLE User (id INT PRIMARY KEY, name TEXT NOT NULL, age INT, networth REAL, nickname TEXT) STRICT;',
  //     );
  //   });

  //   afterEach(() => {
  //     if (db) {
  //       db.close();
  //       db.delete();
  //       // @ts-ignore
  //       db = null;
  //     }
  //   });
  //   // if (isLibsql()) {
  //   //   it('Remote open a turso database', async () => {
  //   //     const remoteDb = openRemote({
  //   //       url: 'libsql://foo-ospfranco.turso.io',
  //   //       authToken:
  //   //         'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3MTY5NTc5OTUsImlkIjoiZmJkNzZmMjYtZTliYy00MGJiLTlmYmYtMDczZjFmMjdjOGY4In0.U3cAWBOvcdiqoPN3MB81sco7x8CGOjjtZ1ZEf30uo2iPcAmOuJzcnAznmDlZ6SpQd4qzuJxE4mAIoRlOkpzgBQ',
  //   //     });

  //   //     const res = await remoteDb.execute('SELECT 1');

  //   //     expect(res.rowsAffected).to.equal(0);
  //   //   });

  //   //   it('Open a libsql database replicated to turso', async () => {
  //   //     const remoteDb = openSync({
  //   //       url: 'libsql://foo-ospfranco.turso.io',
  //   //       authToken:
  //   //         'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3MTY5NTc5OTUsImlkIjoiZmJkNzZmMjYtZTliYy00MGJiLTlmYmYtMDczZjFmMjdjOGY4In0.U3cAWBOvcdiqoPN3MB81sco7x8CGOjjtZ1ZEf30uo2iPcAmOuJzcnAznmDlZ6SpQd4qzuJxE4mAIoRlOkpzgBQ',
  //   //       name: 'my replica',
  //   //       syncInterval: 1000,
  //   //     });

  //   //     const res = await remoteDb.execute('SELECT 1');

  //   //     remoteDb.sync();

  //   //     expect(res.rowsAffected).to.equal(0);
  //   //   });
  //   // }

  //   it('Insert', async () => {
  //     const id = chance.integer();
  //     const name = chance.name();
  //     const age = chance.integer();
  //     const networth = chance.floating();
  //     const res = await db.execute(
  //       'INSERT INTO "User" (id, name, age, networth) VALUES(?, ?, ?, ?)',
  //       [id, name, age, networth],
  //     );

  //     expect(res.rowsAffected).to.equal(1);
  //     expect(res.insertId).to.equal(1);
  //     // expect(res.metadata).to.eql([]);
  //     expect(res.rows).to.eql([]);
  //     expect(res.rows?.length).to.equal(0);
  //   });

  //   it('Casts booleans to ints correctly', async () => {
  //     await db.execute(`SELECT ?`, [1]);
  //     await db.execute(`SELECT ?`, [true]);
  //   });

  //   it('Insert and query with host objects', async () => {
  //     const id = chance.integer();
  //     const name = chance.name();
  //     const age = chance.integer();
  //     const networth = chance.floating();
  //     const res = await db.executeWithHostObjects(
  //       'INSERT INTO "User" (id, name, age, networth) VALUES(?, ?, ?, ?)',
  //       [id, name, age, networth],
  //     );

  //     expect(res.rowsAffected).to.equal(1);
  //     expect(res.insertId).to.equal(1);
  //     // expect(res.metadata).to.eql([]);
  //     expect(res.rows).to.eql([]);
  //     expect(res.rows?.length).to.equal(0);

  //     const queryRes = await db.executeWithHostObjects('SELECT * FROM User');

  //     expect(queryRes.rowsAffected).to.equal(1);
  //     expect(queryRes.insertId).to.equal(1);
  //     expect(queryRes.rows).to.eql([
  //       {
  //         id,
  //         name,
  //         age,
  //         networth,
  //         nickname: null,
  //       },
  //     ]);
  //   });

  //   it('Query without params', async () => {
  //     const id = chance.integer();
  //     const name = chance.name();
  //     const age = chance.integer();
  //     const networth = chance.floating();
  //     await db.execute(
  //       'INSERT INTO User (id, name, age, networth) VALUES(?, ?, ?, ?)',
  //       [id, name, age, networth],
  //     );

  //     const res = await db.execute('SELECT * FROM User');

  //     expect(res.rowsAffected).to.equal(1);
  //     expect(res.insertId).to.equal(1);
  //     expect(res.rows).to.eql([
  //       {
  //         id,
  //         name,
  //         age,
  //         networth,
  //         nickname: null,
  //       },
  //     ]);
  //   });

  //   it('Query with params', async () => {
  //     const id = chance.integer();
  //     const name = chance.name();
  //     const age = chance.integer();
  //     const networth = chance.floating();
  //     await db.execute(
  //       'INSERT INTO User (id, name, age, networth) VALUES(?, ?, ?, ?)',
  //       [id, name, age, networth],
  //     );

  //     const res = await db.execute('SELECT * FROM User WHERE id = ?', [id]);

  //     expect(res.rowsAffected).to.equal(1);
  //     expect(res.insertId).to.equal(1);
  //     expect(res.rows).to.eql([
  //       {
  //         id,
  //         name,
  //         age,
  //         networth,
  //         nickname: null,
  //       },
  //     ]);
  //   });

  //   it('Query with sqlite functions', async () => {
  //     const id = chance.integer();
  //     const name = chance.name();
  //     const age = chance.integer();
  //     const networth = chance.floating();

  //     // COUNT(*)
  //     await db.execute(
  //       'INSERT INTO User (id, name, age, networth) VALUES(?, ?, ?, ?)',
  //       [id, name, age, networth],
  //     );

  //     const countRes = await db.execute('SELECT COUNT(*) as count FROM User');

  //     // console.log(countRes);

  //     // expect(countRes.metadata?.[0]?.type).to.equal('UNKNOWN');
  //     expect(countRes.rows?.length).to.equal(1);
  //     expect(countRes.rows?.[0]?.count).to.equal(1);

  //     // SUM(age)
  //     const id2 = chance.integer();
  //     const name2 = chance.name();
  //     const age2 = chance.integer();
  //     const networth2 = chance.floating();

  //     await db.execute(
  //       'INSERT INTO User (id, name, age, networth) VALUES(?, ?, ?, ?)',
  //       [id2, name2, age2, networth2],
  //     );

  //     const sumRes = await db.execute('SELECT SUM(age) as sum FROM User;');

  //     // expect(sumRes.metadata?.[0]?.type).to.equal('UNKNOWN');
  //     expect(sumRes.rows[0]!.sum).to.equal(age + age2);

  //     // MAX(networth), MIN(networth)
  //     const maxRes = await db.execute(
  //       'SELECT MAX(networth) as `max` FROM User;',
  //     );
  //     const minRes = await db.execute(
  //       'SELECT MIN(networth) as `min` FROM User;',
  //     );
  //     // expect(maxRes.metadata?.[0]?.type).to.equal('UNKNOWN');
  //     // expect(minRes.metadata?.[0]?.type).to.equal('UNKNOWN');
  //     const maxNetworth = Math.max(networth, networth2);
  //     const minNetworth = Math.min(networth, networth2);

  //     expect(maxRes.rows[0]!.max).to.equal(maxNetworth);
  //     expect(minRes.rows[0]!.min).to.equal(minNetworth);
  //   });

  //   it('Executes all the statements in a single string', async () => {
  //     if (isLibsql()) {
  //       return;
  //     }
  //     await db.execute(
  //       `CREATE TABLE T1 ( id INT PRIMARY KEY) STRICT;
  //       CREATE TABLE T2 ( id INT PRIMARY KEY) STRICT;`,
  //     );

  //     let t1name = await db.execute(
  //       "SELECT name FROM sqlite_master WHERE type='table' AND name='T1';",
  //     );

  //     expect(t1name.rows[0]!.name).to.equal('T1');

  //     let t2name = await db.execute(
  //       "SELECT name FROM sqlite_master WHERE type='table' AND name='T2';",
  //     );

  //     expect(t2name.rows[0]!.name).to.equal('T2');
  //   });

  //   it('Failed insert', async () => {
  //     const id = chance.string();
  //     const name = chance.name();
  //     const age = chance.string();
  //     const networth = chance.string();
  //     try {
  //       await db.execute(
  //         'INSERT INTO User (id, name, age, networth) VALUES(?, ?, ?, ?)',
  //         [id, name, age, networth],
  //       );
  //     } catch (e: any) {
  //       expect(typeof e).to.equal('object');

  //       expect(e.message).to.include(
  //         `cannot store TEXT value in INT column User.id`,
  //       );
  //     }
  //   });

  //   it('Transaction, auto commit', async () => {
  //     const id = chance.integer();
  //     const name = chance.name();
  //     const age = chance.integer();
  //     const networth = chance.floating();

  //     await db.transaction(async tx => {
  //       const res = await tx.execute(
  //         'INSERT INTO "User" (id, name, age, networth) VALUES(?, ?, ?, ?)',
  //         [id, name, age, networth],
  //       );

  //       expect(res.rowsAffected).to.equal(1);
  //       expect(res.insertId).to.equal(1);
  //       // expect(res.metadata).to.eql([]);
  //       expect(res.rows).to.eql([]);
  //       expect(res.rows?.length).to.equal(0);
  //     });

  //     const res = await db.execute('SELECT * FROM User');
  //     expect(res.rows).to.eql([
  //       {
  //         id,
  //         name,
  //         age,
  //         networth,
  //         nickname: null,
  //       },
  //     ]);
  //   });

  //   it('Transaction, manual commit', async () => {
  //     const id = chance.integer();
  //     const name = chance.name();
  //     const age = chance.integer();
  //     const networth = chance.floating();

  //     await db.transaction(async tx => {
  //       const res = await tx.execute(
  //         'INSERT INTO "User" (id, name, age, networth) VALUES(?, ?, ?, ?)',
  //         [id, name, age, networth],
  //       );

  //       expect(res.rowsAffected).to.equal(1);
  //       expect(res.insertId).to.equal(1);
  //       expect(res.rows).to.eql([]);
  //       expect(res.rows?.length).to.equal(0);

  //       await tx.commit();
  //     });

  //     const res = await db.execute('SELECT * FROM User');
  //     // console.log(res);
  //     expect(res.rows).to.eql([
  //       {
  //         id,
  //         name,
  //         age,
  //         networth,
  //         nickname: null,
  //       },
  //     ]);
  //   });

  //   it('Transaction, executed in order', async () => {
  //     const xs = 10;
  //     const actual: unknown[] = [];

  //     // ARRANGE: Generate expected data
  //     const id = chance.integer();
  //     const name = chance.name();
  //     const age = chance.integer();

  //     // ACT: Start multiple transactions to upsert and select the same record
  //     const promises = [];
  //     for (let i = 1; i <= xs; i++) {
  //       const promised = db.transaction(async tx => {
  //         // ACT: Upsert statement to create record / increment the value
  //         await tx.execute(
  //           `
  //             INSERT OR REPLACE INTO [User] ([id], [name], [age], [networth])
  //             SELECT ?, ?, ?,
  //               IFNULL((
  //                 SELECT [networth] + 1000
  //                 FROM [User]
  //                 WHERE [id] = ?
  //               ), 0)
  //         `,
  //           [id, name, age, id],
  //         );

  //         // ACT: Select statement to get incremented value and store it for checking later
  //         const results = await tx.execute(
  //           'SELECT [networth] FROM [User] WHERE [id] = ?',
  //           [id],
  //         );

  //         actual.push(results.rows[0]!.networth);
  //       });

  //       promises.push(promised);
  //     }

  //     // ACT: Wait for all transactions to complete
  //     await Promise.all(promises);

  //     // ASSERT: That the expected values where returned
  //     const expected = Array(xs)
  //       .fill(0)
  //       .map((_, index) => index * 1000);

  //     expect(actual).to.eql(
  //       expected,
  //       'Each transaction should read a different value',
  //     );
  //   });

  //   it('Transaction, cannot execute after commit', async () => {
  //     const id = chance.integer();
  //     const name = chance.name();
  //     const age = chance.integer();
  //     const networth = chance.floating();

  //     await db.transaction(async tx => {
  //       const res = await tx.execute(
  //         'INSERT INTO "User" (id, name, age, networth) VALUES(?, ?, ?, ?)',
  //         [id, name, age, networth],
  //       );

  //       expect(res.rowsAffected).to.equal(1);
  //       expect(res.insertId).to.equal(1);
  //       // expect(res.metadata).to.eql([]);
  //       expect(res.rows).to.eql([]);
  //       expect(res.rows.length).to.equal(0);

  //       await tx.commit();

  //       try {
  //         await tx.execute('SELECT * FROM "User"');
  //       } catch (e) {
  //         expect(!!e).to.equal(true);
  //       }
  //     });

  //     const res = await db.execute('SELECT * FROM User');
  //     expect(res.rows).to.eql([
  //       {
  //         id,
  //         name,
  //         age,
  //         networth,
  //         nickname: null,
  //       },
  //     ]);
  //   });

  //   it('Incorrect transaction, manual rollback', async () => {
  //     const id = chance.string();
  //     const name = chance.name();
  //     const age = chance.integer();
  //     const networth = chance.floating();

  //     await db.transaction(async tx => {
  //       try {
  //         await tx.execute(
  //           'INSERT INTO "User" (id, name, age, networth) VALUES(?, ?, ?, ?)',
  //           [id, name, age, networth],
  //         );
  //       } catch (e) {
  //         await tx.rollback();
  //       }
  //     });

  //     const res = await db.execute('SELECT * FROM User');
  //     expect(res.rows).to.eql([]);
  //   });

  //   it('Correctly throws', async () => {
  //     const id = chance.string();
  //     const name = chance.name();
  //     const age = chance.integer();
  //     const networth = chance.floating();
  //     try {
  //       await db.execute(
  //         'INSERT INTO "User" (id, name, age, networth) VALUES(?, ?, ?, ?)',
  //         [id, name, age, networth],
  //       );
  //     } catch (e: any) {
  //       expect(!!e).to.equal(true);
  //     }
  //   });

  //   it('Rollback', async () => {
  //     const id = chance.integer();
  //     const name = chance.name();
  //     const age = chance.integer();
  //     const networth = chance.floating();

  //     await db.transaction(async tx => {
  //       await tx.execute(
  //         'INSERT INTO "User" (id, name, age, networth) VALUES(?, ?, ?, ?)',
  //         [id, name, age, networth],
  //       );
  //       await tx.rollback();
  //       const res = await db.execute('SELECT * FROM User');
  //       expect(res.rows).to.eql([]);
  //     });
  //   });

  //   it('Transaction, rejects on callback error', async () => {
  //     const promised = db.transaction(() => {
  //       throw new Error('Error from callback');
  //     });

  //     // ASSERT: should return a promise that eventually rejects
  //     expect(promised).to.have.property('then').that.is.a('function');
  //     try {
  //       await promised;
  //       expect.fail('Should not resolve');
  //     } catch (e) {
  //       expect(e).to.be.a.instanceof(Error);
  //       expect((e as Error)?.message).to.equal('Error from callback');
  //     }
  //   });

  //   it('Transaction, rejects on invalid query', async () => {
  //     const promised = db.transaction(async tx => {
  //       await tx.execute('SELECT * FROM [tableThatDoesNotExist];');
  //     });

  //     // ASSERT: should return a promise that eventually rejects
  //     expect(promised).to.have.property('then').that.is.a('function');
  //     try {
  //       await promised;
  //       expect.fail('Should not resolve');
  //     } catch (e) {
  //       expect(e).to.be.a.instanceof(Error);
  //       expect((e as Error)?.message).to.include(
  //         'no such table: tableThatDoesNotExist',
  //       );
  //     }
  //   });

  //   it('Transaction, handle async callback', async () => {
  //     let ranCallback = false;
  //     const promised = db.transaction(async tx => {
  //       await new Promise<void>(done => {
  //         setTimeout(() => done(), 50);
  //       });
  //       tx.execute('SELECT * FROM User;');
  //       ranCallback = true;
  //     });

  //     // ASSERT: should return a promise that eventually rejects
  //     expect(promised).to.have.property('then').that.is.a('function');
  //     await promised;
  //     expect(ranCallback).to.equal(true, 'Should handle async callback');
  //   });

  //   it('Batch execute', async () => {
  //     const id1 = chance.integer();
  //     const name1 = chance.name();
  //     const age1 = chance.integer();
  //     const networth1 = chance.floating();

  //     const id2 = chance.integer();
  //     const name2 = chance.name();
  //     const age2 = chance.integer();
  //     const networth2 = chance.floating();

  //     const commands: SQLBatchTuple[] = [
  //       [
  //         'INSERT INTO "User" (id, name, age, networth) VALUES(?, ?, ?, ?)',
  //         [id1, name1, age1, networth1],
  //       ],
  //       [
  //         'INSERT INTO "User" (id, name, age, networth) VALUES(?, ?, ?, ?)',
  //         [id2, name2, age2, networth2],
  //       ],
  //     ];

  //     await db.executeBatch(commands);

  //     const res = await db.execute('SELECT * FROM User');
  //     // console.log(res);
  //     expect(res.rows).to.eql([
  //       {id: id1, name: name1, age: age1, networth: networth1, nickname: null},
  //       {
  //         id: id2,
  //         name: name2,
  //         age: age2,
  //         networth: networth2,
  //         nickname: null,
  //       },
  //     ]);
  //   });

  //   it('DumbHostObject allows to write known props', async () => {
  //     const id = chance.integer();
  //     const name = chance.name();
  //     const age = chance.integer();
  //     const networth = chance.floating();
  //     await db.execute(
  //       'INSERT INTO User (id, name, age, networth) VALUES(?, ?, ?, ?)',
  //       [id, name, age, networth],
  //     );

  //     const res = await db.executeWithHostObjects('SELECT * FROM User');

  //     expect(res.insertId).to.equal(1);
  //     expect(res.rows).to.eql([
  //       {
  //         id,
  //         name,
  //         age,
  //         networth,
  //         nickname: null,
  //       },
  //     ]);

  //     res.rows[0]!.name = 'quack_changed';

  //     expect(res.rows[0]!.name).to.eq('quack_changed');
  //   });

  //   it('DumbHostObject allows to write new props', async () => {
  //     const id = chance.integer();
  //     const name = chance.name();
  //     const age = chance.integer();
  //     const networth = chance.floating();
  //     await db.execute(
  //       'INSERT INTO User (id, name, age, networth) VALUES(?, ?, ?, ?)',
  //       [id, name, age, networth],
  //     );

  //     const res = await db.executeWithHostObjects('SELECT * FROM User');

  //     expect(res.rowsAffected).to.equal(1);
  //     expect(res.insertId).to.equal(1);
  //     expect(res.rows!).to.eql([
  //       {
  //         id,
  //         name,
  //         age,
  //         networth,
  //         nickname: null,
  //       },
  //     ]);

  //     res.rows[0]!.myWeirdProp = 'quack_changed';

  //     expect(res.rows[0]!.myWeirdProp).to.eq('quack_changed');
  //   });

  //   it('Execute raw should return just an array of objects', async () => {
  //     const id = chance.integer();
  //     const name = chance.name();
  //     const age = chance.integer();
  //     const networth = chance.floating();
  //     await db.execute(
  //       'INSERT INTO User (id, name, age, networth) VALUES(?, ?, ?, ?)',
  //       [id, name, age, networth],
  //     );

  //     const res = await db.executeRaw(
  //       'SELECT id, name, age, networth FROM User',
  //     );
  //     expect(res).to.eql([[id, name, age, networth]]);
  //   });

  //   it('Create fts5 virtual table', async () => {
  //     await db.execute(
  //       'CREATE VIRTUAL TABLE fts5_table USING fts5(name, content);',
  //     );
  //     await db.execute('INSERT INTO fts5_table (name, content) VALUES(?, ?)', [
  //       'test',
  //       'test content',
  //     ]);

  //     const res = await db.execute('SELECT * FROM fts5_table');
  //     expect(res.rows).to.eql([{name: 'test', content: 'test content'}]);
  //   });

  //   it('Various queries', async () => {
  //     await db.execute('SELECT 1 ');
  //     await db.execute('SELECT 1       ');
  //     await db.execute('SELECT 1; ', []);
  //     await db.execute('SELECT ?; ', [1]);
  //   });
  // });
}

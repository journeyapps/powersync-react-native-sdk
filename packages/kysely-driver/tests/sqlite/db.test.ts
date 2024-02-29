import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as SUT from '../../src/sqlite/db';
import { Kysely } from 'kysely';
import { getPowerSyncDb } from '../setup/db';
import { AbstractPowerSyncDatabase } from '@journeyapps/powersync-sdk-common';
import { Database } from '../setup/types';

describe('CRUD operations', () => {
  let powerSyncDb: AbstractPowerSyncDatabase;
  let db: Kysely<Database>;

  beforeEach(() => {
    powerSyncDb = getPowerSyncDb();
    db = SUT.wrapPowerSyncWithKysely<Database>(powerSyncDb);
  });

  afterEach(async () => {
    await db.destroy();
  });

  it('should insert a user and select that user', async () => {
    await db.insertInto('users').values({ id: '1', name: 'John' }).execute();
    const result = await db.selectFrom('users').selectAll().execute();

    expect(result.length).toEqual(1);
  });

  it('should insert a user and delete that user', async () => {
    await db.insertInto('users').values({ id: '2', name: 'Ben' }).execute();
    await db.deleteFrom('users').where('name', '=', 'Ben').execute();
    const result = await db.selectFrom('users').selectAll().execute();

    expect(result.length).toEqual(0);
  });

  it('should insert a user and update that user', async () => {
    await db.insertInto('users').values({ id: '3', name: 'Lucy' }).execute();
    await db.updateTable('users').where('name', '=', 'Lucy').set('name', 'Lucy Smith').execute();
    const result = await db.selectFrom('users').select('name').executeTakeFirstOrThrow();

    expect(result.name).toEqual('Lucy Smith');
  });

  it('should insert a user and update that user within a transaction', async () => {
    await db.transaction().execute(async (transaction) => {
      await transaction.insertInto('users').values({ id: '4', name: 'James' }).execute();
      await transaction.updateTable('users').where('name', '=', 'James').set('name', 'James Smith').execute();
    });
    const result = await db.selectFrom('users').select('name').executeTakeFirstOrThrow();

    expect(result.name).toEqual('James Smith');
  });
});

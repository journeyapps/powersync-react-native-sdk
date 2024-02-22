<!-- Testing PowerSync in the crudest of ways -->
<script setup lang="ts">
import {
  AbstractPowerSyncDatabase,
  Column,
  ColumnType,
  type PowerSyncBackendConnector,
  Schema,
  Table,
  WASQLitePowerSyncDatabaseOpenFactory
} from '@journeyapps/powersync-sdk-web';
import { v4 as uuid } from 'uuid';

/**
 * A placeholder connector which doesn't do anything.
 * This is just used to verify that the sync workers can be loaded
 * when connecting.
 */
class DummyConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    return {
      endpoint: '',
      token: ''
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase) {}
}

const ps = new WASQLitePowerSyncDatabaseOpenFactory({
  dbFilename: 'test.db',
  flags: {
    // Vue uses SSR by default
    disableSSRWarning: true,
    enableMultiTabs: true
  },
  schema: new Schema([
    new Table({
      name: 'test',
      columns: [
        new Column({
          name: 'name',
          type: ColumnType.TEXT
        })
      ]
    })
  ])
}).getInstance();

async function test() {
  // Hack, only run this once
  if (!window || (window && (window as any).ps_initialised)) {
    return;
  }

  // create an item
  await ps.execute('INSERT INTO test (id, name) VALUES (?, ?)', [uuid(), 'Steven']);

  const results = await ps.getAll('SELECT * from test');
  console.log(`Testing this ${JSON.stringify(results)}`);

  // Try and connect, this will setup shared sync workers
  // This will fail due to not having a valid endpoint,
  // but it will try - which is all that matters.
  await ps.connect(new DummyConnector());

  (window as any).ps_initialised = true;
}

test();
</script>

<template>
  <div>
    <div>See console for results</div>
    <NuxtWelcome />
  </div>
</template>

import { PowerSyncDialect } from './sqlite-dialect';
import { Kysely, type KyselyConfig } from 'kysely';
import { type AbstractPowerSyncDatabase } from '@powersync/common';

export const wrapPowerSyncWithKysely = <T>(db: AbstractPowerSyncDatabase, options?: KyselyConfig) => {
  return new Kysely<T>({
    dialect: new PowerSyncDialect({
      db
    }),
    ...options
  });
};

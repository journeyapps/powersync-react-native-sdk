import { PowerSyncContext } from '@powersync/react';
import { WASQLitePowerSyncDatabaseOpenFactory } from '@powersync/web';
import { CircularProgress } from '@mui/material';
import Logger from 'js-logger';
import React, { Suspense } from 'react';
import { AppSchema } from '../../library/powersync/AppSchema.js';
import { BackendConnector } from '../../library/powersync/BackendConnector.js';

Logger.useDefaults();
Logger.setLevel(Logger.DEBUG);

const powerSync = new WASQLitePowerSyncDatabaseOpenFactory({
  dbFilename: 'powersync2.db',
  schema: AppSchema,
  flags: {
    enableMultiTabs: false
  }
}).getInstance();
const connector = new BackendConnector();

powerSync.connect(connector);

export const SystemProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<CircularProgress />}>
      <PowerSyncContext.Provider value={powerSync}>{children}</PowerSyncContext.Provider>
    </Suspense>
  );
};

export default SystemProvider;

import { AbstractPowerSyncDatabase, PowerSyncBackendConnector } from '@powersync/web';
import { connect } from './ConnectionManager';

export interface Credentials {
  token: string;
  endpoint: string;
}

export class TokenConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const value = localStorage.getItem('powersync_credentials');
    if (value == null) {
      return null;
    }
    return JSON.parse(value);
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    // Discard any data
    const tx = await database.getNextCrudTransaction();
    await tx?.complete();
  }

  async signIn(credentials: Credentials) {
    try {
      localStorage.setItem('powersync_credentials', JSON.stringify(credentials));
      await connect();
    } catch (e) {
      this.clearCredentials();
      throw e;
    }
  }

  hasCredentials() {
    return localStorage.getItem('powersync_credentials') != null;
  }

  clearCredentials() {
    localStorage.removeItem('powersync_credentials');
  }
}

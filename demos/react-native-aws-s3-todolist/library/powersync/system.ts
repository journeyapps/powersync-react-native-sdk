import '@azure/core-asynciterator-polyfill';

import { PowerSyncDatabase } from '@powersync/react-native';
import React from 'react';
import S3 from 'aws-sdk/clients/s3';
import { type AttachmentRecord } from '@powersync/attachments';
import Logger from 'js-logger';
import { KVStorage } from '../storage/KVStorage';
import { SupabaseConnector } from '../supabase/SupabaseConnector';
import { AppSchema } from './AppSchema';
import { PhotoAttachmentQueue } from './PhotoAttachmentQueue';
import S3StorageAdapter from '../storage/S3StorageAdapter';
import { AWSConfig } from '../storage/AWSConfig';

Logger.useDefaults();

export class System {
  kvStorage: KVStorage;
  storage: S3StorageAdapter;
  supabaseConnector: SupabaseConnector;
  powersync: PowerSyncDatabase;
  attachmentQueue: PhotoAttachmentQueue | undefined = undefined;

  constructor() {
    this.kvStorage = new KVStorage();
    this.supabaseConnector = new SupabaseConnector(this);
    const s3Client = new S3({
      region: AWSConfig.region,
      credentials: {
        accessKeyId: AWSConfig.accessKeyId,
        secretAccessKey: AWSConfig.secretAccessKey
      }
    });
    this.storage = new S3StorageAdapter({ client: s3Client });
    this.powersync = new PowerSyncDatabase({
      schema: AppSchema,
      database: {
        dbFilename: 'sqlite.db'
      }
    });
    /**
     * The snippet below uses OP-SQLite as the default database adapter.
     * You will have to uninstall `@journeyapps/react-native-quick-sqlite` and
     * install both `@powersync/op-sqlite` and `@op-engineering/op-sqlite` to use this.
     *
     * import { OPSqliteOpenFactory } from '@powersync/op-sqlite'; // Add this import
     *
     * const factory = new OPSqliteOpenFactory({
     * dbFilename: 'sqlite.db'
     * });
     * this.powersync = new PowerSyncDatabase({ database: factory, schema: AppSchema });
     */

    if (AWSConfig.bucketName) {
      this.attachmentQueue = new PhotoAttachmentQueue({
        powersync: this.powersync,
        storage: this.storage,
        // Use this to handle download errors where you can use the attachment
        // and/or the exception to decide if you want to retry the download
        onDownloadError: async (attachment: AttachmentRecord, exception: any) => {
          if (exception.toString() === 'StorageApiError: Object not found') {
            return { retry: false };
          }

          return { retry: true };
        }
      });
    }
  }

  async init() {
    await this.powersync.init();
    await this.powersync.connect(this.supabaseConnector);

    if (this.attachmentQueue) {
      await this.attachmentQueue.init();
    }
  }
}

export const system = new System();

export const SystemContext = React.createContext(system);
export const useSystem = () => React.useContext(SystemContext);
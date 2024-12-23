import { BaseObserver } from "@powersync/web";
import { createClient } from "@supabase/supabase-js";

import Logger from "js-logger";
Logger.useDefaults();

const logger = Logger.get("src/supabase");

const FATAL_RESPONSE_CODES = [
   // Postgres errors
   /^22\d{3}$/, // Data exception
   /^23\d{3}$/, // Integrity constraint violation
   /^42\d{3}$/, // Syntax error or access rule violation
   // Supabase errors
   /^PGRST\d{3}$/, // PostgREST errors
];

export class SupabaseConnector extends BaseObserver {
   constructor(config) {
      super();
      logger.info("SupabaseConnector constructor");
      this.config = config;
      this.client = createClient(
         import.meta.env.VITE_SUPABASE_URL,
         import.meta.env.VITE_SUPABASE_ANON_KEY,
         {
            auth: {
               persistSession: true,
            },
         }
      );
      this.currentSession = null;
      this.ready = false;
   }

   async init() {
      if (this.ready) {
         return;
      }
      // Ensures that we don't accidentally check/create multiple anon sessions during initialization
      // const release = await SupabaseConnector.SHARED_MUTEX.acquire();

      let sessionResponse = await this.client.auth.getSession();
      if (sessionResponse.error) {
         logger.error(sessionResponse.error);
         throw sessionResponse.error;
      } else if (!sessionResponse.data.session) {
         logger.info("No session found, logging in anonymously");
         const anonUser = await this.client.auth.signInAnonymously();
         if (anonUser.error) {
            throw anonUser.error;
         }
         sessionResponse = await this.client.auth.getSession();
      }

      this.updateSession(sessionResponse.data.session);

      this.ready = true;
      this.iterateListeners(cb => cb.initialized?.());

      // release();
   }

   async fetchCredentials() {
      logger.info("fetching credentials");
      const {
         data: { session },
         error,
      } = await this.client.auth.getSession();

      if (!session || error) {
         throw new Error(`Could not fetch Supabase credentials: ${error}`);
      }

      logger.info("session expires at", session.expires_at);

      this.updateSession(session);
      const credentials = {
         endpoint: import.meta.env.VITE_POWERSYNC_URL,
         token: session.access_token ?? "",
         expiresAt: session.expires_at
            ? new Date(session.expires_at * 1000)
            : undefined,
      };
      logger.info("credentials", credentials);
      return credentials;
   }

   async uploadData(database) {
      logger.info("uploading data");
      const transaction = await database.getNextCrudTransaction();

      if (!transaction) {
         return;
      }

      let lastOp = null;
      try {
         // Note: If transactional consistency is important, use database functions
         // or edge functions to process the entire transaction in a single call.
         for (const op of transaction.crud) {
            lastOp = op;
            const table = this.client.from(op.table);
            let result;
            switch (op.op) {
               case "PUT":
                  const record = { ...op.opData, id: op.id };
                  result = await table.upsert(record);
                  break;
               case "PATCH":
                  result = await table.update(op.opData).eq("id", op.id);
                  break;
               case "DELETE":
                  result = await table.delete().eq("id", op.id);
                  break;
            }

            if (result.error) {
               logger.error(result.error);
               throw new Error(
                  `Could not update Supabase. Received error: ${result.error.message}`
               );
            }
         }

         await transaction.complete();
      } catch (ex) {
         logger.debug(ex);
         if (
            typeof ex.code == "string" &&
            FATAL_RESPONSE_CODES.some(regex => regex.test(ex.code))
         ) {
            /**
             * Instead of blocking the queue with these errors,
             * discard the (rest of the) transaction.
             *
             * Note that these errors typically indicate a bug in the application.
             * If protecting against data loss is important, save the failing records
             * elsewhere instead of discarding, and/or notify the user.
             */
            logger.info(`Data upload error - discarding ${lastOp}`, ex);
            await transaction.complete();
         } else {
            // Error may be retryable - e.g. network error or temporary server error.
            // Throwing an error here causes this call to be retried after a delay.
            throw ex;
         }
      }
   }

   async loginAnon() {
      const {
         data: { session },
         error,
      } = await this.client.auth.signInAnonymously();

      if (error) {
         throw error;
      }

      this.updateSession(session);
   }

   async logout() {
      await this.client.auth.signOut();
   }

   updateSession(session) {
      logger.info("updateSession", session);
      this.currentSession = session;
      if (!session) {
         return;
      }
      this.iterateListeners(cb => cb.sessionStarted?.(session));
   }
}

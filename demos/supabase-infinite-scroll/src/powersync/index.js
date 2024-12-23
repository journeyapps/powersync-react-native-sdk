import { PowerSyncDatabase } from "@powersync/web";
import { SupabaseConnector } from "@/supabase";
import { schema } from "./schema";

import Logger from "js-logger";
Logger.useDefaults();
Logger.setLevel(Logger.DEBUG);

const logger = Logger.get("src/powersync");
const internalLogger = Logger.get("internal");
export let PowerSync;

internalLogger.setLevel(Logger.DEBUG);

export let Supabase;

async function initSupabase() {
   Supabase = new SupabaseConnector({
      powersyncUrl: import.meta.env.VITE_POWERSYNC_URL,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
   });
   await Supabase.init();
}

const create = async () => {
   logger.info("creating Supabase");
   await initSupabase();
   logger.info("Creating PowerSyncDatabase");
   PowerSync = new PowerSyncDatabase({
      schema,
      database: {
         dbFilename: import.meta.env.VITE_SQL_DB_FILENAME,
      },
      // logger,
      useWebWorker: false,
   });
   window.$powerSync = PowerSync;

   logger.info("PowerSyncDatabase Created", PowerSync);
};

export const reconnect = async current_page => {
   let dispose;

   logger.info("reconnecting to supabase ...", current_page);

   await PowerSync.disconnect();

   return new Promise(async resolve => {
      try {
         let lastSyncedTime =
            PowerSync.currentStatus?.lastSyncedAt?.getTime() || 0;

         const dispose = PowerSync.registerListener({
            statusChanged: async status => {
               console.log("status", status);
               const currentSyncTime = status.lastSyncedAt?.getTime() || 0;
               logger.info("currentSyncTime", currentSyncTime);
               logger.info("lastSyncedTime", lastSyncedTime);
               logger.info("diff", currentSyncTime - lastSyncedTime);
               if (
                  (!lastSyncedTime && currentSyncTime) ||
                  currentSyncTime - lastSyncedTime > 0
               ) {
                  dispose();
                  logger.debug("Sync completed successfully");
                  resolve(true);
               }
            },
         });

         await PowerSync.connect(Supabase, { params: { current_page } });
      } catch (error) {
         logger.error("Error reconnecting to supabase", error);
         resolve(false);
         dispose();
      }
   });
};

export const connect = async () => {
   try {
      logger.info("setting Supabase as PowerSync backend connector");
      await PowerSync.connect(Supabase);
      logger.info("connected to supabase, waitForReady");
      await PowerSync.waitForReady();
      logger.info("wait for first sync");
      return PowerSync.waitForFirstSync().then(() => {
         logger.info("First sync done");
         logger.info("connected to supabase");
         logger.info("connected to powersync");
      });
   } catch (error) {
      logger.error("Error connecting to supabase", error);
   }
};

export const loginAnon = async () => {
   await Supabase.loginAnon();
};

export const openDatabase = async config => {
   try {
      await create();
      await connect();
      return true;
   } catch (error) {
      logger.error("Error opening database", error);
      return false;
   }
};

export function watchList(onResult) {
   PowerSync.watch(`SELECT * FROM list ORDER BY created_at`, [], {
      onResult: result => {
         onResult(result.rows);
      },
   });
}

export const insertItem = async text => {
   return PowerSync.execute(
      "INSERT INTO list(id, text) VALUES(uuid(), ?) RETURNING *",
      [text]
   );
};

export const updateItem = async (id, text) => {
   return PowerSync.execute("UPDATE list SET text = ? WHERE id = ?", [
      text,
      id,
   ]);
};

export const deleteItem = async id => {
   return PowerSync.execute("DELETE FROM list WHERE id = ?", [id]);
};

export const allItems = async () => {
   return await PowerSync.getAll("SELECT * FROM list ORDER BY created_at");
};

export const deleteAllItems = async () => {
   return PowerSync.execute("DELETE FROM list");
};

export const execute = async (sql, params) => {
   return PowerSync.execute(sql, params);
};
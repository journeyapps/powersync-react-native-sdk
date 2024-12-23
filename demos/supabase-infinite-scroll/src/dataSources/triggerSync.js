import { Supabase, PowerSync, execute } from "../powersync";
import Logger from "js-logger";

const logger = Logger.get("src/dataSources/triggerSync");

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export default function useTriggerSync() {
   let itemCount = 0;

   async function sync(start, count) {
      try {
         return new Promise(async resolve => {
            logger.info(`Syncing items from ${start} to ${start + count - 1}`);
            let lastSyncedTime =
               PowerSync.currentStatus?.lastSyncedAt?.getTime() || 0;

            const id = Supabase.currentSession.user.id;


            const dispose = PowerSync.registerListener({
               statusChanged: async status => {
                  const currentSyncTime = status.lastSyncedAt.getTime();
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

            const { data, error } = await Supabase.client.rpc(
               "update_sync_to",
               {
                  start_value: start + 1,
                  end_value: start + count,
                  user_uuid: id,
               }
            );
            if (error) {
               logger.error("Error calling update_sync_to RPC:", error);
            }
         });
      } catch (error) {
         console.log(error);
         debugger;
      }
   }

   async function getItems(start, count) {
      logger.info(`triggerSync getItems ${start} to ${start + count - 1}`);

      logger.info("getting items");
      let newRows;

      while (
         (newRows = await PowerSync.getAll(
            `SELECT * FROM syncto_list ORDER BY created_at LIMIT ? OFFSET ?`,
            [count, start]
         )).length === 0
      ) {
         await sync(start, count);
         await sleep(1000);
      }
      if (newRows.length === 0) {
         logger.info("No items found, stopping render");
         debugger;
      }

      itemCount = start + count + 1;
      return newRows;
   }

   return {
      name: "triggerSync",
      getItems,
      getItemCount: () => 10000,
   };
}
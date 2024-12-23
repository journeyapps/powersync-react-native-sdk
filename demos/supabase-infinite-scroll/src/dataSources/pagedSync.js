// Control data sync using client parameters
import { execute, reconnect } from "../powersync";

async function sleep(ms) {
   return new Promise(resolve => setTimeout(resolve, ms));
}

import Logger from "js-logger";
Logger.useDefaults();

const logger = Logger.get("src/dataSources/pagedSync");

export default function usePagedSync() {
   let pageNumber = 0;
   let pageSize = 0;
   let buffer = [];
   let itemCount = 0;

   async function getItems(start, count) {
      while (start + count > itemCount) {
         logger.info("pagedSync getItems", start, count, itemCount, pageNumber);

         if (await reconnect(++pageNumber)) {
            //TODO: getAll instead of execute to simplify extracting results (see other implementations too)
            const rval = await execute(
               "SELECT * FROM paged_list WHERE page = ? ORDER BY created_at",
               [pageNumber]
            );
            let newRows = rval.rows._array;
            
            // Maintain buffer size by removing old items if necessary
            if (buffer.length + newRows.length > 199) {
               const keepCount = 199 - newRows.length;
               buffer = buffer.slice(-keepCount);
            }
            
            buffer = [...buffer, ...newRows];
            if (!pageSize) {
               pageSize = newRows.length;
            }
            itemCount += newRows.length;
         } else {
            logger.warn("pagedSync failed to reconnect");
            return [];
         }  
      }
      
      // Calculate the correct slice indices based on the requested start position
      const bufferStart = Math.max(0, start - (itemCount - buffer.length));
      return buffer.slice(bufferStart, bufferStart + count);
   }
   return {
      name: "pagedSync",
      getItems,
      getItemCount: () => 10000,
   };
}
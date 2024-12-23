import { execute } from "../powersync";
import Logger from "js-logger";

const logger = Logger.get("src/dataSources/preSync");

export default function usePreSync() {
   let count = 0;

   return {
      name: "preSync",
      getItems: async (start, count) => {
         logger.info(`preSync getItems ${start} to ${start + count - 1}`);
         const rval = await execute(
            "SELECT * FROM list ORDER BY created_at LIMIT ? OFFSET ?",
            [count, start]
         );
         logger.debug(`Retrieved ${rval.rows._array.length} items`);
         count = count + rval.rows._array.length;
         return rval.rows._array;
      },
      getItemCount: () => Math.max(count, 10000)
   };
}
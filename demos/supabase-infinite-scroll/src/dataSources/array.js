import Logger from "js-logger";
Logger.useDefaults();

const logger = Logger.get("src/dataSources/pagedSync");

export default function useArray() {
   const items = Array.from({ length: 1000 }, (_, i) => `Item ${i + 1}`);

   async function getItems(start, count) {
      logger.info(`array dataSournce get items from ${start} to ${start + count - 1}`);
      logger.info(`items.length: ${items.length}`);
      const rval = items.slice(start, start + count).map((item, index) => ({
         text: item,
         id: start + index,
      }));
      return rval;
   }
   return {
      getItems,
      getItemCount: () => Math.max(items.length, 100),
      name: "array"
   };
}
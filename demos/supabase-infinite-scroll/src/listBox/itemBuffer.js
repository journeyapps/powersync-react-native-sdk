import Logger from "js-logger";

const logger = Logger.get("src/listBox/itemBuffer");

export default function useItemBuffer(config) {
   let items = [];
   let fetchPromise = null;

   async function fetchItems(start, count) {
      try {
         if (fetchPromise) {
            await fetchPromise;
         }

         fetchPromise = config.dataSource.getItems(
            start,
            count + config.prefetchCount
         );

         const newItems = await fetchPromise;

         // Extend array if needed
         if (start + newItems.length > items.length) {
            items = [
               ...items.slice(0, start),
               ...newItems
            ];
         }

         return newItems;
      } catch (error) {
         logger.error("Error fetching items:", error);
         throw error;
      } finally {
         fetchPromise = null;
      }
   }

   async function getItems(start, count) {
      if (start + count > items.length) {
         await fetchItems(start, count);
      }

      return items.slice(start, start + count);
   }

   async function getItemCount() {
      return config.dataSource.getItemCount();
   }

   return {
      getItems,
      getItemCount,
      getBuffer: () => [...items],
   };
}

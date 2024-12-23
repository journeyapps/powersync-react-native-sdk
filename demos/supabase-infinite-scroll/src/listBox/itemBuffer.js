import Logger from "js-logger";

const logger = Logger.get("src/listBox/itemBuffer");

export default function useItemBuffer(config) {
   let items = [];
   let startIndex = 0;
   let inhere = false;

   async function fetchItems(start, count) {
      const result = await config.dataSource.getItems(
         start,
         count + config.prefetchCount
      );
      return result;
   }

   async function ensureItems(count) {
      try {
         inhere = true;

         if (count > items.length) {
            const newItems = await fetchItems(items.length, count);

            items.push(...newItems);
         }
         inhere = false;
      } catch (error) {
         logger.error("Error fetching items:", error);
      }
   }

   async function getItems(start, count) {

      if (start + count >= items.length) {
         await ensureItems(start + count);
      }

      const result = [...items.slice(start, start + count)];
      return result;
   }

   async function getItemCount() {
      return config.dataSource.getItemCount();
   }
   return {
      items,
      getBuffer: () => [...items],
      ensureItems,
      getItems,
      getItemCount,
   };
}
import useItemBuffer from "./itemBuffer";
import Logger from "js-logger";

const logger = Logger.get("src/listBox");

export async function useListBox(config) {
   logger.info("Initializing ListBox with config:", JSON.stringify(config));

   const itemBuffer = useItemBuffer(config);
   const listContainer = document.getElementById("listBox");
   const list = listContainer.querySelector("#listItems");
   const spinner = document.getElementById("spinner");
   const { itemHeight, itemsPerPage } = config;

   let items = [];
   let eofIndex = Number.MAX_SAFE_INTEGER;
   let isLoading = false;
   let scrollTimeout = null;

   // Add intersection observer for infinite scroll
   const observerOptions = {
      root: listContainer,
      rootMargin: '100px',
      threshold: 0.1
   };

   const loadMoreCallback = (entries) => {
      const target = entries[0];
      if (target.isIntersecting && !isLoading) {
         const scrollTop = Math.round(listContainer.scrollTop / itemHeight);
         handleScroll(scrollTop);
      }
   };

   const observer = new IntersectionObserver(loadMoreCallback, observerOptions);

   // Create sentinel element for infinite scroll
   const sentinel = document.createElement('div');
   sentinel.className = 'scroll-sentinel';
   sentinel.style.height = '1px';
   list.appendChild(sentinel);
   observer.observe(sentinel);

   listContainer.style.height = `${itemHeight * itemsPerPage}px`;

   function throttleScroll(callback) {
      return function() {
         if (scrollTimeout) {
            return;
         }

         scrollTimeout = requestAnimationFrame(() => {
            const scrollTop = Math.round(listContainer.scrollTop / itemHeight);
            callback(scrollTop);
            scrollTimeout = null;
         });
      };
   }

   const throttledHandleScroll = throttleScroll(handleScroll);

   if (listContainer._scrollHandler) {
      listContainer.removeEventListener("scroll", listContainer._scrollHandler);
   }

   listContainer._scrollHandler = throttledHandleScroll;
   listContainer.addEventListener("scroll", listContainer._scrollHandler);

   function showSpinner() {
      if (!spinner.classList.contains('visible')) {
         spinner.classList.remove("hidden");
         spinner.classList.add("visible");
      }
   }

   function hideSpinner() {
      if (!spinner.classList.contains('hidden')) {
         spinner.classList.add("hidden");
         spinner.classList.remove("visible");
      }
   }

   // Initialize
   await initializeList();

   async function initializeList() {
      try {
         const initialItems = await getItems(0, config.itemsPerPage);
         items = initialItems;
         totalItems = await getItemCount();
         await renderItems(0);
         listContainer.scrollTop = 0;
      } catch (error) {
         logger.error("Error initializing list:", error);
      }
   }

   async function getItems(startIndex, count) {
      logger.debug(`Getting items from ${startIndex} to ${startIndex + count - 1}`);
      return await itemBuffer.getItems(startIndex, count);
   }

   async function getItemCount() {
      const count = await itemBuffer.getItemCount();
      logger.debug(`Total item count: ${count}`);
      return count;
   }

   async function handleScroll(scrollTop) {
      if (isLoading) return;

      try {
         isLoading = true;
         await renderItems(scrollTop);

         // Update sentinel position
         sentinel.style.transform = `translateY(${(scrollTop + itemsPerPage) * itemHeight}px)`;

         if (scrollTop >= eofIndex - itemsPerPage) {
            list.style.transform = `translateY(${(eofIndex - itemsPerPage) * itemHeight}px)`;
            listContainer.scrollTop = (eofIndex - itemsPerPage) * itemHeight;
         }
      } finally {
         isLoading = false;
      }
   }

   async function renderItems(startIndex) {
      if (startIndex + itemsPerPage > eofIndex) {
         logger.debug("Reached end of list. Skipping render.");
         return;
      }

      showSpinner();

      try {
         // Use DocumentFragment for better performance
         const fragment = document.createDocumentFragment();

         // Fetch next batch of items
         const newItems = await getItems(startIndex, itemsPerPage);

         if (newItems.length === 0) {
            const n = await getItemCount();
            eofIndex = startIndex = n;
            list.style.transform = `translateY(${(startIndex + 1) * itemHeight}px)`;
            listContainer.scrollTop = (n - itemsPerPage) * itemHeight;
            return;
         }

         items = newItems;

         // Clear existing items
         list.innerHTML = '';

         // Create and append new items to fragment
         items.forEach(item => {
            const div = document.createElement("div");
            div.className = "list-item";
            div.textContent = item.text;
            fragment.appendChild(div);
         });

         // Single DOM operation to append all items
         list.appendChild(fragment);

         // Use transform instead of margin for better performance
         list.style.transform = `translateY(${startIndex * itemHeight}px)`;

      } catch (error) {
         logger.error("Error during rendering:", error);
      } finally {
         hideSpinner();
      }
   }

   // Cleanup function
   return () => {
      observer.disconnect();
      if (listContainer._scrollHandler) {
         listContainer.removeEventListener("scroll", listContainer._scrollHandler);
      }
      if (scrollTimeout) {
         cancelAnimationFrame(scrollTimeout);
      }
   };
}

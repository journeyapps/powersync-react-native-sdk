import useItemBuffer from "./itemBuffer";
import Logger from "js-logger";

const logger = Logger.get("src/listBox");

export async function useListBox(config) {
   logger.info("Initializing ListBox with config:", JSON.stringify(config));

   const itemBuffer = useItemBuffer(config);
   const listContainer = document.getElementById("listBox");
   const list = listContainer.querySelector("#listItems");
   const spinner = document.getElementById("spinner"); // Spinner element
   const { itemHeight, itemsPerPage } = config;
   let eol = false;
   let totalItems = 0;
   let items = [];
   let eofIndex = Number.MAX_SAFE_INTEGER;

   let isRendering = false;
   let pendingRender = null;

   listContainer.style.height = `${itemHeight * itemsPerPage}px`;

   function debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
         const later = () => {
            clearTimeout(timeout);
            func(...args);
         };
         clearTimeout(timeout);
         timeout = setTimeout(later, wait);
      };
   }

   const debouncedHandleScroll = debounce(handleScroll, 100);

   if (listContainer._scrollHandler) {
      listContainer.removeEventListener("scroll", listContainer._scrollHandler);
   }

   listContainer._scrollHandler = debouncedHandleScroll;
   listContainer.addEventListener("scroll", listContainer._scrollHandler);

   function showSpinner() {
      spinner.classList.remove("hidden");
   }

   function hideSpinner() {
      spinner.classList.add("hidden");
   }

   hideSpinner();

   // Initialize by getting items and rendering them
   await getItems(0, config.itemsPerPage)
      .then(itemz => {
         logger.info("Initial items", itemz);
         items = itemz;
         return getItemCount();
      })
      .then(async count => {
         totalItems = count;
         logger.info(`Set list height to ${totalItems * itemHeight}px`);
         await renderItems(0);
      });

   listContainer.scrollTop = 0;

   async function getItems(startIndex, count) {
      logger.debug(
         `Getting items from ${startIndex} to ${startIndex + count - 1}`
      );
      return await itemBuffer.getItems(startIndex, count);
   }

   async function getItemCount() {
      const count = await itemBuffer.getItemCount();
      logger.debug(`Total item count: ${count}`);
      return count;
   }

   async function handleScroll() {
      let scrollTop = Math.round(listContainer.scrollTop / itemHeight);

      while (true) {
         await renderItems(scrollTop);
         if (!pendingRender) {
            break;
         }
         scrollTop = pendingRender;
      }
      if (scrollTop >= eofIndex - itemsPerPage) {
         list.style.marginTop = `${(eofIndex - itemsPerPage) * itemHeight}px`;

         listContainer.scrollTop = Math.round(
            (eofIndex - itemsPerPage) * itemHeight
         );
      }
   }

   async function renderItems(startIndex) {
      try {
         return new Promise(async resolve => {
            if (startIndex + itemsPerPage > eofIndex) {
               logger.debug("Reached end of list. Skipping render.");
               resolve();
            }
            items = [];
            showSpinner();
            items = await getItems(startIndex, itemsPerPage);
            if (items.length === 0) {
               const n = await getItemCount();
               eofIndex = startIndex = n;
               list.style.marginTop = `${(startIndex + 1) * itemHeight}px`;
               listContainer.scrollTop = (n - itemsPerPage) * itemHeight;
               resolve();
            }
            logger.info("Rendering items", items);
            list.innerHTML = "";
            // debugger;
            // list.style.transform = `translateY(${startIndex * itemHeight}px)`;
            list.style.marginTop = `${startIndex * itemHeight}px`;
            items.forEach(item => {
               const div = document.createElement("div");
               div.className = "list-item";
               div.textContent = item.text;
               list.appendChild(div);
            });
            hideSpinner();
            resolve();
         });
      } catch (error) {
         logger.error("Error during rendering:", error);
      } finally {
         isRendering = false;
      }
   }
}

document.addEventListener("DOMContentLoaded", () => {
   // Function to log the position of the listBox and move the spinner
   function updateSpinnerPosition() {
      const listBox = document.getElementById("listBox");
      const spinner = document.getElementById("spinner");

      if (listBox && spinner) {
         const rect = listBox.getBoundingClientRect();

         // Move spinner to the upper left corner of the listBox
         spinner.style.top = `${rect.top + 50}px`;
         spinner.style.left = `${rect.left + 100}px`;
      } else {
         console.error("listBox or spinner element not found");
      }
   }

   // Add event listener for window resize
   window.addEventListener("resize", updateSpinnerPosition);

   // Initial update to position spinner on page load
   updateSpinnerPosition();
});
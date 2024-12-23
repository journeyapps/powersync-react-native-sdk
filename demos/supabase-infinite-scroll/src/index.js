import { loginAnon, openDatabase } from "@/powersync";
import {
   useArray,
   usePreSync,
   usePagedSync,
   useTriggerSync,
} from "./dataSources";
import { useListBox } from "./listBox";
import Logger from "js-logger";
import { useConsoleList } from "./consoleList";


Logger.useDefaults({ defaultLevel: Logger.DEBUG });
Logger.setHandler((messages, context) => {
   Logger.createDefaultHandler()(messages, context);
   useConsoleList(messages, context);
});

const logger = Logger.get("src/index");

let config = {
   itemsPerPage: 15,
   prefetchCount: 30,
   bufferSize: 30,
   itemHeight: getItemHeight(), // Adjust this value based on your item's actual height
};

function getItemHeight() {
   logger.debug("Calculating item height");
   const item = document.createElement("li");
   let itemHeight = 0;

   item.style.visibility = "hidden";
   item.textContent = "Dummy Item";
   item.classList.add("list-item");
   document.querySelector("#listItems").appendChild(item);
   itemHeight = item.clientHeight + 4; // margin
   item.remove();
   logger.debug(`Calculated item height: ${itemHeight}px`);
   return itemHeight;
}

async function usingArray() {
   logger.info("Switching to Array Data Source");
   document.getElementById("which").textContent = "Array";

   config.dataSource = useArray();
   useListBox(config);
}

async function usingPreSync() {
   logger.info("Switching to Pre-Sync Data Source");
   document.getElementById("which").textContent = "Pre-Sync";
   config.dataSource = usePreSync();

   useListBox(config);
}

async function usingPagedSync() {
   logger.info("Switching to Paged Sync Data Source");
   document.getElementById("which").textContent = "Paged Sync";
   config.dataSource = await usePagedSync();
   config.prefetchCount = 0;
   useListBox(config);
}

async function usingTriggerSync() {
   logger.info("Switching to Trigger Sync Data Source");
   config.dataSource = useTriggerSync(config.itemsPerPage);
   document.getElementById("which").textContent = "Trigger Sync";
   config.prefetchCount = 100;
   useListBox(config);
}

async function setupListeners() {
   document
      .getElementById("arrayProvider")
      .addEventListener("click", usingArray);
   document
      .getElementById("preSyncProvider")
      .addEventListener("click", usingPreSync);
   document
      .getElementById("pagedSyncProvider")
      .addEventListener("click", usingPagedSync);
   document
      .getElementById("triggerSyncProvider")
      .addEventListener("click", usingTriggerSync);

   try {
      try {
         logger.info("Opening database");
        
         const opened = await openDatabase();
         if (!opened) {
            alert("Failed to open database.");
            debugger;
         } else {
            logger.info("Database opened successfully");
            document.getElementById("preSyncProvider").disabled = false;
            document.getElementById("pagedSyncProvider").disabled = false;
            document.getElementById("triggerSyncProvider").disabled = false;
            logger.info("Enabled sync provider buttons");
         }
      } catch (error) {
         logger.error("Error during initialization:", error);
      }
   } catch (error) {
      logger.error("Error during initialization:", error);
   }
}

if (!document.getElementById("arrayProvider")) {
   document.addEventListener("DOMContentLoaded", async () => {
      logger.info("DOM content loaded, initializing application");

      setupListeners();
   });
} else {
   setupListeners();
}
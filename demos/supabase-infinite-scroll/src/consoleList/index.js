export const useConsoleList = async (messages, context) => {
   const logDiv = document.createElement("div");
   logDiv.style.marginBottom = "4px"; // Add bottom margin to each log item

   let textContent = [];
   let objectSpans = [];

   Array.from(messages).forEach((message, index) => {
      if (typeof message === "object" && message !== null) {
         textContent.push("[object Object]");
         const objectSpan = document.createElement("span");
         objectSpan.style.display = "none";
         objectSpan.textContent = JSON.stringify(message);
         objectSpan.classList.add("hidden-object");
         objectSpan.dataset.index = index;
         objectSpans.push(objectSpan);
      } else {
         textContent.push(String(message));
      }
   });

   logDiv.textContent = textContent.join(" ");
   objectSpans.forEach(span => {
      logDiv.appendChild(span);
      logDiv.addEventListener("click", itemClickHandler);
   });

   const consoleList = document.getElementById("console-list");

   if (consoleList) {
      consoleList.appendChild(logDiv);

      consoleList.scrollTop = consoleList.scrollHeight;
   } else {
      console.error("Element with id 'console-list' not found");
   }
};

function createJsonModal(jsonString) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: white;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        width: fit-content;
        max-width: 90vw;
        height: 80%;
        display: flex;
        flex-direction: column;
        z-index: 1000;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
        padding: 10px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: flex-end;
    `;

    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        line-height: 20px;
        width: 20px;
        height: 20px;
    `;
    closeButton.onclick = () => document.body.removeChild(modal);

    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = `
        flex-grow: 1;
        overflow-y: auto;
        padding: 20px;
    `;

    const pre = document.createElement('pre');
    pre.style.cssText = `
        white-space: pre-wrap;
        word-wrap: break-word;
        margin: 0;
    `;
    pre.textContent = JSON.stringify(JSON.parse(jsonString), null, 2);

    header.appendChild(closeButton);
    contentContainer.appendChild(pre);
    modal.appendChild(header);
    modal.appendChild(contentContainer);
    document.body.appendChild(modal);
}

function itemClickHandler(event) {
    if (event.target.textContent.includes("[object Object]")) {
        const text = event.target.getElementsByTagName("SPAN")[0].textContent;
        createJsonModal(text);
    }
}

export function initializeConsoleList(messages, context) {
    consoleListAppender(messages, context);
}




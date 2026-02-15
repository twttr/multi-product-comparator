import type { MessageRequest } from "./types.js";
import { addItem, getItems, removeItem, clearAll } from "./storage.js";

chrome.storage.session.setAccessLevel({
  accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
});

chrome.runtime.onMessage.addListener(
  (message: MessageRequest, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse);
    return true;
  }
);

async function handleMessage(message: MessageRequest): Promise<unknown> {
  switch (message.action) {
    case "addItem":
      return addItem(message.item);
    case "getItems":
      return getItems();
    case "removeItem":
      return removeItem(message.productId);
    case "clearAll":
      await clearAll();
      return [];
    default:
      return null;
  }
}

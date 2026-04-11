import type { MessageRequest } from "./types.js";
import { addItem, getItems, removeItem, clearAll } from "./storage.js";

chrome.storage.session.setAccessLevel({
  accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
});

// Allowed storage keys — must match exactly the keys defined in sites.ts
const ALLOWED_STORAGE_KEYS = new Set([
  "items_idealo",
  "items_geizhals",
  "items_billiger",
  "items_guenstiger",
]);

function isValidStorageKey(key: unknown): key is string {
  return typeof key === "string" && ALLOWED_STORAGE_KEYS.has(key);
}

chrome.runtime.onMessage.addListener(
  (message: MessageRequest, sender, sendResponse) => {
    // Only accept messages from our own extension (content scripts and popup).
    // Messages from third-party origins or other extensions are rejected.
    if (sender.id !== chrome.runtime.id) {
      console.warn("[multi-product-comparator] Rejected message from unknown sender:", sender.id);
      sendResponse(null);
      return false;
    }

    // Validate storageKey before doing anything with storage
    if (!isValidStorageKey((message as { storageKey?: unknown }).storageKey)) {
      console.warn("[multi-product-comparator] Rejected message with invalid storageKey:", (message as { storageKey?: unknown }).storageKey);
      sendResponse(null);
      return false;
    }

    handleMessage(message).then(sendResponse);
    return true;
  }
);

async function handleMessage(message: MessageRequest): Promise<unknown> {
  switch (message.action) {
    case "addItem":
      return addItem(message.storageKey, message.item);
    case "getItems":
      return getItems(message.storageKey);
    case "removeItem":
      return removeItem(message.storageKey, message.productId);
    case "clearAll":
      await clearAll(message.storageKey);
      return [];
    default:
      return null;
  }
}

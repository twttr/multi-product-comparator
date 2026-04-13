import type { ProductItem, MessageRequest } from "./types.js";
import { storageKeyFromHostname } from "./sites.js";

const itemListEl = document.getElementById("item-list")!;
const clearAllBtn = document.getElementById("clear-all")!;
const emptyStateEl = document.getElementById("empty-state")!;

function localizeUI(): void {
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = chrome.i18n.getMessage(key);
  });
}

function storageKeyFromUrl(url: string): string | null {
  try {
    return storageKeyFromHostname(new URL(url).hostname);
  } catch {
    return null;
  }
}

function renderItems(items: ProductItem[], storageKey: string): void {
  itemListEl.innerHTML = "";
  const hasItems = items.length > 0;
  emptyStateEl.style.display = hasItems ? "none" : "block";
  clearAllBtn.style.display = hasItems ? "block" : "none";

  items
    .sort((a, b) => b.addedAt - a.addedAt)
    .forEach((item) => {
      const row = document.createElement("div");
      row.className = "item-row";

      const link = document.createElement("a");
      // Sanitize URL: only allow http/https protocols to prevent XSS via javascript: URIs
      try {
        const parsedUrl = new URL(item.productUrl);
        if (parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:") {
          link.href = item.productUrl;
        }
      } catch {
        // Invalid URL — leave href unset (link renders as plain text anchor)
      }
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = item.productName;
      link.title = item.productName;

      const shopCount = document.createElement("span");
      shopCount.className = "shop-count";
      shopCount.textContent = `${item.shopNames.length} shops`;

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.textContent = chrome.i18n.getMessage("popupRemove") || "Remove";
      removeBtn.addEventListener("click", async () => {
        let updated: ProductItem[];
        try {
          updated = await chrome.runtime.sendMessage({
            action: "removeItem",
            storageKey,
            productId: item.productId,
          } satisfies MessageRequest);
        } catch (err) {
          console.error("[multi-product-comparator] removeItem failed:", err);
          return;
        }
        renderItems(updated, storageKey);
      });

      row.appendChild(link);
      row.appendChild(shopCount);
      row.appendChild(removeBtn);
      itemListEl.appendChild(row);
    });
}

async function init(): Promise<void> {
  localizeUI();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const storageKey = storageKeyFromUrl(tab?.url ?? "");
  if (!storageKey) {
    emptyStateEl.style.display = "block";
    clearAllBtn.style.display = "none";
    return;
  }

  let items: ProductItem[];
  try {
    items = await chrome.runtime.sendMessage({
      action: "getItems",
      storageKey,
    } satisfies MessageRequest);
  } catch (err) {
    console.error("[multi-product-comparator] getItems failed:", err);
    emptyStateEl.style.display = "block";
    clearAllBtn.style.display = "none";
    return;
  }
  renderItems(items, storageKey);

  clearAllBtn.addEventListener("click", async () => {
    try {
      await chrome.runtime.sendMessage({
        action: "clearAll",
        storageKey,
      } satisfies MessageRequest);
    } catch (err) {
      console.error("[multi-product-comparator] clearAll failed:", err);
      return;
    }
    renderItems([], storageKey);
  });
}

init();

import type { ProductItem, MessageRequest } from "./types.js";

const itemListEl = document.getElementById("item-list")!;
const clearAllBtn = document.getElementById("clear-all")!;
const emptyStateEl = document.getElementById("empty-state")!;

function renderItems(items: ProductItem[]): void {
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
      link.href = item.productUrl;
      link.target = "_blank";
      link.textContent = item.productName;
      link.title = item.productName;

      const shopCount = document.createElement("span");
      shopCount.className = "shop-count";
      shopCount.textContent = `${item.shopNames.length} shops`;

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", async () => {
        const updated: ProductItem[] = await chrome.runtime.sendMessage({
          action: "removeItem",
          productId: item.productId,
        } satisfies MessageRequest);
        renderItems(updated);
      });

      row.appendChild(link);
      row.appendChild(shopCount);
      row.appendChild(removeBtn);
      itemListEl.appendChild(row);
    });
}

async function init(): Promise<void> {
  const items: ProductItem[] = await chrome.runtime.sendMessage({
    action: "getItems",
  } satisfies MessageRequest);
  renderItems(items);
}

init();

clearAllBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({
    action: "clearAll",
  } satisfies MessageRequest);
  renderItems([]);
});

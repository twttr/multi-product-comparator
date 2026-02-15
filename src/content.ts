import type { ProductItem, MessageRequest } from "./types.js";

const OFFER_LINK_SELECTOR =
  ".productOffers-listItemOfferLink[data-shop-name]";
const SHOP_NAME_ATTR = "data-shop-name";
const OFFER_ROW_SELECTOR = ".productOffers-listItem";
const STORAGE_KEY = "items";

interface Strings {
  addToCompare: string;
  added: string;
  clearList: string;
  remove: string;
}

const LOCALE_STRINGS: Record<string, Strings> = {
  de: { addToCompare: "Zum Vergleich hinzuf\u00fcgen", added: "Hinzugef\u00fcgt \u2713", clearList: "Liste leeren", remove: "Entfernen" },
  at: { addToCompare: "Zum Vergleich hinzuf\u00fcgen", added: "Hinzugef\u00fcgt \u2713", clearList: "Liste leeren", remove: "Entfernen" },
  fr: { addToCompare: "Ajouter au comparatif", added: "Ajout\u00e9 \u2713", clearList: "Vider la liste", remove: "Supprimer" },
  es: { addToCompare: "A\u00f1adir a la comparaci\u00f3n", added: "A\u00f1adido \u2713", clearList: "Vaciar lista", remove: "Eliminar" },
  it: { addToCompare: "Aggiungi al confronto", added: "Aggiunto \u2713", clearList: "Svuota lista", remove: "Rimuovi" },
  uk: { addToCompare: "Add to Compare", added: "Added \u2713", clearList: "Clear List", remove: "Remove" },
};

function getStrings(): Strings {
  const host = window.location.hostname;
  if (host.endsWith(".co.uk")) return LOCALE_STRINGS.uk;
  const tld = host.split(".").pop() ?? "";
  return LOCALE_STRINGS[tld] ?? LOCALE_STRINGS.uk;
}

const strings = getStrings();

let currentProductId: string | null = null;

function extractProductId(): string | null {
  const firstOffer = document.querySelector<HTMLAnchorElement>(
    OFFER_LINK_SELECTOR
  );
  if (!firstOffer) return null;
  const url = new URL(firstOffer.href, window.location.origin);
  return url.searchParams.get("productid");
}

function scrapeShopNames(): string[] {
  const offerLinks =
    document.querySelectorAll<HTMLAnchorElement>(OFFER_LINK_SELECTOR);
  const shopNames = new Set<string>();
  offerLinks.forEach((link) => {
    const shopName = link.getAttribute(SHOP_NAME_ATTR);
    if (shopName) {
      shopNames.add(shopName);
    }
  });
  return Array.from(shopNames);
}

function scrapeProductName(): string {
  const heading = document.querySelector("h1");
  return heading?.textContent?.trim() ?? "Unknown Product";
}

function removePanel(): void {
  document.getElementById("idealo-multi-panel")?.remove();
}

function createPanel(): HTMLDivElement {
  removePanel();
  const panel = document.createElement("div");
  panel.id = "idealo-multi-panel";

  const listEl = document.createElement("div");
  listEl.id = "idealo-multi-item-list";

  const clearBtn = document.createElement("button");
  clearBtn.id = "idealo-multi-clear-btn";
  clearBtn.textContent = strings.clearList;
  clearBtn.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({
      action: "clearAll",
    } satisfies MessageRequest);
    renderItemList([]);
    refreshHighlights();
  });

  const addBtn = document.createElement("button");
  addBtn.id = "idealo-multi-add-btn";
  addBtn.textContent = strings.addToCompare;

  panel.appendChild(listEl);
  panel.appendChild(clearBtn);
  panel.appendChild(addBtn);
  document.body.appendChild(panel);
  return panel;
}

function renderItemList(items: ProductItem[]): void {
  const listEl = document.getElementById("idealo-multi-item-list");
  const clearBtn = document.getElementById("idealo-multi-clear-btn");
  if (!listEl || !clearBtn) return;

  listEl.innerHTML = "";
  clearBtn.style.display = items.length > 0 ? "block" : "none";

  items
    .sort((a, b) => b.addedAt - a.addedAt)
    .forEach((item) => {
      const row = document.createElement("div");
      row.className = "idealo-multi-item-row";

      const name = document.createElement("span");
      name.className = "idealo-multi-item-name";
      name.textContent = item.productName;
      name.title = item.productName;

      const removeBtn = document.createElement("button");
      removeBtn.className = "idealo-multi-remove-btn";
      removeBtn.textContent = "\u00d7";
      removeBtn.title = strings.remove;
      removeBtn.addEventListener("click", async () => {
        const updated: ProductItem[] = await chrome.runtime.sendMessage({
          action: "removeItem",
          productId: item.productId,
        } satisfies MessageRequest);
        renderItemList(updated);
        updateAddButtonState(updated);
        refreshHighlights();
      });

      row.appendChild(name);
      row.appendChild(removeBtn);
      listEl.appendChild(row);
    });
}

function updateAddButtonState(items: ProductItem[]): void {
  const addBtn = document.getElementById(
    "idealo-multi-add-btn"
  ) as HTMLButtonElement | null;
  if (!addBtn || !currentProductId) return;
  const isAdded = items.some(
    (item) => item.productId === currentProductId
  );
  addBtn.textContent = isAdded ? strings.added : strings.addToCompare;
  addBtn.classList.toggle("idealo-multi-added", isAdded);
}

function clearHighlights(): void {
  document.querySelectorAll(".idealo-multi-highlight").forEach((el) => {
    el.classList.remove("idealo-multi-highlight");
  });
}

function highlightMatchingShops(matchingShopNames: Set<string>): void {
  clearHighlights();
  if (matchingShopNames.size === 0) return;

  const offerLinks =
    document.querySelectorAll<HTMLAnchorElement>(OFFER_LINK_SELECTOR);
  offerLinks.forEach((link) => {
    const shopName = link.getAttribute(SHOP_NAME_ATTR);
    if (shopName && matchingShopNames.has(shopName)) {
      const row = link.closest(OFFER_ROW_SELECTOR);
      if (row) {
        row.classList.add("idealo-multi-highlight");
      }
    }
  });
}

function computeMatchingShops(
  items: ProductItem[],
  currentShops: string[],
  excludeProductId?: string
): Set<string> {
  const filtered = excludeProductId
    ? items.filter((item) => item.productId !== excludeProductId)
    : items;
  if (filtered.length === 0) return new Set();

  const currentShopSet = new Set(currentShops);
  const shopCounts = new Map<string, number>();

  for (const item of filtered) {
    for (const shop of item.shopNames) {
      if (currentShopSet.has(shop)) {
        shopCounts.set(shop, (shopCounts.get(shop) ?? 0) + 1);
      }
    }
  }

  const matching = new Set<string>();
  for (const [shop, count] of shopCounts) {
    if (count === filtered.length) {
      matching.add(shop);
    }
  }
  return matching;
}

async function initialize(): Promise<void> {
  const productId = extractProductId();
  if (productId === currentProductId) return;
  currentProductId = productId;

  clearHighlights();
  removePanel();
  knownOfferCount = document.querySelectorAll(OFFER_LINK_SELECTOR).length;

  if (!productId) return;

  const panel = createPanel();
  const addBtn = panel.querySelector(
    "#idealo-multi-add-btn"
  ) as HTMLButtonElement;

  const items: ProductItem[] = await chrome.runtime.sendMessage({
    action: "getItems",
  } satisfies MessageRequest);

  renderItemList(items);
  updateAddButtonState(items);

  const currentShops = scrapeShopNames();
  const matching = computeMatchingShops(items, currentShops, productId);
  highlightMatchingShops(matching);

  addBtn.addEventListener("click", async () => {
    const shopNames = scrapeShopNames();
    const productName = scrapeProductName();
    const newItem: ProductItem = {
      productId,
      productName,
      productUrl: window.location.href,
      shopNames,
      addedAt: Date.now(),
    };
    const updatedItems: ProductItem[] = await chrome.runtime.sendMessage({
      action: "addItem",
      item: newItem,
    } satisfies MessageRequest);
    updateAddButtonState(updatedItems);
    renderItemList(updatedItems);
    const shops = scrapeShopNames();
    const matching = computeMatchingShops(updatedItems, shops, productId);
    highlightMatchingShops(matching);
  });
}

function waitForOffersAndInitialize(): void {
  const checkOffers = () => {
    const offers = document.querySelectorAll(OFFER_LINK_SELECTOR);
    if (offers.length > 0) {
      initialize();
      return true;
    }
    return false;
  };

  if (checkOffers()) return;

  const offerObserver = new MutationObserver(() => {
    if (checkOffers()) {
      offerObserver.disconnect();
    }
  });

  offerObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  setTimeout(() => offerObserver.disconnect(), 10000);
}

async function refreshHighlights(): Promise<void> {
  const productId = extractProductId();
  if (!productId) return;
  const items: ProductItem[] = await chrome.runtime.sendMessage({
    action: "getItems",
  } satisfies MessageRequest);
  const currentShops = scrapeShopNames();
  const matching = computeMatchingShops(items, currentShops, productId);
  highlightMatchingShops(matching);
}

let knownOfferCount = 0;

const domObserver = new MutationObserver(() => {
  const newProductId = extractProductId();
  if (newProductId !== currentProductId) {
    waitForOffersAndInitialize();
    return;
  }

  const currentCount = document.querySelectorAll(OFFER_LINK_SELECTOR).length;
  if (currentCount > knownOfferCount) {
    knownOfferCount = currentCount;
    refreshHighlights();
  }
});

domObserver.observe(document.body, {
  childList: true,
  subtree: true,
});

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== "session") return;
  if (!changes[STORAGE_KEY]) return;

  const items: ProductItem[] = changes[STORAGE_KEY].newValue ?? [];
  const productId = extractProductId();
  if (!productId) return;

  renderItemList(items);
  updateAddButtonState(items);

  const currentShops = scrapeShopNames();
  const matching = computeMatchingShops(items, currentShops, productId);
  highlightMatchingShops(matching);
});

waitForOffersAndInitialize();

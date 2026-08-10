import type { ProductItem, MessageRequest, SiteConfig } from "./types.js";
import { detectSiteKey } from "./sites.js";
import { computeMatchingShops } from "./matching.js";

const idealoConfig: SiteConfig = {
  storageKey: "items_idealo",
  offerLinkSelector: ".productOffers-listItemOfferLink[data-shop-name]",
  extractShopName: (el) => el.getAttribute("data-shop-name"),
  offerRowSelector: ".productOffers-listItem",
  extractProductId: () => {
    const firstOffer = document.querySelector<HTMLAnchorElement>(
      idealoConfig.offerLinkSelector
    );
    if (!firstOffer) return null;
    const url = new URL(firstOffer.href, window.location.origin);
    return url.searchParams.get("productid");
  },
};

const geizhalsConfig: SiteConfig = {
  storageKey: "items_geizhals",
  offerLinkSelector: ".offer_bt[data-merchant-name]",
  extractShopName: (el) => el.getAttribute("data-merchant-name"),
  offerRowSelector: ".offer",
  extractProductId: () => {
    const match = window.location.pathname.match(/-a(\d+)\.html/);
    return match ? match[1] : null;
  },
};

const billigerConfig: SiteConfig = {
  storageKey: "items_billiger",
  offerLinkSelector: "[data-offer-row] img[data-bde-image]",
  extractShopName: (el) => el.getAttribute("alt")?.replace(/^Shop /, "") ?? null,
  offerRowSelector: "[data-offer-row]",
  extractProductId: () => {
    const path = window.location.pathname;
    const baseMatch = path.match(/\/(?:base)?products\/(\d+)/);
    if (baseMatch) return baseMatch[1];
    const htmlMatch = path.match(/(\d+)\.html$/);
    return htmlMatch ? htmlMatch[1] : null;
  },
};

const guenstigerConfig: SiteConfig = {
  storageKey: "items_guenstiger",
  offerLinkSelector: ".offerListHoverContainer[data-sellertext]",
  extractShopName: (el) => el.getAttribute("data-sellertext"),
  offerRowSelector: ".offerListHoverContainer",
  extractProductId: () => {
    const firstOffer = document.querySelector<HTMLElement>(
      guenstigerConfig.offerLinkSelector
    );
    return firstOffer?.getAttribute("data-ptitle") ?? null;
  },
};

const SITE_CONFIG_MAP: Record<string, SiteConfig> = {
  idealo: idealoConfig,
  geizhals: geizhalsConfig,
  billiger: billigerConfig,
  guenstiger: guenstigerConfig,
};

const siteKey = detectSiteKey(window.location.hostname);
if (siteKey) {

const siteConfig: SiteConfig = SITE_CONFIG_MAP[siteKey];

interface Strings {
  addToCompare: string;
  added: string;
  clearList: string;
  remove: string;
}

const DE_STRINGS: Strings = { addToCompare: "Zum Vergleich hinzufügen", added: "Hinzugefügt ✓", clearList: "Liste leeren", remove: "Entfernen" };

const LOCALE_STRINGS: Record<string, Strings> = {
  de: DE_STRINGS,
  at: DE_STRINGS,
  fr: { addToCompare: "Ajouter au comparatif", added: "Ajouté ✓", clearList: "Vider la liste", remove: "Supprimer" },
  es: { addToCompare: "Añadir a la comparación", added: "Añadido ✓", clearList: "Vaciar lista", remove: "Eliminar" },
  it: { addToCompare: "Aggiungi al confronto", added: "Aggiunto ✓", clearList: "Svuota lista", remove: "Rimuovi" },
  uk: { addToCompare: "Add to Compare", added: "Added ✓", clearList: "Clear List", remove: "Remove" },
  pl: { addToCompare: "Dodaj do porównania", added: "Dodano ✓", clearList: "Wyczyść listę", remove: "Usuń" },
};

function getStrings(): Strings {
  const host = window.location.hostname;
  if (host.endsWith(".co.uk")) return LOCALE_STRINGS.uk;
  if (host.match(/geizhals\.(de|eu)/)) return LOCALE_STRINGS.de;
  if (host.match(/geizhals\.at/)) return LOCALE_STRINGS.at;
  if (host.match(/cenowarka\./)) return LOCALE_STRINGS.pl;
  if (host.match(/billiger\./)) return LOCALE_STRINGS.de;
  if (host.match(/guenstiger\./)) return LOCALE_STRINGS.de;
  const tld = host.split(".").pop() ?? "";
  return LOCALE_STRINGS[tld] ?? LOCALE_STRINGS.uk;
}

const strings = getStrings();

let currentProductId: string | null | undefined;
let isInitializing = false;

function scrapeShopNames(): string[] {
  const offerLinks =
    document.querySelectorAll(siteConfig.offerLinkSelector);
  const shopNames = new Set<string>();
  offerLinks.forEach((el) => {
    const shopName = siteConfig.extractShopName(el);
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
    try {
      await chrome.runtime.sendMessage({
        action: "clearAll",
        storageKey: siteConfig.storageKey,
      } satisfies MessageRequest);
    } catch (err) {
      console.error("[multi-product-comparator] clearAll failed:", err);
      return;
    }
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
        let updated: ProductItem[];
        try {
          updated = await chrome.runtime.sendMessage({
            action: "removeItem",
            storageKey: siteConfig.storageKey,
            productId: item.productId,
          } satisfies MessageRequest);
        } catch (err) {
          console.error("[multi-product-comparator] removeItem failed:", err);
          return;
        }
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
    document.querySelectorAll(siteConfig.offerLinkSelector);
  offerLinks.forEach((el) => {
    const shopName = siteConfig.extractShopName(el);
    if (shopName && matchingShopNames.has(shopName)) {
      const row = el.closest(siteConfig.offerRowSelector);
      if (row) {
        row.classList.add("idealo-multi-highlight");
      }
    }
  });
}

async function initialize(): Promise<void> {
  // Guard against concurrent calls (race condition between domObserver and
  // waitForOffersAndInitialize both triggering initialize simultaneously)
  if (isInitializing) return;
  const productId = siteConfig.extractProductId();
  if (productId === currentProductId) return;
  isInitializing = true;
  currentProductId = productId;

  clearHighlights();
  removePanel();
  knownOfferCount = document.querySelectorAll(siteConfig.offerLinkSelector).length;

  const panel = createPanel();
  const addBtn = panel.querySelector(
    "#idealo-multi-add-btn"
  ) as HTMLButtonElement;

  let items: ProductItem[];
  try {
    items = await chrome.runtime.sendMessage({
      action: "getItems",
      storageKey: siteConfig.storageKey,
    } satisfies MessageRequest);
  } catch (err) {
    console.error("[multi-product-comparator] getItems failed:", err);
    isInitializing = false;
    return;
  }

  renderItemList(items);

  if (!productId) {
    addBtn.style.display = "none";
    isInitializing = false;
    return;
  }

  updateAddButtonState(items);

  const currentShops = scrapeShopNames();
  const matching = computeMatchingShops(items, currentShops, productId);
  highlightMatchingShops(matching);

  isInitializing = false;

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
    let updatedItems: ProductItem[];
    try {
      updatedItems = await chrome.runtime.sendMessage({
        action: "addItem",
        storageKey: siteConfig.storageKey,
        item: newItem,
      } satisfies MessageRequest);
    } catch (err) {
      console.error("[multi-product-comparator] addItem failed:", err);
      return;
    }
    updateAddButtonState(updatedItems);
    renderItemList(updatedItems);
    const shops = scrapeShopNames();
    const matching = computeMatchingShops(updatedItems, shops, productId);
    highlightMatchingShops(matching);
  });
}

function waitForOffersAndInitialize(): void {
  const checkOffers = () => {
    const offers = document.querySelectorAll(siteConfig.offerLinkSelector);
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
  const productId = siteConfig.extractProductId();
  if (!productId) return;
  let items: ProductItem[];
  try {
    items = await chrome.runtime.sendMessage({
      action: "getItems",
      storageKey: siteConfig.storageKey,
    } satisfies MessageRequest);
  } catch (err) {
    console.error("[multi-product-comparator] refreshHighlights getItems failed:", err);
    return;
  }
  const currentShops = scrapeShopNames();
  const matching = computeMatchingShops(items, currentShops, productId);
  highlightMatchingShops(matching);
}

let knownOfferCount = 0;
let domChangeTimer: ReturnType<typeof setTimeout> | null = null;
const DOM_CHANGE_THROTTLE_MS = 250;

function handleDomChange(): void {
  const newProductId = siteConfig.extractProductId();
  if (newProductId !== currentProductId) {
    // Use waitForOffersAndInitialize which calls initialize() once offers are present.
    // Do NOT call initialize() directly here to avoid a race condition where both
    // run concurrently (initialize would start before offers are in the DOM).
    waitForOffersAndInitialize();
    return;
  }

  const currentCount = document.querySelectorAll(siteConfig.offerLinkSelector).length;
  if (currentCount > knownOfferCount) {
    knownOfferCount = currentCount;
    refreshHighlights();
  }
}

// Coalesce mutation bursts: schedule one handleDomChange per throttle window
// instead of running DOM queries + sendMessage on every mutation record.
const domObserver = new MutationObserver(() => {
  if (domChangeTimer !== null) return;
  domChangeTimer = setTimeout(() => {
    domChangeTimer = null;
    handleDomChange();
  }, DOM_CHANGE_THROTTLE_MS);
});

domObserver.observe(document.body, {
  childList: true,
  subtree: true,
});

const storageChangeListener = async (changes: Record<string, chrome.storage.StorageChange>, areaName: string): Promise<void> => {
  if (areaName !== "session") return;
  if (!changes[siteConfig.storageKey]) return;

  const items: ProductItem[] = changes[siteConfig.storageKey].newValue ?? [];
  renderItemList(items);

  const productId = siteConfig.extractProductId();
  if (!productId) return;

  updateAddButtonState(items);

  const currentShops = scrapeShopNames();
  const matching = computeMatchingShops(items, currentShops, productId);
  highlightMatchingShops(matching);
};

chrome.storage.onChanged.addListener(storageChangeListener);

// Cleanup observers and listeners when the page is unloaded to prevent memory leaks
window.addEventListener("unload", () => {
  domObserver.disconnect();
  if (domChangeTimer !== null) clearTimeout(domChangeTimer);
  chrome.storage.onChanged.removeListener(storageChangeListener);
});

// Use waitForOffersAndInitialize as the sole entry point: it calls initialize()
// as soon as offers are detected, or immediately if they're already present.
// Calling initialize() separately would race against waitForOffersAndInitialize.
waitForOffersAndInitialize();

}

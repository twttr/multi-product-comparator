import type { ProductItem, MessageRequest, SiteConfig } from "./types.js";
import type { Strings } from "./site-configs.js";
import { computeMatchingShops } from "./matching.js";

export const DOM_CHANGE_THROTTLE_MS = 250;
export const OFFER_WAIT_TIMEOUT_MS = 10000;

export interface ContentController {
  start: () => void;
  stop: () => void;
  initialize: () => Promise<void>;
  waitForOffersAndInitialize: () => void;
  handleDomChange: () => void;
  handleMutations: () => void;
  refreshHighlights: () => Promise<void>;
  storageChangeListener: (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ) => Promise<void>;
}

export function createContentController(
  siteConfig: SiteConfig,
  strings: Strings
): ContentController {
  let currentProductId: string | null | undefined;
  let isInitializing = false;
  let knownOfferCount = 0;
  let domChangeTimer: ReturnType<typeof setTimeout> | null = null;

  function scrapeShopNames(): string[] {
    const offerLinks = document.querySelectorAll(siteConfig.offerLinkSelector);
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

    [...items]
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
        removeBtn.textContent = "×";
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
    const isAdded = items.some((item) => item.productId === currentProductId);
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

    const offerLinks = document.querySelectorAll(siteConfig.offerLinkSelector);
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
    knownOfferCount = document.querySelectorAll(
      siteConfig.offerLinkSelector
    ).length;

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
      const matching = computeMatchingShops(updatedItems, shopNames, productId);
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

    setTimeout(() => offerObserver.disconnect(), OFFER_WAIT_TIMEOUT_MS);
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
      console.error(
        "[multi-product-comparator] refreshHighlights getItems failed:",
        err
      );
      return;
    }
    const currentShops = scrapeShopNames();
    const matching = computeMatchingShops(items, currentShops, productId);
    highlightMatchingShops(matching);
  }

  function handleDomChange(): void {
    const newProductId = siteConfig.extractProductId();
    if (newProductId !== currentProductId) {
      // Use waitForOffersAndInitialize which calls initialize() once offers are present.
      // Do NOT call initialize() directly here to avoid a race condition where both
      // run concurrently (initialize would start before offers are in the DOM).
      waitForOffersAndInitialize();
      return;
    }

    const currentCount = document.querySelectorAll(
      siteConfig.offerLinkSelector
    ).length;
    if (currentCount > knownOfferCount) {
      knownOfferCount = currentCount;
      refreshHighlights();
    }
  }

  // Coalesce mutation bursts: schedule one handleDomChange per throttle window
  // instead of running DOM queries + sendMessage on every mutation record.
  function handleMutations(): void {
    if (domChangeTimer !== null) return;
    domChangeTimer = setTimeout(() => {
      domChangeTimer = null;
      handleDomChange();
    }, DOM_CHANGE_THROTTLE_MS);
  }

  const domObserver = new MutationObserver(handleMutations);

  const storageChangeListener = async (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ): Promise<void> => {
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

  function start(): void {
    domObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
    chrome.storage.onChanged.addListener(storageChangeListener);
    // On product pages without standard offer markup (e.g. idealo's ?local
    // view) waitForOffersAndInitialize never fires — show the panel anyway.
    // The add button stays hidden because extractProductId returns null, and
    // the isInitializing guard resolves the race if offers arrive mid-call.
    if (siteConfig.isProductPage?.()) {
      initialize();
    }
    waitForOffersAndInitialize();
  }

  function stop(): void {
    domObserver.disconnect();
    if (domChangeTimer !== null) {
      clearTimeout(domChangeTimer);
      domChangeTimer = null;
    }
    chrome.storage.onChanged.removeListener(storageChangeListener);
  }

  return {
    start,
    stop,
    initialize,
    waitForOffersAndInitialize,
    handleDomChange,
    handleMutations,
    refreshHighlights,
    storageChangeListener,
  };
}

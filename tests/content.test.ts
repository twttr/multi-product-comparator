import { describe, it, expect, beforeEach } from "vitest";
import type { ProductItem } from "../src/types.js";

const OFFER_LINK_SELECTOR =
  ".productOffers-listItemOfferLink[data-shop-name]";
const SHOP_NAME_ATTR = "data-shop-name";
const OFFER_ROW_SELECTOR = ".productOffers-listItem";
function extractProductIdFromDom(): string | null {
  const firstOffer = document.querySelector<HTMLAnchorElement>(
    OFFER_LINK_SELECTOR
  );
  if (!firstOffer) return null;
  const url = new URL(firstOffer.href, window.location.origin);
  return url.searchParams.get("productid");
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

function createItem(shopNames: string[]): ProductItem {
  return {
    productId: String(Math.random()),
    productName: "Test",
    productUrl: "https://idealo.de/test",
    shopNames,
    addedAt: Date.now(),
  };
}

describe("extractProductIdFromDom", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("extracts product ID from idealo.de offer link", () => {
    const link = document.createElement("a");
    link.className = "productOffers-listItemOfferLink";
    link.setAttribute("data-shop-name", "testshop");
    link.href = "https://www.idealo.de/relocator/relocate?productid=207644441&sid=123";
    document.body.appendChild(link);
    expect(extractProductIdFromDom()).toBe("207644441");
  });

  it("extracts product ID from idealo.fr offer link", () => {
    const link = document.createElement("a");
    link.className = "productOffers-listItemOfferLink";
    link.setAttribute("data-shop-name", "testshop");
    link.href = "https://www.idealo.fr/relocator/relocate?productid=205569277&sid=456";
    document.body.appendChild(link);
    expect(extractProductIdFromDom()).toBe("205569277");
  });

  it("returns null when no offer links exist", () => {
    expect(extractProductIdFromDom()).toBeNull();
  });
});

describe("computeMatchingShops", () => {
  it("returns empty set when no stored items", () => {
    const result = computeMatchingShops([], ["shopA", "shopB"]);
    expect(result.size).toBe(0);
  });

  it("highlights with one stored item on a different page", () => {
    const items = [createItem(["shopA", "shopB", "shopC"])];
    const currentShops = ["shopA", "shopB", "shopD"];
    const result = computeMatchingShops(items, currentShops);
    expect(result).toEqual(new Set(["shopA", "shopB"]));
  });

  it("returns empty set when current product is the only stored item", () => {
    const item = createItem(["shopA", "shopB", "shopC"]);
    const currentShops = ["shopA", "shopB", "shopD"];
    const result = computeMatchingShops([item], currentShops, item.productId);
    expect(result.size).toBe(0);
  });

  it("finds shops present in ALL stored items and current page", () => {
    const items = [
      createItem(["shopA", "shopB", "shopC"]),
      createItem(["shopA", "shopC", "shopD"]),
    ];
    const currentShops = ["shopA", "shopB", "shopC", "shopE"];
    const result = computeMatchingShops(items, currentShops);
    expect(result).toEqual(new Set(["shopA", "shopC"]));
  });

  it("returns empty set when no shop appears in all items", () => {
    const items = [
      createItem(["shopA", "shopB"]),
      createItem(["shopC", "shopD"]),
    ];
    const currentShops = ["shopA", "shopC", "shopE"];
    const result = computeMatchingShops(items, currentShops);
    expect(result.size).toBe(0);
  });

  it("returns empty set when current page has no matching shops", () => {
    const items = [createItem(["shopA", "shopB"])];
    const currentShops = ["shopC", "shopD"];
    const result = computeMatchingShops(items, currentShops);
    expect(result.size).toBe(0);
  });

  it("handles single shop match across three items", () => {
    const items = [
      createItem(["shopA", "shopB"]),
      createItem(["shopA", "shopC"]),
      createItem(["shopA", "shopD"]),
    ];
    const currentShops = ["shopA", "shopE"];
    const result = computeMatchingShops(items, currentShops);
    expect(result).toEqual(new Set(["shopA"]));
  });

  it("handles empty current shops list", () => {
    const items = [createItem(["shopA", "shopB"])];
    const result = computeMatchingShops(items, []);
    expect(result.size).toBe(0);
  });
});

describe("DOM scraping", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  function createOfferRow(shopName: string): void {
    const row = document.createElement("div");
    row.className = "productOffers-listItem";
    const link = document.createElement("a");
    link.className = "productOffers-listItemOfferLink";
    link.setAttribute("data-shop-name", shopName);
    link.href = "#";
    row.appendChild(link);
    document.body.appendChild(row);
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

  function highlightMatchingShops(matchingShopNames: Set<string>): void {
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

  it("scrapes shop names from offer links", () => {
    createOfferRow("shopA");
    createOfferRow("shopB");
    createOfferRow("shopC");
    const names = scrapeShopNames();
    expect(names).toEqual(["shopA", "shopB", "shopC"]);
  });

  it("deduplicates shop names", () => {
    createOfferRow("shopA");
    createOfferRow("shopA");
    const names = scrapeShopNames();
    expect(names).toEqual(["shopA"]);
  });

  it("returns empty array when no offers exist", () => {
    const names = scrapeShopNames();
    expect(names).toEqual([]);
  });

  it("highlights matching shop rows", () => {
    createOfferRow("shopA");
    createOfferRow("shopB");
    createOfferRow("shopC");

    highlightMatchingShops(new Set(["shopA", "shopC"]));

    const rows = document.querySelectorAll(".productOffers-listItem");
    expect(rows[0].classList.contains("idealo-multi-highlight")).toBe(true);
    expect(rows[1].classList.contains("idealo-multi-highlight")).toBe(false);
    expect(rows[2].classList.contains("idealo-multi-highlight")).toBe(true);
  });

  it("does not highlight when no matches", () => {
    createOfferRow("shopA");
    highlightMatchingShops(new Set(["shopZ"]));

    const rows = document.querySelectorAll(".productOffers-listItem");
    expect(rows[0].classList.contains("idealo-multi-highlight")).toBe(false);
  });
});

const GEIZHALS_OFFER_LINK_SELECTOR = ".offer_bt[data-merchant-name]";
const GEIZHALS_OFFER_ROW_SELECTOR = ".offer";
const extractGeizhalsShopName = (el: Element) => el.getAttribute("data-merchant-name");

function extractGeizhalsProductId(pathname: string): string | null {
  const match = pathname.match(/-a(\d+)\.html/);
  return match ? match[1] : null;
}

describe("Geizhals product ID extraction", () => {
  it("extracts product ID from geizhals URL", () => {
    expect(extractGeizhalsProductId("/bomann-ksg-7291-a3573318.html")).toBe("3573318");
  });

  it("extracts product ID from URL with long path", () => {
    expect(extractGeizhalsProductId("/some/path/product-name-a1234567.html")).toBe("1234567");
  });

  it("returns null for non-matching URL", () => {
    expect(extractGeizhalsProductId("/some/other/page")).toBeNull();
  });

  it("returns null for URL without product ID pattern", () => {
    expect(extractGeizhalsProductId("/category/list.html")).toBeNull();
  });
});

describe("Geizhals DOM scraping", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  function createGeizhalsOfferRow(shopName: string): void {
    const row = document.createElement("div");
    row.className = "offer";
    const link = document.createElement("a");
    link.className = "offer_bt";
    link.setAttribute("data-merchant-name", shopName);
    link.href = "#";
    row.appendChild(link);
    document.body.appendChild(row);
  }

  function scrapeGeizhalsShopNames(): string[] {
    const offerLinks = document.querySelectorAll(GEIZHALS_OFFER_LINK_SELECTOR);
    const shopNames = new Set<string>();
    offerLinks.forEach((el) => {
      const shopName = extractGeizhalsShopName(el);
      if (shopName) shopNames.add(shopName);
    });
    return Array.from(shopNames);
  }

  function highlightGeizhalsMatchingShops(matchingShopNames: Set<string>): void {
    const offerLinks = document.querySelectorAll(GEIZHALS_OFFER_LINK_SELECTOR);
    offerLinks.forEach((el) => {
      const shopName = extractGeizhalsShopName(el);
      if (shopName && matchingShopNames.has(shopName)) {
        const row = el.closest(GEIZHALS_OFFER_ROW_SELECTOR);
        if (row) row.classList.add("idealo-multi-highlight");
      }
    });
  }

  it("scrapes shop names from geizhals offer links", () => {
    createGeizhalsOfferRow("Amazon");
    createGeizhalsOfferRow("MediaMarkt");
    createGeizhalsOfferRow("Saturn");
    const names = scrapeGeizhalsShopNames();
    expect(names).toEqual(["Amazon", "MediaMarkt", "Saturn"]);
  });

  it("deduplicates geizhals shop names", () => {
    createGeizhalsOfferRow("Amazon");
    createGeizhalsOfferRow("Amazon");
    const names = scrapeGeizhalsShopNames();
    expect(names).toEqual(["Amazon"]);
  });

  it("highlights matching geizhals shop rows", () => {
    createGeizhalsOfferRow("Amazon");
    createGeizhalsOfferRow("MediaMarkt");
    createGeizhalsOfferRow("Saturn");

    highlightGeizhalsMatchingShops(new Set(["Amazon", "Saturn"]));

    const rows = document.querySelectorAll(".offer");
    expect(rows[0].classList.contains("idealo-multi-highlight")).toBe(true);
    expect(rows[1].classList.contains("idealo-multi-highlight")).toBe(false);
    expect(rows[2].classList.contains("idealo-multi-highlight")).toBe(true);
  });

  it("does not highlight when no geizhals matches", () => {
    createGeizhalsOfferRow("Amazon");
    highlightGeizhalsMatchingShops(new Set(["Notebooksbilliger"]));

    const rows = document.querySelectorAll(".offer");
    expect(rows[0].classList.contains("idealo-multi-highlight")).toBe(false);
  });
});

const BILLIGER_OFFER_LINK_SELECTOR = "[data-offer-row] img[data-bde-image]";
const BILLIGER_OFFER_ROW_SELECTOR = "[data-offer-row]";
const extractBilligerShopName = (el: Element) =>
  el.getAttribute("alt")?.replace(/^Shop /, "") ?? null;

function extractBilligerProductId(pathname: string): string | null {
  const baseMatch = pathname.match(/\/(?:base)?products\/(\d+)/);
  if (baseMatch) return baseMatch[1];
  const htmlMatch = pathname.match(/(\d+)\.html$/);
  return htmlMatch ? htmlMatch[1] : null;
}

describe("Billiger product ID extraction", () => {
  it("extracts product ID from baseproducts URL", () => {
    expect(extractBilligerProductId("/baseproducts/109366-samsung-galaxy-s25-ultra-5g")).toBe("109366");
  });

  it("extracts product ID from products URL", () => {
    expect(extractBilligerProductId("/products/5048601426-apple-iphone-16-128-gb-ultramarin")).toBe("5048601426");
  });

  it("extracts product ID from produkt URL", () => {
    expect(extractBilligerProductId("/produkt/samsung-galaxy-s25-ultra-4373-5173800034.html")).toBe("5173800034");
  });

  it("returns null for non-matching URL", () => {
    expect(extractBilligerProductId("/kategorie/handys/")).toBeNull();
  });
});

describe("Billiger shop name extraction", () => {
  it("extracts shop name from alt attribute", () => {
    const img = document.createElement("img");
    img.setAttribute("alt", "Shop ebay.de");
    expect(extractBilligerShopName(img)).toBe("ebay.de");
  });

  it("handles shop name without prefix", () => {
    const img = document.createElement("img");
    img.setAttribute("alt", "Amazon");
    expect(extractBilligerShopName(img)).toBe("Amazon");
  });

  it("returns null when no alt attribute", () => {
    const img = document.createElement("img");
    expect(extractBilligerShopName(img)).toBeNull();
  });
});

describe("Billiger DOM scraping", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  function createBilligerOfferRow(shopName: string): void {
    const row = document.createElement("div");
    row.setAttribute("data-offer-row", "");
    const img = document.createElement("img");
    img.setAttribute("data-bde-image", "");
    img.setAttribute("alt", `Shop ${shopName}`);
    row.appendChild(img);
    document.body.appendChild(row);
  }

  function scrapeBilligerShopNames(): string[] {
    const offerLinks = document.querySelectorAll(BILLIGER_OFFER_LINK_SELECTOR);
    const shopNames = new Set<string>();
    offerLinks.forEach((el) => {
      const shopName = extractBilligerShopName(el);
      if (shopName) shopNames.add(shopName);
    });
    return Array.from(shopNames);
  }

  function highlightBilligerMatchingShops(matchingShopNames: Set<string>): void {
    const offerLinks = document.querySelectorAll(BILLIGER_OFFER_LINK_SELECTOR);
    offerLinks.forEach((el) => {
      const shopName = extractBilligerShopName(el);
      if (shopName && matchingShopNames.has(shopName)) {
        const row = el.closest(BILLIGER_OFFER_ROW_SELECTOR);
        if (row) row.classList.add("idealo-multi-highlight");
      }
    });
  }

  it("scrapes shop names from billiger offer rows", () => {
    createBilligerOfferRow("ebay.de");
    createBilligerOfferRow("Amazon");
    createBilligerOfferRow("MediaMarkt");
    const names = scrapeBilligerShopNames();
    expect(names).toEqual(["ebay.de", "Amazon", "MediaMarkt"]);
  });

  it("deduplicates billiger shop names", () => {
    createBilligerOfferRow("ebay.de");
    createBilligerOfferRow("ebay.de");
    const names = scrapeBilligerShopNames();
    expect(names).toEqual(["ebay.de"]);
  });

  it("highlights matching billiger shop rows", () => {
    createBilligerOfferRow("ebay.de");
    createBilligerOfferRow("Amazon");
    createBilligerOfferRow("MediaMarkt");

    highlightBilligerMatchingShops(new Set(["ebay.de", "MediaMarkt"]));

    const rows = document.querySelectorAll("[data-offer-row]");
    expect(rows[0].classList.contains("idealo-multi-highlight")).toBe(true);
    expect(rows[1].classList.contains("idealo-multi-highlight")).toBe(false);
    expect(rows[2].classList.contains("idealo-multi-highlight")).toBe(true);
  });

  it("does not highlight when no billiger matches", () => {
    createBilligerOfferRow("ebay.de");
    highlightBilligerMatchingShops(new Set(["Saturn"]));

    const rows = document.querySelectorAll("[data-offer-row]");
    expect(rows[0].classList.contains("idealo-multi-highlight")).toBe(false);
  });
});

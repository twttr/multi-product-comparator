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

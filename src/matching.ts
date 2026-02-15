import type { ProductItem } from "./types.js";

export function computeMatchingShops(
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

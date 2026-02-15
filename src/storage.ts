import type { ProductItem } from "./types.js";

export async function getItems(storageKey: string): Promise<ProductItem[]> {
  const result = await chrome.storage.session.get(storageKey);
  return result[storageKey] ?? [];
}

export async function setItems(storageKey: string, items: ProductItem[]): Promise<void> {
  await chrome.storage.session.set({ [storageKey]: items });
}

export async function addItem(storageKey: string, item: ProductItem): Promise<ProductItem[]> {
  const items = await getItems(storageKey);
  const existingIndex = items.findIndex((i) => i.productId === item.productId);

  if (existingIndex >= 0) {
    items[existingIndex] = item;
  } else {
    items.push(item);
  }

  await setItems(storageKey, items);
  return items;
}

export async function removeItem(storageKey: string, productId: string): Promise<ProductItem[]> {
  const items = await getItems(storageKey);
  const filtered = items.filter((item) => item.productId !== productId);
  await setItems(storageKey, filtered);
  return filtered;
}

export async function clearAll(storageKey: string): Promise<void> {
  await chrome.storage.session.remove(storageKey);
}

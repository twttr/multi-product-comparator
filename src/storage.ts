import type { ProductItem } from "./types.js";

const STORAGE_KEY = "items";

export async function getItems(): Promise<ProductItem[]> {
  const result = await chrome.storage.session.get(STORAGE_KEY);
  return result[STORAGE_KEY] ?? [];
}

export async function setItems(items: ProductItem[]): Promise<void> {
  await chrome.storage.session.set({ [STORAGE_KEY]: items });
}

export async function addItem(item: ProductItem): Promise<ProductItem[]> {
  const items = await getItems();
  const existingIndex = items.findIndex((i) => i.productId === item.productId);

  if (existingIndex >= 0) {
    items[existingIndex] = item;
  } else {
    items.push(item);
  }

  await setItems(items);
  return items;
}

export async function removeItem(productId: string): Promise<ProductItem[]> {
  const items = await getItems();
  const filtered = items.filter((item) => item.productId !== productId);
  await setItems(filtered);
  return filtered;
}

export async function clearAll(): Promise<void> {
  await chrome.storage.session.clear();
}

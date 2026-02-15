export interface ProductItem {
  productId: string;
  productName: string;
  productUrl: string;
  shopNames: string[];
  addedAt: number;
}

export interface SiteConfig {
  storageKey: string;
  offerLinkSelector: string;
  shopNameAttr: string;
  offerRowSelector: string;
  extractProductId: () => string | null;
}

export type MessageRequest =
  | { action: "getItems"; storageKey: string }
  | { action: "addItem"; storageKey: string; item: ProductItem }
  | { action: "removeItem"; storageKey: string; productId: string }
  | { action: "clearAll"; storageKey: string };

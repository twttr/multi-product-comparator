export interface ProductItem {
  productId: string;
  productName: string;
  productUrl: string;
  shopNames: string[];
  addedAt: number;
}

export type MessageRequest =
  | { action: "getItems" }
  | { action: "addItem"; item: ProductItem }
  | { action: "removeItem"; productId: string }
  | { action: "clearAll" };

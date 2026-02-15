import { describe, it, expect, beforeEach } from "vitest";
import { getItems, addItem, removeItem, clearAll } from "../src/storage.js";
import { resetSessionStore } from "./setup.js";

beforeEach(() => {
  resetSessionStore();
});

describe("getItems", () => {
  it("returns empty array when no items stored", async () => {
    const items = await getItems();
    expect(items).toEqual([]);
  });

  it("returns stored items", async () => {
    const item = createTestItem("1", "Product 1", ["shopA", "shopB"]);
    await addItem(item);
    const items = await getItems();
    expect(items).toHaveLength(1);
    expect(items[0].productId).toBe("1");
  });
});

describe("addItem", () => {
  it("adds a new item", async () => {
    const item = createTestItem("1", "Product 1", ["shopA"]);
    const result = await addItem(item);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(item);
  });

  it("adds multiple items", async () => {
    await addItem(createTestItem("1", "Product 1", ["shopA"]));
    const result = await addItem(
      createTestItem("2", "Product 2", ["shopB"])
    );
    expect(result).toHaveLength(2);
  });

  it("replaces existing item with same productId", async () => {
    await addItem(createTestItem("1", "Product 1", ["shopA"]));
    const updated = createTestItem("1", "Product 1 Updated", [
      "shopA",
      "shopB",
    ]);
    const result = await addItem(updated);
    expect(result).toHaveLength(1);
    expect(result[0].productName).toBe("Product 1 Updated");
    expect(result[0].shopNames).toEqual(["shopA", "shopB"]);
  });
});

describe("removeItem", () => {
  it("removes an existing item", async () => {
    await addItem(createTestItem("1", "Product 1", ["shopA"]));
    await addItem(createTestItem("2", "Product 2", ["shopB"]));
    const result = await removeItem("1");
    expect(result).toHaveLength(1);
    expect(result[0].productId).toBe("2");
  });

  it("returns empty array when removing last item", async () => {
    await addItem(createTestItem("1", "Product 1", ["shopA"]));
    const result = await removeItem("1");
    expect(result).toEqual([]);
  });

  it("handles removing non-existent item gracefully", async () => {
    await addItem(createTestItem("1", "Product 1", ["shopA"]));
    const result = await removeItem("999");
    expect(result).toHaveLength(1);
  });
});

describe("clearAll", () => {
  it("clears all items", async () => {
    await addItem(createTestItem("1", "Product 1", ["shopA"]));
    await addItem(createTestItem("2", "Product 2", ["shopB"]));
    await clearAll();
    const items = await getItems();
    expect(items).toEqual([]);
  });
});

function createTestItem(
  productId: string,
  productName: string,
  shopNames: string[]
) {
  return {
    productId,
    productName,
    productUrl: `https://www.idealo.de/preisvergleich/OffersOfProduct/${productId}_-test.html`,
    shopNames,
    addedAt: Date.now(),
  };
}

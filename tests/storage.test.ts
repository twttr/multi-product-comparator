import { describe, it, expect, beforeEach } from "vitest";
import { getItems, addItem, removeItem, clearAll } from "../src/storage.js";
import { resetSessionStore } from "./setup.js";

const KEY = "items_test";

beforeEach(() => {
  resetSessionStore();
});

describe("getItems", () => {
  it("returns empty array when no items stored", async () => {
    const items = await getItems(KEY);
    expect(items).toEqual([]);
  });

  it("returns stored items", async () => {
    const item = createTestItem("1", "Product 1", ["shopA", "shopB"]);
    await addItem(KEY, item);
    const items = await getItems(KEY);
    expect(items).toHaveLength(1);
    expect(items[0].productId).toBe("1");
  });

  it("isolates items by storage key", async () => {
    await addItem("items_idealo", createTestItem("1", "Idealo Product", ["shopA"]));
    await addItem("items_geizhals", createTestItem("2", "Geizhals Product", ["shopB"]));
    const idealoItems = await getItems("items_idealo");
    const geizhalsItems = await getItems("items_geizhals");
    expect(idealoItems).toHaveLength(1);
    expect(idealoItems[0].productId).toBe("1");
    expect(geizhalsItems).toHaveLength(1);
    expect(geizhalsItems[0].productId).toBe("2");
  });
});

describe("addItem", () => {
  it("adds a new item", async () => {
    const item = createTestItem("1", "Product 1", ["shopA"]);
    const result = await addItem(KEY, item);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(item);
  });

  it("adds multiple items", async () => {
    await addItem(KEY, createTestItem("1", "Product 1", ["shopA"]));
    const result = await addItem(
      KEY,
      createTestItem("2", "Product 2", ["shopB"])
    );
    expect(result).toHaveLength(2);
  });

  it("replaces existing item with same productId", async () => {
    await addItem(KEY, createTestItem("1", "Product 1", ["shopA"]));
    const updated = createTestItem("1", "Product 1 Updated", [
      "shopA",
      "shopB",
    ]);
    const result = await addItem(KEY, updated);
    expect(result).toHaveLength(1);
    expect(result[0].productName).toBe("Product 1 Updated");
    expect(result[0].shopNames).toEqual(["shopA", "shopB"]);
  });
});

describe("removeItem", () => {
  it("removes an existing item", async () => {
    await addItem(KEY, createTestItem("1", "Product 1", ["shopA"]));
    await addItem(KEY, createTestItem("2", "Product 2", ["shopB"]));
    const result = await removeItem(KEY, "1");
    expect(result).toHaveLength(1);
    expect(result[0].productId).toBe("2");
  });

  it("returns empty array when removing last item", async () => {
    await addItem(KEY, createTestItem("1", "Product 1", ["shopA"]));
    const result = await removeItem(KEY, "1");
    expect(result).toEqual([]);
  });

  it("handles removing non-existent item gracefully", async () => {
    await addItem(KEY, createTestItem("1", "Product 1", ["shopA"]));
    const result = await removeItem(KEY, "999");
    expect(result).toHaveLength(1);
  });
});

describe("clearAll", () => {
  it("clears items for a specific key", async () => {
    await addItem(KEY, createTestItem("1", "Product 1", ["shopA"]));
    await addItem(KEY, createTestItem("2", "Product 2", ["shopB"]));
    await clearAll(KEY);
    const items = await getItems(KEY);
    expect(items).toEqual([]);
  });

  it("does not clear items from other keys", async () => {
    await addItem("items_idealo", createTestItem("1", "Product 1", ["shopA"]));
    await addItem("items_geizhals", createTestItem("2", "Product 2", ["shopB"]));
    await clearAll("items_idealo");
    const idealoItems = await getItems("items_idealo");
    const geizhalsItems = await getItems("items_geizhals");
    expect(idealoItems).toEqual([]);
    expect(geizhalsItems).toHaveLength(1);
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

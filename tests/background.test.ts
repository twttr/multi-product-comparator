import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetSessionStore } from "./setup.js";

let handleMessage: (message: unknown) => Promise<unknown>;

beforeEach(async () => {
  resetSessionStore();
  vi.resetModules();

  const { runtimeMock } = await import("./setup.js");
  runtimeMock.onMessage.addListener.mockClear();

  await import("../src/background.js");

  const addListenerCall = runtimeMock.onMessage.addListener.mock.calls[0];
  const listener = addListenerCall[0];

  handleMessage = (message: unknown) =>
    new Promise((resolve) => {
      listener(message, {}, resolve);
    });
});

describe("background message handler", () => {
  it("returns empty array for getItems when no items stored", async () => {
    const result = await handleMessage({ action: "getItems" });
    expect(result).toEqual([]);
  });

  it("adds an item and returns updated list", async () => {
    const item = {
      productId: "123",
      productName: "Test Product",
      productUrl: "https://idealo.de/test",
      shopNames: ["shopA", "shopB"],
      addedAt: Date.now(),
    };
    const result = await handleMessage({ action: "addItem", item });
    expect(result).toHaveLength(1);
    expect((result as Array<unknown>)[0]).toEqual(item);
  });

  it("retrieves previously added items", async () => {
    const item = {
      productId: "123",
      productName: "Test",
      productUrl: "https://idealo.de/test",
      shopNames: ["shopA"],
      addedAt: Date.now(),
    };
    await handleMessage({ action: "addItem", item });
    const result = await handleMessage({ action: "getItems" });
    expect(result).toHaveLength(1);
  });

  it("removes an item by productId", async () => {
    const item1 = {
      productId: "1",
      productName: "Product 1",
      productUrl: "https://idealo.de/1",
      shopNames: ["shopA"],
      addedAt: Date.now(),
    };
    const item2 = {
      productId: "2",
      productName: "Product 2",
      productUrl: "https://idealo.de/2",
      shopNames: ["shopB"],
      addedAt: Date.now(),
    };
    await handleMessage({ action: "addItem", item: item1 });
    await handleMessage({ action: "addItem", item: item2 });

    const result = await handleMessage({
      action: "removeItem",
      productId: "1",
    });
    expect(result).toHaveLength(1);
    expect((result as Array<{ productId: string }>)[0].productId).toBe("2");
  });

  it("clears all items", async () => {
    const item = {
      productId: "1",
      productName: "Product",
      productUrl: "https://idealo.de/1",
      shopNames: ["shopA"],
      addedAt: Date.now(),
    };
    await handleMessage({ action: "addItem", item });
    const result = await handleMessage({ action: "clearAll" });
    expect(result).toEqual([]);
  });

  it("returns null for unknown action", async () => {
    const result = await handleMessage({ action: "unknownAction" });
    expect(result).toBeNull();
  });
});

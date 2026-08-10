import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { ProductItem } from "../src/types.js";
import {
  createContentController,
  DOM_CHANGE_THROTTLE_MS,
  type ContentController,
} from "../src/content-controller.js";
import { SITE_CONFIG_MAP, type Strings } from "../src/site-configs.js";
import { runtimeMock, resetSessionStore } from "./setup.js";

const TEST_STRINGS: Strings = {
  addToCompare: "Add to Compare",
  added: "Added ✓",
  clearList: "Clear List",
  remove: "Remove",
};

function createOfferRow(shopName: string, productId = "123"): void {
  const row = document.createElement("li");
  row.className = "productOffers-listItem";
  const link = document.createElement("a");
  link.className = "productOffers-listItemOfferLink";
  link.setAttribute("data-shop-name", shopName);
  link.href = `https://www.idealo.de/offer?productid=${productId}`;
  row.appendChild(link);
  document.body.appendChild(row);
}

function makeItem(productId: string, shopNames: string[]): ProductItem {
  return {
    productId,
    productName: `Product ${productId}`,
    productUrl: `https://www.idealo.de/p/${productId}`,
    shopNames,
    addedAt: Date.now(),
  };
}

async function flushAsync(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function drainThrottleWindow(): Promise<void> {
  await new Promise((resolve) =>
    setTimeout(resolve, DOM_CHANGE_THROTTLE_MS + 50)
  );
}

let controller: ContentController;

beforeEach(() => {
  resetSessionStore();
  document.body.innerHTML = "";
  runtimeMock.sendMessage.mockReset();
  runtimeMock.sendMessage.mockResolvedValue([]);
  controller = createContentController(SITE_CONFIG_MAP.idealo, TEST_STRINGS);
});

afterEach(() => {
  controller.stop();
  vi.useRealTimers();
});

describe("initialize", () => {
  it("creates the panel with add button once offers are present", async () => {
    createOfferRow("shopA");
    controller.start();
    await flushAsync();

    expect(document.getElementById("idealo-multi-panel")).not.toBeNull();
    const addBtn = document.getElementById("idealo-multi-add-btn");
    expect(addBtn?.textContent).toBe(TEST_STRINGS.addToCompare);
    expect(runtimeMock.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ action: "getItems", storageKey: "items_idealo" })
    );
  });

  it("renders stored items and highlights shops carrying all products", async () => {
    createOfferRow("shopA");
    createOfferRow("shopB");
    runtimeMock.sendMessage.mockResolvedValue([
      makeItem("999", ["shopA"]),
    ]);

    controller.start();
    await flushAsync();

    const rows = document.querySelectorAll(".idealo-multi-item-row");
    expect(rows).toHaveLength(1);
    const highlighted = document.querySelectorAll(".idealo-multi-highlight");
    expect(highlighted).toHaveLength(1);
    expect(
      highlighted[0].querySelector("[data-shop-name]")?.getAttribute("data-shop-name")
    ).toBe("shopA");
  });

  it("marks add button as added when current product already stored", async () => {
    createOfferRow("shopA");
    runtimeMock.sendMessage.mockResolvedValue([makeItem("123", ["shopA"])]);

    controller.start();
    await flushAsync();

    const addBtn = document.getElementById("idealo-multi-add-btn");
    expect(addBtn?.textContent).toBe(TEST_STRINGS.added);
    expect(addBtn?.classList.contains("idealo-multi-added")).toBe(true);
  });
});

describe("product page without standard offers", () => {
  it("shows panel with hidden add button on offer-less product pages", async () => {
    window.history.pushState({}, "", "/preisvergleich/OffersOfProduct/12345_-foo.html?local");
    controller.start();
    await flushAsync();
    window.history.pushState({}, "", "/");

    expect(document.getElementById("idealo-multi-panel")).not.toBeNull();
    const addBtn = document.getElementById(
      "idealo-multi-add-btn"
    ) as HTMLButtonElement;
    expect(addBtn.style.display).toBe("none");
  });

  it("does not show panel on non-product pages without offers", async () => {
    controller.start();
    await flushAsync();

    expect(document.getElementById("idealo-multi-panel")).toBeNull();
  });
});

describe("mutation throttling", () => {
  it("coalesces a mutation burst into a single handleDomChange", async () => {
    createOfferRow("shopA");
    controller.start();
    await flushAsync();
    await drainThrottleWindow();

    runtimeMock.sendMessage.mockClear();
    vi.useFakeTimers();
    createOfferRow("shopB");
    createOfferRow("shopC");

    for (let i = 0; i < 20; i++) {
      controller.handleMutations();
    }
    vi.advanceTimersByTime(DOM_CHANGE_THROTTLE_MS);
    vi.useRealTimers();
    await flushAsync();

    const getItemsCalls = runtimeMock.sendMessage.mock.calls.filter(
      ([msg]) => (msg as { action: string }).action === "getItems"
    );
    expect(getItemsCalls).toHaveLength(1);
  });

  it("does nothing when offer count is unchanged", async () => {
    createOfferRow("shopA");
    controller.start();
    await flushAsync();
    await drainThrottleWindow();

    runtimeMock.sendMessage.mockClear();

    vi.useFakeTimers();
    controller.handleMutations();
    vi.advanceTimersByTime(DOM_CHANGE_THROTTLE_MS);
    vi.useRealTimers();
    await flushAsync();

    expect(runtimeMock.sendMessage).not.toHaveBeenCalled();
  });
});

describe("storageChangeListener", () => {
  it("re-renders list and button state on session storage change", async () => {
    createOfferRow("shopA");
    controller.start();
    await flushAsync();

    await controller.storageChangeListener(
      { items_idealo: { newValue: [makeItem("123", ["shopA"])] } },
      "session"
    );

    const rows = document.querySelectorAll(".idealo-multi-item-row");
    expect(rows).toHaveLength(1);
    const addBtn = document.getElementById("idealo-multi-add-btn");
    expect(addBtn?.textContent).toBe(TEST_STRINGS.added);
  });

  it("ignores changes from other storage areas", async () => {
    createOfferRow("shopA");
    controller.start();
    await flushAsync();

    await controller.storageChangeListener(
      { items_idealo: { newValue: [makeItem("123", ["shopA"])] } },
      "local"
    );

    expect(document.querySelectorAll(".idealo-multi-item-row")).toHaveLength(0);
  });

  it("ignores changes for other storage keys", async () => {
    createOfferRow("shopA");
    controller.start();
    await flushAsync();

    await controller.storageChangeListener(
      { items_geizhals: { newValue: [makeItem("123", ["shopA"])] } },
      "session"
    );

    expect(document.querySelectorAll(".idealo-multi-item-row")).toHaveLength(0);
  });
});

describe("add button", () => {
  it("adds current product and updates UI on click", async () => {
    createOfferRow("shopA");
    createOfferRow("shopB");
    controller.start();
    await flushAsync();

    runtimeMock.sendMessage.mockImplementation(async (msg: { action: string }) => {
      if (msg.action === "addItem") {
        return [makeItem("123", ["shopA", "shopB"])];
      }
      return [];
    });

    const addBtn = document.getElementById(
      "idealo-multi-add-btn"
    ) as HTMLButtonElement;
    addBtn.click();
    await flushAsync();

    expect(runtimeMock.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "addItem",
        storageKey: "items_idealo",
        item: expect.objectContaining({
          productId: "123",
          shopNames: ["shopA", "shopB"],
        }),
      })
    );
    expect(addBtn.textContent).toBe(TEST_STRINGS.added);
    expect(document.querySelectorAll(".idealo-multi-item-row")).toHaveLength(1);
  });
});

describe("stop", () => {
  it("clears pending throttle timer and detaches listeners", async () => {
    createOfferRow("shopA");
    controller.start();
    await flushAsync();
    await drainThrottleWindow();

    runtimeMock.sendMessage.mockClear();
    vi.useFakeTimers();
    createOfferRow("shopB");

    controller.handleMutations();
    controller.stop();
    vi.advanceTimersByTime(DOM_CHANGE_THROTTLE_MS * 2);
    vi.useRealTimers();
    await flushAsync();

    expect(runtimeMock.sendMessage).not.toHaveBeenCalled();
  });
});

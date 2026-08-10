import { describe, it, expect } from "vitest";
import { sanitizeProductUrl } from "../src/sanitize.js";

describe("sanitizeProductUrl", () => {
  it("allows https URLs", () => {
    expect(sanitizeProductUrl("https://idealo.de/product/123")).toBe(
      "https://idealo.de/product/123"
    );
  });

  it("allows http URLs", () => {
    expect(sanitizeProductUrl("http://geizhals.de/a123.html")).toBe(
      "http://geizhals.de/a123.html"
    );
  });

  it("rejects javascript: URIs", () => {
    expect(sanitizeProductUrl("javascript:alert(1)")).toBeNull();
  });

  it("rejects data: URIs", () => {
    expect(sanitizeProductUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
  });

  it("rejects chrome-extension: URIs", () => {
    expect(sanitizeProductUrl("chrome-extension://abc/popup.html")).toBeNull();
  });

  it("rejects invalid URLs", () => {
    expect(sanitizeProductUrl("not a url")).toBeNull();
  });

  it("rejects empty string", () => {
    expect(sanitizeProductUrl("")).toBeNull();
  });
});

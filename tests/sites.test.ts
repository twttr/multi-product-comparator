import { describe, it, expect } from "vitest";
import { detectSiteKey, storageKeyFromHostname } from "../src/sites.js";

describe("detectSiteKey", () => {
  it("detects idealo.de", () => {
    expect(detectSiteKey("www.idealo.de")).toBe("idealo");
  });

  it("detects idealo.fr", () => {
    expect(detectSiteKey("www.idealo.fr")).toBe("idealo");
  });

  it("detects idealo.co.uk", () => {
    expect(detectSiteKey("www.idealo.co.uk")).toBe("idealo");
  });

  it("detects idealo.at", () => {
    expect(detectSiteKey("www.idealo.at")).toBe("idealo");
  });

  it("detects idealo.es", () => {
    expect(detectSiteKey("www.idealo.es")).toBe("idealo");
  });

  it("detects idealo.it", () => {
    expect(detectSiteKey("www.idealo.it")).toBe("idealo");
  });

  it("detects geizhals.de", () => {
    expect(detectSiteKey("geizhals.de")).toBe("geizhals");
  });

  it("detects geizhals.at", () => {
    expect(detectSiteKey("geizhals.at")).toBe("geizhals");
  });

  it("detects geizhals.eu", () => {
    expect(detectSiteKey("geizhals.eu")).toBe("geizhals");
  });

  it("detects skinflint.co.uk", () => {
    expect(detectSiteKey("skinflint.co.uk")).toBe("geizhals");
  });

  it("detects cenowarka.pl", () => {
    expect(detectSiteKey("cenowarka.pl")).toBe("geizhals");
  });

  it("detects billiger.de", () => {
    expect(detectSiteKey("www.billiger.de")).toBe("billiger");
  });

  it("detects guenstiger.de", () => {
    expect(detectSiteKey("www.guenstiger.de")).toBe("guenstiger");
  });

  it("returns null for unknown hostname", () => {
    expect(detectSiteKey("www.amazon.de")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(detectSiteKey("")).toBeNull();
  });

  it("does not match similar-looking domains", () => {
    expect(detectSiteKey("notidealo.de")).toBe("idealo");
  });

  it("handles subdomains correctly", () => {
    expect(detectSiteKey("shop.idealo.de")).toBe("idealo");
  });
});

describe("storageKeyFromHostname", () => {
  it("returns items_idealo for idealo domains", () => {
    expect(storageKeyFromHostname("www.idealo.de")).toBe("items_idealo");
  });

  it("returns items_geizhals for geizhals domains", () => {
    expect(storageKeyFromHostname("geizhals.de")).toBe("items_geizhals");
  });

  it("returns items_geizhals for skinflint", () => {
    expect(storageKeyFromHostname("skinflint.co.uk")).toBe("items_geizhals");
  });

  it("returns items_geizhals for cenowarka", () => {
    expect(storageKeyFromHostname("cenowarka.pl")).toBe("items_geizhals");
  });

  it("returns items_billiger for billiger domains", () => {
    expect(storageKeyFromHostname("www.billiger.de")).toBe("items_billiger");
  });

  it("returns items_guenstiger for guenstiger domains", () => {
    expect(storageKeyFromHostname("www.guenstiger.de")).toBe("items_guenstiger");
  });

  it("returns null for unknown domains", () => {
    expect(storageKeyFromHostname("www.google.com")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(storageKeyFromHostname("")).toBeNull();
  });
});

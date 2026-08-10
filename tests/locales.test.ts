import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const LOCALES_DIR = join(__dirname, "../src/_locales");

function loadMessages(locale: string): Record<string, { message: string }> {
  const raw = readFileSync(join(LOCALES_DIR, locale, "messages.json"), "utf8");
  return JSON.parse(raw);
}

describe("locale completeness", () => {
  const locales = readdirSync(LOCALES_DIR);
  const referenceKeys = Object.keys(loadMessages("en")).sort();

  it("has at least the en reference locale", () => {
    expect(locales).toContain("en");
    expect(referenceKeys.length).toBeGreaterThan(0);
  });

  it.each(locales)("locale %s has exactly the same keys as en", (locale) => {
    const keys = Object.keys(loadMessages(locale)).sort();
    expect(keys).toEqual(referenceKeys);
  });

  it.each(locales)("locale %s has non-empty messages", (locale) => {
    const messages = loadMessages(locale);
    for (const [key, entry] of Object.entries(messages)) {
      expect(entry.message, `${locale}/${key}`).toBeTruthy();
    }
  });
});

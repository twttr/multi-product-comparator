export type SiteKey = "idealo" | "geizhals" | "billiger" | "guenstiger";

interface SiteMapping {
  key: SiteKey;
  hostPattern: RegExp;
  storageKey: string;
}

const SITE_MAPPINGS: SiteMapping[] = [
  { key: "idealo", hostPattern: /idealo\./, storageKey: "items_idealo" },
  { key: "geizhals", hostPattern: /geizhals\.|skinflint\.|cenowarka\./, storageKey: "items_geizhals" },
  { key: "billiger", hostPattern: /billiger\./, storageKey: "items_billiger" },
  { key: "guenstiger", hostPattern: /guenstiger\./, storageKey: "items_guenstiger" },
];

export const ALL_STORAGE_KEYS: string[] = SITE_MAPPINGS.map(
  (mapping) => mapping.storageKey
);

export function detectSiteKey(hostname: string): SiteKey | null {
  for (const mapping of SITE_MAPPINGS) {
    if (mapping.hostPattern.test(hostname)) return mapping.key;
  }
  return null;
}

export function storageKeyFromHostname(hostname: string): string | null {
  for (const mapping of SITE_MAPPINGS) {
    if (mapping.hostPattern.test(hostname)) return mapping.storageKey;
  }
  return null;
}

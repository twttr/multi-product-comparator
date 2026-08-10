import type { SiteConfig } from "./types.js";
import type { SiteKey } from "./sites.js";

const idealoConfig: SiteConfig = {
  storageKey: "items_idealo",
  offerLinkSelector:
    ".productOffers-listItemOfferLink[data-shop-name], .productOffers-listItemOfferCtaLeadout[data-shop-name]",
  extractShopName: (el) => el.getAttribute("data-shop-name"),
  offerRowSelector: ".productOffers-listItem",
  extractProductId: () => {
    const firstOffer = document.querySelector<HTMLAnchorElement>(
      idealoConfig.offerLinkSelector
    );
    if (firstOffer) {
      const url = new URL(firstOffer.href, window.location.origin);
      const productId = url.searchParams.get("productid");
      if (productId) return productId;
    }
    const pathMatch = window.location.pathname.match(/\/OffersOfProduct\/(\d+)/i);
    return pathMatch ? pathMatch[1] : null;
  },
  isProductPage: () => /\/OffersOfProduct\//i.test(window.location.pathname),
  fetchOfferShopNames: async () => {
    const response = await fetch(window.location.pathname, {
      credentials: "same-origin",
    });
    if (!response.ok) return [];
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const offers = doc.querySelectorAll(idealoConfig.offerLinkSelector);
    const shopNames = new Set<string>();
    offers.forEach((el) => {
      const shopName = idealoConfig.extractShopName(el);
      if (shopName) shopNames.add(shopName);
    });
    return Array.from(shopNames);
  },
};

const geizhalsConfig: SiteConfig = {
  storageKey: "items_geizhals",
  offerLinkSelector: ".offer_bt[data-merchant-name]",
  extractShopName: (el) => el.getAttribute("data-merchant-name"),
  offerRowSelector: ".offer",
  extractProductId: () => {
    const match = window.location.pathname.match(/-a(\d+)\.html/);
    return match ? match[1] : null;
  },
};

const billigerConfig: SiteConfig = {
  storageKey: "items_billiger",
  offerLinkSelector: "[data-offer-row] img[data-bde-image]",
  extractShopName: (el) => el.getAttribute("alt")?.replace(/^Shop /, "") ?? null,
  offerRowSelector: "[data-offer-row]",
  extractProductId: () => {
    const path = window.location.pathname;
    const baseMatch = path.match(/\/(?:base)?products\/(\d+)/);
    if (baseMatch) return baseMatch[1];
    const htmlMatch = path.match(/(\d+)\.html$/);
    return htmlMatch ? htmlMatch[1] : null;
  },
};

const guenstigerConfig: SiteConfig = {
  storageKey: "items_guenstiger",
  offerLinkSelector: ".offerListHoverContainer[data-sellertext]",
  extractShopName: (el) => el.getAttribute("data-sellertext"),
  offerRowSelector: ".offerListHoverContainer",
  extractProductId: () => {
    const firstOffer = document.querySelector<HTMLElement>(
      guenstigerConfig.offerLinkSelector
    );
    return firstOffer?.getAttribute("data-ptitle") ?? null;
  },
};

export const SITE_CONFIG_MAP: Record<SiteKey, SiteConfig> = {
  idealo: idealoConfig,
  geizhals: geizhalsConfig,
  billiger: billigerConfig,
  guenstiger: guenstigerConfig,
};

export interface Strings {
  addToCompare: string;
  added: string;
  clearList: string;
  remove: string;
}

const DE_STRINGS: Strings = { addToCompare: "Zum Vergleich hinzufügen", added: "Hinzugefügt ✓", clearList: "Liste leeren", remove: "Entfernen" };

const LOCALE_STRINGS: Record<string, Strings> = {
  de: DE_STRINGS,
  at: DE_STRINGS,
  fr: { addToCompare: "Ajouter au comparatif", added: "Ajouté ✓", clearList: "Vider la liste", remove: "Supprimer" },
  es: { addToCompare: "Añadir a la comparación", added: "Añadido ✓", clearList: "Vaciar lista", remove: "Eliminar" },
  it: { addToCompare: "Aggiungi al confronto", added: "Aggiunto ✓", clearList: "Svuota lista", remove: "Rimuovi" },
  uk: { addToCompare: "Add to Compare", added: "Added ✓", clearList: "Clear List", remove: "Remove" },
  pl: { addToCompare: "Dodaj do porównania", added: "Dodano ✓", clearList: "Wyczyść listę", remove: "Usuń" },
};

export function getStrings(hostname: string): Strings {
  if (hostname.endsWith(".co.uk")) return LOCALE_STRINGS.uk;
  if (hostname.match(/geizhals\.(de|eu)/)) return LOCALE_STRINGS.de;
  if (hostname.match(/geizhals\.at/)) return LOCALE_STRINGS.at;
  if (hostname.match(/cenowarka\./)) return LOCALE_STRINGS.pl;
  if (hostname.match(/billiger\./)) return LOCALE_STRINGS.de;
  if (hostname.match(/guenstiger\./)) return LOCALE_STRINGS.de;
  const tld = hostname.split(".").pop() ?? "";
  return LOCALE_STRINGS[tld] ?? LOCALE_STRINGS.uk;
}

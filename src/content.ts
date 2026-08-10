import { detectSiteKey } from "./sites.js";
import { SITE_CONFIG_MAP, getStrings } from "./site-configs.js";
import { createContentController } from "./content-controller.js";

const siteKey = detectSiteKey(window.location.hostname);
if (siteKey) {
  const controller = createContentController(
    SITE_CONFIG_MAP[siteKey],
    getStrings(window.location.hostname)
  );

  controller.start();

  window.addEventListener("pagehide", () => {
    controller.stop();
  });
}

<p align="center">
  <img src="src/icons/icon128.png" width="96" height="96" alt="Multi-Product Comparator">
</p>

# Multi-Product Comparator

[![CI](https://github.com/twttr/multi-product-comparator/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/twttr/multi-product-comparator/actions/workflows/ci.yml)

Chrome extension that highlights shops carrying all your selected products on price comparison sites.

When comparing products, there's no built-in way to see which shops stock all of them. This extension lets you add products to a compare list and highlights shops that carry every added item.

## How it works

1. Visit any product page on a supported site
2. Click **"Add to Compare"** (floating panel, bottom-right)
3. Navigate to another product page
4. Shops that also carry your previously added items are highlighted in green
5. Manage your list directly on the page — remove individual items or clear all

Highlighting only activates when viewing a page different from your stored items. Shops must appear in **all** added items to be highlighted.

## Supported sites

**idealo** — idealo.de, idealo.at, idealo.fr, idealo.es, idealo.it, idealo.co.uk

**Geizhals** — geizhals.de, geizhals.at, geizhals.eu, skinflint.co.uk, cenowarka.pl

**billiger.de** — billiger.de

**guenstiger.de** — guenstiger.de

Each site maintains its own separate compare list. UI is localized to match each domain's language (German, English, French, Spanish, Italian, Polish).

## Installation

```bash
git clone git@github.com:twttr/multi-product-comparator.git
cd multi-product-comparator
npm install
npm run build
```

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `dist/` folder

## Development

```bash
npm run watch      # rebuild on file changes
npm run typecheck  # type check without emitting
npm test           # run tests
npm run test:watch # run tests in watch mode
npm run build      # production build
```

## Tech stack

- TypeScript + esbuild
- Chrome Extension Manifest V3
- Vitest for testing
- `chrome.storage.session` (data clears on browser close)

## Permissions

- **storage** — persists your compare list per site using `chrome.storage.session` (data clears when the browser closes)
- **activeTab** — accesses the current tab to inject the comparison UI on supported sites

No host permissions are required. The extension only runs on the supported domains listed above via content script matching.

## License

MIT

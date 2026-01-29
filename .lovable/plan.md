

# Update Progressier Integration with New App ID

## Overview
Update the Progressier PWA integration to use the new App ID provided by the user. The current App ID needs to be replaced across all configuration files.

## Change Summary

| Current App ID | New App ID |
|----------------|------------|
| `xXf0UWVAPdw78va7cNfF` | `xXf0UWVAPdw78va7cNFf` |

Note: The difference is in the casing near the end (`cNfF` → `cNFf`).

---

## Files to Modify

### 1. index.html
Update the manifest link and script src to use the new App ID:

**Before:**
```html
<link rel="manifest" href="https://progressier.app/xXf0UWVAPdw78va7cNfF/progressier.json"/>
<script defer src="https://progressier.app/xXf0UWVAPdw78va7cNfF/script.js"></script>
```

**After:**
```html
<link rel="manifest" href="https://progressier.app/xXf0UWVAPdw78va7cNFf/progressier.json"/>
<script defer src="https://progressier.app/xXf0UWVAPdw78va7cNFf/script.js"></script>
```

---

### 2. public/progressier.js
Update the service worker import URL:

**Before:**
```javascript
importScripts("https://progressier.app/xXf0UWVAPdw78va7cNfF/sw.js")
```

**After:**
```javascript
importScripts("https://progressier.app/xXf0UWVAPdw78va7cNFf/sw.js")
```

---

### 3. src/lib/progressierConfig.ts
Update the configuration constants:

**Before:**
```typescript
export const PROGRESSIER_CONFIG = {
  appId: "xXf0UWVAPdw78va7cNfF",
  dashboardUrl: "https://progressier.com/dashboard",
  manifestUrl: "https://progressier.app/xXf0UWVAPdw78va7cNfF/progressier.json",
};
```

**After:**
```typescript
export const PROGRESSIER_CONFIG = {
  appId: "xXf0UWVAPdw78va7cNFf",
  dashboardUrl: "https://progressier.com/dashboard",
  manifestUrl: "https://progressier.app/xXf0UWVAPdw78va7cNFf/progressier.json",
};
```

---

### 4. public/manifest.json (Comment Out)
Since Progressier provides its own manifest, the local manifest should be commented out or removed to avoid conflicts. Since JSON doesn't support comments, this file should be renamed to `manifest.json.bak` or deleted.

---

## Summary of Changes

| File | Action |
|------|--------|
| `index.html` | Update manifest link and script src URLs |
| `public/progressier.js` | Update service worker import URL |
| `src/lib/progressierConfig.ts` | Update appId and manifestUrl |
| `public/manifest.json` | Rename to `.bak` to disable (JSON can't be commented) |


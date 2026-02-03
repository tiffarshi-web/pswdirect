

## Vite/React Production Build Fix

### Problem Identified

Your Netlify deployment is serving the **raw development `index.html`** instead of the processed production build. This happens when:

1. **Netlify's build command is not configured** to run `npm run build` (or `vite build`)
2. **The publish directory points to the wrong folder** (serving source files instead of built files)

Your local project configuration is **correct**:
- `index.html` is in the project root (correct location for Vite)
- `vite.config.ts` has proper `base: "/"` and `outDir: "dist"`
- `netlify.toml` publishes from `dist/`

However, **`netlify.toml` is missing the build command**, which means Netlify may not be running the build process at all.

---

### Solution

**Update `netlify.toml`** to explicitly specify the build command:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

This ensures Netlify:
1. Runs `npm run build` (which executes `vite build`)
2. Vite processes `index.html`, replacing `/src/main.tsx` with hashed production bundles
3. Outputs the transformed files to `dist/`
4. Serves from `dist/` directory

---

### Technical Details

| Item | Current | After Fix |
|------|---------|-----------|
| Build command | Not specified | `npm run build` |
| Publish directory | `dist` | `dist` (unchanged) |
| index.html transformation | Not happening | Vite transforms `src/main.tsx` → `assets/index-[hash].js` |

**What Vite Does During Build:**
- Reads `index.html` from project root
- Replaces `<script type="module" src="/src/main.tsx">` with production bundle reference
- Outputs processed `index.html` to `dist/` with hashed asset paths
- All your React code gets bundled, minified, and tree-shaken

---

### Additional Cleanup (Optional)

The `public/_redirects` file duplicates what's already in `netlify.toml`. You can optionally remove it to avoid confusion, but it won't cause issues if left in place.

---

### After Deployment

Once the fix is deployed, verify by:
1. Opening `https://psadirect.ca` 
2. Right-click → View Page Source
3. Confirm you see `<script type="module" src="/assets/index-[hash].js">` instead of `/src/main.tsx`


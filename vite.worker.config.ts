import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

/**
 * Isolated Worker application build.
 *
 * The normal Lovable build continues to use vite.config.ts. Keeping this in a
 * separate config prevents mobile packaging concerns from changing the public
 * website entry point, plugins, generated sitemap, or output directory.
 */
export default defineConfig({
  root: path.resolve(__dirname, "mobile/worker"),
  envDir: __dirname,
  publicDir: false,
  base: "./",
  plugins: [react()],
  resolve: {
    // Native bundles use the Keychain/Keystore-backed backend client.
    alias: [
      {
        find: /^@\/integrations\/supabase\/client$/,
        replacement: path.resolve(__dirname, "./src/integrations/supabase/nativeClient.ts"),
      },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
  build: {
    outDir: path.resolve(__dirname, "dist-worker"),
    emptyOutDir: true,
    minify: "esbuild",
    sourcemap: false,
  },
});

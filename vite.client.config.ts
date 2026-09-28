import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

/** Isolated Client (family) app build. The website keeps using vite.config.ts. */
export default defineConfig({
  root: path.resolve(__dirname, "mobile/client"),
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
    outDir: path.resolve(__dirname, "dist-client"),
    emptyOutDir: true,
    minify: "esbuild",
    sourcemap: false,
  },
});

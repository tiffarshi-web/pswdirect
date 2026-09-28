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
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist-client"),
    emptyOutDir: true,
    minify: "esbuild",
    sourcemap: false,
  },
});

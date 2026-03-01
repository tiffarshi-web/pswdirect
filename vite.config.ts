import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { seoPrerender } from "./vite-plugin-seo-prerender";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "production" && seoPrerender(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Production build settings - uses esbuild (built into Vite)
  build: {
    minify: mode === "production" ? "esbuild" : false,
    sourcemap: mode === "production" ? false : true,
  },
}));

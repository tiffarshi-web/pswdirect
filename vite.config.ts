import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Production build settings - KILL DEV for production
  build: {
    minify: mode === "production" ? "terser" : false,
    sourcemap: mode === "production" ? false : true,
    terserOptions: mode === "production" ? {
      compress: {
        drop_console: false, // Keep console for error tracking
        drop_debugger: true,
      },
    } : undefined,
  },
}));

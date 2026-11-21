import { fileURLToPath } from "node:url";

// The generator uses Node build tooling, not browser globals or UI setup.
export default {
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
  test: { environment: "node", include: ["scripts/__tests__/seoGenerationSafety.test.ts"] },
};
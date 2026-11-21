export type SeoPublicConfig = { backendUrl: string; publishableKey: string };

// Use Vite's parser and mode-specific files, just like the configured web app.
// Only public configuration is consumed; never log configuration or responses.
export function resolveSeoPublicConfig(env: Record<string, string | undefined>): SeoPublicConfig {
  const backendUrl = (env.VITE_SUPABASE_URL || env.SUPABASE_URL)?.trim();
  const publishableKey = (env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY)?.trim();
  if (!backendUrl || !publishableKey) throw new Error("SEO generation stopped: public backend configuration is missing; existing artifacts preserved.");
  try {
    const url = new URL(backendUrl);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error();
  } catch {
    throw new Error("SEO generation stopped: public backend URL is invalid; existing artifacts preserved.");
  }
  return { backendUrl: backendUrl.replace(/\/+$/, ""), publishableKey };
}

export async function loadSeoPublicConfig(root = process.cwd(), runtimeEnv: Record<string, string | undefined> = process.env): Promise<SeoPublicConfig> {
  // Load build tooling only when collecting evidence, not when importing the
  // pure sitemap rules into browser-environment regression tests.
  const { loadEnv } = await import("vite");
  const modeIndex = process.argv.indexOf("--mode");
  const mode = (modeIndex >= 0 ? process.argv[modeIndex + 1] : undefined)
    || (runtimeEnv.npm_lifecycle_event === "predev" ? "development" : "production");
  return resolveSeoPublicConfig({ ...loadEnv(mode, root, ""), ...runtimeEnv });
}
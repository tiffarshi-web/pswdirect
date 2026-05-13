// Prebuild script: fetches the dynamic sitemap from the deployed edge function
// and writes static files to public/ so /sitemap.xml is reachable on the site origin.
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const SUPABASE_FN = "https://pavibobervhqkfzwkotw.supabase.co/functions/v1/generate-sitemap";
const SITE = "https://pswdirect.ca";

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${url}: ${res.status}`);
  return res.text();
}

async function main() {
  mkdirSync(resolve("public"), { recursive: true });

  try {
    const [main, psws] = await Promise.all([
      fetchText(`${SUPABASE_FN}?type=main`),
      fetchText(`${SUPABASE_FN}?type=psws`),
    ]);

    writeFileSync(resolve("public/sitemap-main.xml"), main);
    writeFileSync(resolve("public/sitemap-psws.xml"), psws);

    const today = new Date().toISOString().split("T")[0];
    const index = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE}/sitemap-main.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE}/sitemap-psws.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;
    writeFileSync(resolve("public/sitemap.xml"), index);

    console.log(`✅ sitemap.xml + sitemap-main.xml + sitemap-psws.xml generated`);
  } catch (err) {
    console.warn(`⚠️  Sitemap prebuild failed (${(err as Error).message}). Keeping existing public/sitemap.xml if any.`);
  }
}

main();

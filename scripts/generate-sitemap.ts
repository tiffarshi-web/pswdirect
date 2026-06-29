// Prebuild script: fetches the dynamic sitemap from the deployed edge function
// and writes static files to public/ so /sitemap.xml is reachable on the site origin.
// Chunks the main sitemap into ≤25k-URL parts to stay under repo file size limits
// and well below the 50k-URL/50MB Google sitemap caps.
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from "fs";
import { resolve } from "path";

const SUPABASE_FN = "https://pavibobervhqkfzwkotw.supabase.co/functions/v1/generate-sitemap";
const SITE = "https://pswdirect.ca";
const CHUNK_SIZE = 25000;

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${url}: ${res.status}`);
  return res.text();
}

function splitUrls(xml: string): string[] {
  return xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
}

function wrapUrlset(urls: string[]): string {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

function cleanupOldChunks() {
  const dir = resolve("public");
  for (const f of readdirSync(dir)) {
    if (/^sitemap-main(-\d+)?\.xml$/.test(f)) {
      try { unlinkSync(resolve(dir, f)); } catch {}
    }
  }
}

async function main() {
  mkdirSync(resolve("public"), { recursive: true });

  try {
    const [main, psws] = await Promise.all([
      fetchText(`${SUPABASE_FN}?type=main`),
      fetchText(`${SUPABASE_FN}?type=psws`),
    ]);

    cleanupOldChunks();

    const urls = splitUrls(main);
    const chunkFiles: string[] = [];
    if (urls.length <= CHUNK_SIZE) {
      writeFileSync(resolve("public/sitemap-main.xml"), wrapUrlset(urls));
      chunkFiles.push("sitemap-main.xml");
    } else {
      for (let i = 0, part = 1; i < urls.length; i += CHUNK_SIZE, part++) {
        const slice = urls.slice(i, i + CHUNK_SIZE);
        const name = `sitemap-main-${part}.xml`;
        writeFileSync(resolve(`public/${name}`), wrapUrlset(slice));
        chunkFiles.push(name);
      }
    }

    writeFileSync(resolve("public/sitemap-psws.xml"), psws);

    const today = new Date().toISOString().split("T")[0];
    const sitemapEntries = [
      ...chunkFiles.map((f) => `  <sitemap>\n    <loc>${SITE}/${f}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`),
      `  <sitemap>\n    <loc>${SITE}/sitemap-psws.xml</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`,
    ].join("\n");
    const index = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</sitemapindex>`;
    writeFileSync(resolve("public/sitemap.xml"), index);

    console.log(`✅ sitemap.xml + ${chunkFiles.length} main chunk(s) + sitemap-psws.xml generated (${urls.length} main URLs)`);
  } catch (err) {
    console.warn(`⚠️  Sitemap prebuild failed (${(err as Error).message}). Keeping existing public/sitemap.xml if any.`);
  }
}

main();

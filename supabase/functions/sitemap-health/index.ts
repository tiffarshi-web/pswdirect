// Sitemap health-check endpoint.
// Fetches the sitemap index and each child sitemap, reports URL counts and validity.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const BASE_URL = "https://pswdirect.ca";
const INDEX_URL = `${BASE_URL}/sitemap.xml`;

interface ChildReport {
  url: string;
  status: number;
  ok: boolean;
  contentType: string | null;
  bytes: number;
  urlCount: number;
  validXml: boolean;
  hasUrlset: boolean;
  firstUrl: string | null;
  error?: string;
}

async function checkChild(url: string): Promise<ChildReport> {
  try {
    const res = await fetch(url, { headers: { accept: "application/xml,text/xml,*/*" } });
    const text = await res.text();
    const hasUrlset = /<urlset[\s>]/.test(text);
    const validXml = /^\s*<\?xml/.test(text) && /<\/urlset>\s*$/.test(text);
    const urlCount = (text.match(/<url>/g) || []).length;
    const firstMatch = text.match(/<loc>([^<]+)<\/loc>/);
    return {
      url,
      status: res.status,
      ok: res.ok && hasUrlset && urlCount > 0,
      contentType: res.headers.get("content-type"),
      bytes: text.length,
      urlCount,
      validXml,
      hasUrlset,
      firstUrl: firstMatch ? firstMatch[1] : null,
    };
  } catch (err) {
    return {
      url,
      status: 0,
      ok: false,
      contentType: null,
      bytes: 0,
      urlCount: 0,
      validXml: false,
      hasUrlset: false,
      firstUrl: null,
      error: (err as Error).message,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const started = Date.now();
  try {
    const indexRes = await fetch(INDEX_URL, {
      headers: { accept: "application/xml,text/xml,*/*" },
    });
    const indexText = await indexRes.text();
    const isIndex = /<sitemapindex[\s>]/.test(indexText);
    const childUrls = Array.from(indexText.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);

    const children = await Promise.all(childUrls.map(checkChild));

    const totalUrls = children.reduce((n, c) => n + c.urlCount, 0);
    const emptyChildren = children.filter((c) => c.urlCount === 0).map((c) => c.url);
    const invalidChildren = children.filter((c) => !c.validXml).map((c) => c.url);

    const healthy =
      indexRes.ok &&
      isIndex &&
      childUrls.length > 0 &&
      emptyChildren.length === 0 &&
      invalidChildren.length === 0;

    const body = {
      healthy,
      checkedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      index: {
        url: INDEX_URL,
        status: indexRes.status,
        isSitemapIndex: isIndex,
        childCount: childUrls.length,
      },
      totals: {
        childSitemaps: children.length,
        totalUrls,
        emptyChildren: emptyChildren.length,
        invalidChildren: invalidChildren.length,
      },
      issues: {
        emptyChildren,
        invalidChildren,
      },
      children,
    };

    return new Response(JSON.stringify(body, null, 2), {
      status: healthy ? 200 : 503,
      headers: {
        ...corsHeaders,
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ healthy: false, error: (err as Error).message }, null, 2),
      {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      },
    );
  }
});

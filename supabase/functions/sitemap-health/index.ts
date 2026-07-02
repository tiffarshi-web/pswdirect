// Sitemap health-check endpoint.
// Fetches the sitemap index and each child sitemap, reports URL counts, validity,
// content-type, size, encoding, and flags anomalies that could break sitemap fetching.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const BASE_URL = "https://pswdirect.ca";
const INDEX_URL = `${BASE_URL}/sitemap.xml`;

// Google's hard limits for a single sitemap file.
const MAX_URLS_PER_SITEMAP = 50_000;
const MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024; // 50 MB
// Warn well before the ceiling so we can split proactively.
const WARN_URLS_PER_SITEMAP = 45_000;
const WARN_UNCOMPRESSED_BYTES = 45 * 1024 * 1024;

const VALID_XML_CONTENT_TYPES = [
  "application/xml",
  "text/xml",
  "application/rss+xml",
  "application/atom+xml",
];

interface ChildReport {
  url: string;
  status: number;
  ok: boolean;
  contentType: string | null;
  contentTypeOk: boolean;
  contentEncoding: string | null;
  isGzipped: boolean;
  gzipDeclaredButUrlNotGz: boolean;
  contentLengthHeader: number | null;
  bytesReceived: number;
  bytesDecoded: number;
  urlCount: number;
  validXml: boolean;
  hasUrlset: boolean;
  hasBom: boolean;
  firstUrl: string | null;
  anomalies: string[];
  error?: string;
}

function parseContentType(ct: string | null): string | null {
  if (!ct) return null;
  return ct.split(";")[0]!.trim().toLowerCase();
}

async function checkChild(url: string): Promise<ChildReport> {
  const anomalies: string[] = [];
  try {
    const res = await fetch(url, { headers: { accept: "application/xml,text/xml,*/*" } });
    const rawContentType = res.headers.get("content-type");
    const contentType = parseContentType(rawContentType);
    const contentEncoding = res.headers.get("content-encoding");
    const contentLengthHeader = res.headers.get("content-length")
      ? Number(res.headers.get("content-length"))
      : null;

    // fetch() transparently decompresses gzip; buffer the raw bytes we actually received.
    const buf = new Uint8Array(await res.arrayBuffer());
    const bytesDecoded = buf.byteLength;
    const bytesReceived = contentLengthHeader ?? bytesDecoded;
    const text = new TextDecoder("utf-8").decode(buf);

    const hasBom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
    const hasUrlset = /<urlset[\s>]/.test(text);
    const validXml = /^\s*(?:\uFEFF)?<\?xml/.test(text) && /<\/urlset>\s*$/.test(text);
    const urlCount = (text.match(/<url>/g) || []).length;
    const firstMatch = text.match(/<loc>([^<]+)<\/loc>/);

    const contentTypeOk = !!contentType && VALID_XML_CONTENT_TYPES.includes(contentType);
    const isGzipped = (contentEncoding || "").toLowerCase().includes("gzip");
    const urlLooksGz = /\.gz(\?|$)/i.test(url);
    const gzipDeclaredButUrlNotGz = isGzipped && !urlLooksGz && false;
    // Note: transport-level gzip (Content-Encoding: gzip) on a .xml is fine and expected.
    // We only flag mismatches where the URL ends in .gz but the body is not gzipped, below.

    if (!res.ok) anomalies.push(`http_status_${res.status}`);
    if (!contentTypeOk) {
      anomalies.push(
        `bad_content_type:${contentType ?? "missing"} (expected application/xml or text/xml)`,
      );
    }
    if (hasBom) anomalies.push("utf8_bom_present");
    if (!hasUrlset) anomalies.push("missing_urlset_element");
    if (!validXml) anomalies.push("invalid_xml_envelope");
    if (urlCount === 0) anomalies.push("zero_url_entries");
    if (urlCount > MAX_URLS_PER_SITEMAP) {
      anomalies.push(`exceeds_google_url_limit:${urlCount}>${MAX_URLS_PER_SITEMAP}`);
    } else if (urlCount > WARN_URLS_PER_SITEMAP) {
      anomalies.push(`approaching_google_url_limit:${urlCount}`);
    }
    if (bytesDecoded > MAX_UNCOMPRESSED_BYTES) {
      anomalies.push(`exceeds_google_size_limit:${bytesDecoded}>${MAX_UNCOMPRESSED_BYTES}`);
    } else if (bytesDecoded > WARN_UNCOMPRESSED_BYTES) {
      anomalies.push(`approaching_google_size_limit:${bytesDecoded}`);
    }
    if (urlLooksGz && buf.length >= 2 && !(buf[0] === 0x1f && buf[1] === 0x8b)) {
      anomalies.push("gz_url_but_body_not_gzip_magic");
    }
    if (contentLengthHeader !== null && contentLengthHeader === 0) {
      anomalies.push("content_length_zero");
    }

    return {
      url,
      status: res.status,
      ok:
        res.ok &&
        contentTypeOk &&
        hasUrlset &&
        validXml &&
        urlCount > 0 &&
        urlCount <= MAX_URLS_PER_SITEMAP &&
        bytesDecoded <= MAX_UNCOMPRESSED_BYTES,
      contentType: rawContentType,
      contentTypeOk,
      contentEncoding,
      isGzipped,
      gzipDeclaredButUrlNotGz,
      contentLengthHeader,
      bytesReceived,
      bytesDecoded,
      urlCount,
      validXml,
      hasUrlset,
      hasBom,
      firstUrl: firstMatch ? firstMatch[1] : null,
      anomalies,
    };
  } catch (err) {
    return {
      url,
      status: 0,
      ok: false,
      contentType: null,
      contentTypeOk: false,
      contentEncoding: null,
      isGzipped: false,
      gzipDeclaredButUrlNotGz: false,
      contentLengthHeader: null,
      bytesReceived: 0,
      bytesDecoded: 0,
      urlCount: 0,
      validXml: false,
      hasUrlset: false,
      hasBom: false,
      firstUrl: null,
      anomalies: [`fetch_error:${(err as Error).message}`],
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
    const indexRawCt = indexRes.headers.get("content-type");
    const indexCt = parseContentType(indexRawCt);
    const indexText = await indexRes.text();
    const isIndex = /<sitemapindex[\s>]/.test(indexText);
    const indexContentTypeOk = !!indexCt && VALID_XML_CONTENT_TYPES.includes(indexCt);
    const childUrls = Array.from(indexText.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);

    const children = await Promise.all(childUrls.map(checkChild));

    const totalUrls = children.reduce((n, c) => n + c.urlCount, 0);
    const emptyChildren = children.filter((c) => c.urlCount === 0).map((c) => c.url);
    const invalidChildren = children.filter((c) => !c.validXml).map((c) => c.url);
    const badContentTypeChildren = children
      .filter((c) => !c.contentTypeOk)
      .map((c) => ({ url: c.url, contentType: c.contentType }));
    const oversizedChildren = children
      .filter(
        (c) => c.urlCount > MAX_URLS_PER_SITEMAP || c.bytesDecoded > MAX_UNCOMPRESSED_BYTES,
      )
      .map((c) => ({ url: c.url, urlCount: c.urlCount, bytes: c.bytesDecoded }));
    const anomalousChildren = children
      .filter((c) => c.anomalies.length > 0)
      .map((c) => ({ url: c.url, anomalies: c.anomalies }));

    const indexAnomalies: string[] = [];
    if (!indexRes.ok) indexAnomalies.push(`http_status_${indexRes.status}`);
    if (!isIndex) indexAnomalies.push("missing_sitemapindex_element");
    if (!indexContentTypeOk) {
      indexAnomalies.push(`bad_content_type:${indexCt ?? "missing"}`);
    }
    if (childUrls.length === 0) indexAnomalies.push("no_child_sitemaps_listed");

    const healthy =
      indexRes.ok &&
      isIndex &&
      indexContentTypeOk &&
      childUrls.length > 0 &&
      emptyChildren.length === 0 &&
      invalidChildren.length === 0 &&
      badContentTypeChildren.length === 0 &&
      oversizedChildren.length === 0;

    const body = {
      healthy,
      checkedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      index: {
        url: INDEX_URL,
        status: indexRes.status,
        isSitemapIndex: isIndex,
        contentType: indexRawCt,
        contentTypeOk: indexContentTypeOk,
        childCount: childUrls.length,
        anomalies: indexAnomalies,
      },
      totals: {
        childSitemaps: children.length,
        totalUrls,
        totalBytes: children.reduce((n, c) => n + c.bytesDecoded, 0),
        emptyChildren: emptyChildren.length,
        invalidChildren: invalidChildren.length,
        badContentTypeChildren: badContentTypeChildren.length,
        oversizedChildren: oversizedChildren.length,
        anomalousChildren: anomalousChildren.length,
      },
      limits: {
        maxUrlsPerSitemap: MAX_URLS_PER_SITEMAP,
        maxUncompressedBytes: MAX_UNCOMPRESSED_BYTES,
        warnUrlsPerSitemap: WARN_URLS_PER_SITEMAP,
        warnUncompressedBytes: WARN_UNCOMPRESSED_BYTES,
      },
      issues: {
        emptyChildren,
        invalidChildren,
        badContentTypeChildren,
        oversizedChildren,
        anomalousChildren,
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

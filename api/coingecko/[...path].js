// Vercel serverless function mirroring vite-plugins/secureApiProxy.js for production.
// Forwards /api/coingecko/* to api.coingecko.com and attaches the API key server-side.

// Block requests from other sites. Same-origin browser GETs omit the Origin
// header, so we only reject when Origin is present and its host doesn't match
// the deployment host — this stops cross-site quota abuse without breaking the app.
function isCrossOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    return new URL(origin).host !== req.headers.host;
  } catch {
    return true;
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ code: "METHOD_NOT_ALLOWED" });
    return;
  }
  if (isCrossOrigin(req)) {
    res.status(403).json({ code: "CROSS_ORIGIN_FORBIDDEN" });
    return;
  }

  const apiKey =
    process.env.COINGECKO_API_KEY || process.env.VITE_COINGECKO_API_KEY || "";

  const segments = Array.isArray(req.query.path)
    ? req.query.path
    : [req.query.path].filter(Boolean);
  const subPath = segments.join("/");
  if (!subPath || subPath.includes("..")) {
    res.status(400).json({ code: "BAD_PATH" });
    return;
  }

  // Only proxy the two CoinGecko endpoints this app uses. Without this the
  // function is a general-purpose CoinGecko proxy that anyone can point at any
  // endpoint using your key — the allowlist shrinks that abuse surface.
  const ALLOWED_PATHS = new Set(["v3/search", "v3/simple/price"]);
  if (!ALLOWED_PATHS.has(subPath)) {
    res.status(404).json({ code: "PATH_NOT_ALLOWED" });
    return;
  }

  // rebuild the query string without the catch-all `path` parameter
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === "path") continue;
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
    } else if (value != null) {
      params.append(key, value);
    }
  }
  const queryString = params.toString();
  const target = `https://api.coingecko.com/api/${subPath}${queryString ? `?${queryString}` : ""}`;

  const headers = { Accept: "application/json" };
  if (apiKey) headers["x-cg-demo-api-key"] = apiKey;

  try {
    const upstream = await fetch(target, { headers });
    const body = Buffer.from(await upstream.arrayBuffer());
    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    // cache successful responses at the Vercel edge to absorb repeat/concurrent
    // requests without re-hitting CoinGecko. 5 min matches the client refresh
    // cadence; only cache 2xx.
    if (upstream.ok) {
      res.setHeader(
        "Cache-Control",
        "public, s-maxage=300, stale-while-revalidate=600"
      );
    }
    res.status(upstream.status).send(body);
  } catch (error) {
    console.error("[api/coingecko]", error);
    res.status(502).json({ code: "PROXY_ERROR" });
  }
}

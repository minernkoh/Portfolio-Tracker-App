// Vercel serverless function mirroring vite-plugins/secureApiProxy.js for production.
// Keeps the TwelveData API key server-side instead of embedding it in the JS bundle.

import { guardPriceRequest } from "../_lib/guard.js";

export default async function handler(req, res) {
  if (!(await guardPriceRequest(req, res))) return;

  const apiKey =
    process.env.TWELVE_DATA_API_KEY || process.env.VITE_TWELVE_DATA_API_KEY || "";
  if (!apiKey) {
    res.status(503).json({ code: "TWELVE_DATA_NOT_CONFIGURED" });
    return;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
    } else if (value != null) {
      params.set(key, value);
    }
  }
  params.set("apikey", apiKey);

  try {
    const upstream = await fetch(`https://api.twelvedata.com/quote?${params.toString()}`);
    const body = Buffer.from(await upstream.arrayBuffer());
    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    // cache successful quotes at the Vercel edge so repeat/concurrent requests
    // are served without re-hitting the upstream API. 5 min matches the client
    // refresh cadence; only cache 2xx so errors aren't memoized.
    if (upstream.ok) {
      res.setHeader(
        "Cache-Control",
        "public, s-maxage=300, stale-while-revalidate=600"
      );
    }
    res.status(upstream.status).send(body);
  } catch (error) {
    console.error("[api/twelve-data]", error);
    res.status(502).json({ code: "PROXY_ERROR" });
  }
}

// Vercel serverless function mirroring vite-plugins/secureApiProxy.js for production.
// Forwards /api/coingecko/* to api.coingecko.com and attaches the API key server-side.

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ code: "METHOD_NOT_ALLOWED" });
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
    res.status(upstream.status).send(body);
  } catch (error) {
    console.error("[api/coingecko]", error);
    res.status(502).json({ code: "PROXY_ERROR" });
  }
}

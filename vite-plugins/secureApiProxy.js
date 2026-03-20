/**
 * Keeps API keys off the client: injects credentials only in dev/preview (Node).
 * Production static hosts must use a real backend or serverless routes with the same paths.
 */
export function secureApiPlugin(env) {
  const twelveKey =
    env.TWELVE_DATA_API_KEY || env.VITE_TWELVE_DATA_API_KEY || "";
  const cgKey = env.COINGECKO_API_KEY || env.VITE_COINGECKO_API_KEY || "";
  async function readRequestBody(req) {
    if (req.method === "GET" || req.method === "HEAD") return undefined;
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buf = Buffer.concat(chunks);
    return buf.length ? buf : undefined;
  }

  function sendJson(res, status, obj) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(obj));
  }

  async function handleTwelveData(req, res) {
    const fullUrl = new URL(req.url, "http://localhost");
    if (fullUrl.pathname !== "/api/twelve-data/quote") {
      res.statusCode = 404;
      res.end();
      return;
    }
    if (!twelveKey) {
      sendJson(res, 503, { code: "TWELVE_DATA_NOT_CONFIGURED" });
      return;
    }
    const params = new URLSearchParams(fullUrl.search);
    params.set("apikey", twelveKey);
    const target = `https://api.twelvedata.com/quote?${params.toString()}`;
    const upstream = await fetch(target);
    res.statusCode = upstream.status;
    const ct = upstream.headers.get("content-type");
    if (ct) res.setHeader("Content-Type", ct);
    res.end(Buffer.from(await upstream.arrayBuffer()));
  }

  async function handleCoinGecko(req, res) {
    if (!req.url.startsWith("/api/coingecko/")) {
      res.statusCode = 404;
      res.end();
      return;
    }
    const q = req.url.indexOf("?");
    const pathPart = q === -1 ? req.url : req.url.slice(0, q);
    const search = q === -1 ? "" : req.url.slice(q);
    const subPath = pathPart.replace(/^\/api\/coingecko\//, "");
    if (!subPath || subPath.includes("..")) {
      res.statusCode = 400;
      res.end();
      return;
    }
    const target = `https://api.coingecko.com/api/${subPath}${search}`;
    const headers = { Accept: "application/json" };
    if (cgKey) headers["x-cg-demo-api-key"] = cgKey;
    const body = await readRequestBody(req);
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
    });
    res.statusCode = upstream.status;
    const ct = upstream.headers.get("content-type");
    if (ct) res.setHeader("Content-Type", ct);
    res.end(Buffer.from(await upstream.arrayBuffer()));
  }

  function installMiddleware(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url.startsWith("/api/")) {
        next();
        return;
      }

      try {
        if (req.url.startsWith("/api/app-status")) {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              supabase: !!(
                env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY
              ),
              twelveData: !!twelveKey,
              coinGeckoKeyConfigured: !!cgKey,
            })
          );
          return;
        }

        if (req.url.startsWith("/api/twelve-data/")) {
          await handleTwelveData(req, res);
          return;
        }

        if (req.url.startsWith("/api/coingecko/")) {
          await handleCoinGecko(req, res);
          return;
        }

      } catch (e) {
        console.error("[secure-api-proxy]", e);
        sendJson(res, 502, { code: "PROXY_ERROR" });
        return;
      }

      next();
    });
  }

  return {
    name: "secure-api-proxy",
    configureServer(server) {
      installMiddleware(server);
    },
    configurePreviewServer(server) {
      installMiddleware(server);
    },
  };
}

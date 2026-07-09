// Shared request guards for the Vercel price proxies.
// Auth + optional Upstash per-user rate limiting protect free-tier upstream quotas.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Block requests from other sites. Same-origin browser GETs omit the Origin
// header, so we only reject when Origin is present and its host doesn't match
// the deployment host.
export function isCrossOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    return new URL(origin).host !== req.headers.host;
  } catch {
    return true;
  }
}

// Verify the Supabase session and return the user id. Fails closed if Supabase
// env is unset or the token is invalid. Edge cache hits never reach this.
export async function verifyAuth(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false };

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const anon =
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  if (!url || !anon) return { ok: false };

  try {
    const r = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anon },
    });
    if (!r.ok) return { ok: false };
    const data = await r.json();
    if (!data?.id) return { ok: false };
    return { ok: true, userId: data.id };
  } catch {
    return { ok: false };
  }
}

// Generous for normal use (client refreshes every 5 min) but tight enough to
// stop a signed-in account from burning free-tier TwelveData/CoinGecko quota.
const DEFAULT_LIMIT = 40;
const DEFAULT_WINDOW = "60 s";

let ratelimit;
let ratelimitEnvKey = "";

function getRatelimit() {
  const url = process.env.UPSTASH_REDIS_REST_URL || "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || "";
  const envKey = `${url}\0${token}`;

  if (!url || !token) {
    ratelimit = null;
    ratelimitEnvKey = "";
    return null;
  }

  if (ratelimit && ratelimitEnvKey === envKey) return ratelimit;

  ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(DEFAULT_LIMIT, DEFAULT_WINDOW),
    analytics: false,
    prefix: "portfolio-tracker-price",
    // Per-instance cache reduces Redis round-trips under bursty traffic.
    ephemeralCache: new Map(),
  });
  ratelimitEnvKey = envKey;
  return ratelimit;
}

// Per-user sliding window. Opt-in: if Upstash env vars are missing, allow the
// request (auth + edge cache still apply). Fail open on Redis errors so a
// Redis outage doesn't take down pricing for real users.
export async function checkRateLimit(userId) {
  const limiter = getRatelimit();
  if (!limiter) {
    return { allowed: true, configured: false };
  }

  try {
    const result = await limiter.limit(userId);
    return {
      allowed: result.success,
      configured: true,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error("[api/rate-limit]", error);
    return { allowed: true, configured: true, error: true };
  }
}

// Run cross-origin, auth, and rate-limit checks. On failure, writes the
// response and returns null. On success, returns { userId }.
export async function guardPriceRequest(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ code: "METHOD_NOT_ALLOWED" });
    return null;
  }
  if (isCrossOrigin(req)) {
    res.status(403).json({ code: "CROSS_ORIGIN_FORBIDDEN" });
    return null;
  }

  const auth = await verifyAuth(req);
  if (!auth.ok) {
    res.status(401).json({ code: "UNAUTHORIZED" });
    return null;
  }

  const rate = await checkRateLimit(auth.userId);
  if (rate.configured && rate.limit != null) {
    res.setHeader("X-RateLimit-Limit", String(rate.limit));
    if (rate.remaining != null) {
      res.setHeader("X-RateLimit-Remaining", String(rate.remaining));
    }
    if (rate.reset != null) {
      res.setHeader("X-RateLimit-Reset", String(rate.reset));
    }
  }
  if (!rate.allowed) {
    if (rate.reset != null) {
      const retryAfter = Math.max(1, Math.ceil((rate.reset - Date.now()) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
    }
    res.status(429).json({ code: "RATE_LIMITED" });
    return null;
  }

  return { userId: auth.userId };
}

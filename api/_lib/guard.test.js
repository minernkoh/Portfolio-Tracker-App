import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@upstash/ratelimit", () => {
  const limit = vi.fn();
  class Ratelimit {
    constructor() {
      this.limit = limit;
    }
    static slidingWindow() {
      return {};
    }
  }
  return { Ratelimit, __limitMock: limit };
});

vi.mock("@upstash/redis", () => ({
  Redis: class Redis {},
}));

const { isCrossOrigin, verifyAuth, checkRateLimit, guardPriceRequest } =
  await import("./guard.js");
const { __limitMock } = await import("@upstash/ratelimit");

function mockRes() {
  const res = {
    statusCode: null,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
    },
  };
  return res;
}

describe("isCrossOrigin", () => {
  it("allows requests with no Origin header", () => {
    expect(isCrossOrigin({ headers: {} })).toBe(false);
  });

  it("allows same-origin Origin", () => {
    expect(
      isCrossOrigin({
        headers: { origin: "https://app.example.com", host: "app.example.com" },
      })
    ).toBe(false);
  });

  it("rejects mismatched Origin", () => {
    expect(
      isCrossOrigin({
        headers: { origin: "https://evil.example", host: "app.example.com" },
      })
    ).toBe(true);
  });

  it("rejects malformed Origin", () => {
    expect(
      isCrossOrigin({ headers: { origin: "not-a-url", host: "app.example.com" } })
    ).toBe(true);
  });
});

describe("verifyAuth", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "anon-key");
    vi.restoreAllMocks();
  });

  it("fails closed without a bearer token", async () => {
    await expect(verifyAuth({ headers: {} })).resolves.toEqual({ ok: false });
  });

  it("fails closed when Supabase env is missing", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    await expect(
      verifyAuth({ headers: { authorization: "Bearer tok" } })
    ).resolves.toEqual({ ok: false });
  });

  it("returns user id on a valid session", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ id: "user-123" }),
    });
    await expect(
      verifyAuth({ headers: { authorization: "Bearer tok" } })
    ).resolves.toEqual({ ok: true, userId: "user-123" });
  });

  it("rejects invalid sessions", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false });
    await expect(
      verifyAuth({ headers: { authorization: "Bearer bad" } })
    ).resolves.toEqual({ ok: false });
  });
});

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    __limitMock.mockReset();
  });

  it("allows all traffic when Upstash is not configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    await expect(checkRateLimit("user-1")).resolves.toEqual({
      allowed: true,
      configured: false,
    });
  });

  it("enforces the sliding window when Upstash is configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    __limitMock.mockResolvedValue({
      success: false,
      limit: 40,
      remaining: 0,
      reset: Date.now() + 30_000,
    });

    const result = await checkRateLimit("user-1");
    expect(result.allowed).toBe(false);
    expect(result.configured).toBe(true);
    expect(result.limit).toBe(40);
    expect(__limitMock).toHaveBeenCalledWith("user-1");
  });
});

describe("guardPriceRequest", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.restoreAllMocks();
  });

  it("rejects non-GET methods", async () => {
    const res = mockRes();
    const result = await guardPriceRequest(
      { method: "POST", headers: {} },
      res
    );
    expect(result).toBeNull();
    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ code: "METHOD_NOT_ALLOWED" });
  });

  it("rejects unauthenticated callers", async () => {
    const res = mockRes();
    const result = await guardPriceRequest(
      { method: "GET", headers: {} },
      res
    );
    expect(result).toBeNull();
    expect(res.statusCode).toBe(401);
  });

  it("returns the user id when auth passes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ id: "user-abc" }),
    });
    const res = mockRes();
    const result = await guardPriceRequest(
      { method: "GET", headers: { authorization: "Bearer tok" } },
      res
    );
    expect(result).toEqual({ userId: "user-abc" });
    expect(res.statusCode).toBeNull();
  });

  it("returns 429 when the user is rate limited", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ id: "user-abc" }),
    });
    const reset = Date.now() + 15_000;
    __limitMock.mockResolvedValue({
      success: false,
      limit: 40,
      remaining: 0,
      reset,
    });

    const res = mockRes();
    const result = await guardPriceRequest(
      { method: "GET", headers: { authorization: "Bearer tok" } },
      res
    );
    expect(result).toBeNull();
    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({ code: "RATE_LIMITED" });
    expect(res.headers["Retry-After"]).toBeTruthy();
    expect(res.headers["X-RateLimit-Limit"]).toBe("40");
  });
});

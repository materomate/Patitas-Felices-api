import { describe, it, expect, vi } from "vitest";
import authRateLimiter from "../../src/middlewares/rateLimiter.js";

// Unidad: rateLimiter. Sin Express, sin HTTP. Se invoca el middleware
// directamente muchas veces con la misma IP simulada hasta superar el límite.
function buildRes() {
  const res = {
    statusCode: undefined,
    body: undefined,
    status: vi.fn(function (code) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function (payload) {
      this.body = payload;
      return this;
    }),
    send: vi.fn(function (payload) {
      this.body = payload;
      return this;
    }),
    setHeader: vi.fn(),
    getHeader: vi.fn(),
    removeHeader: vi.fn(),
  };
  return res;
}

function buildReq(ip) {
  return { ip, headers: {}, socket: { remoteAddress: ip } };
}

describe("rateLimiter (fix: falta de rate limiting en login/registro)", () => {
  it("deja pasar (llama next) requests dentro del límite", async () => {
    const req = buildReq("10.0.0.1");
    const res = buildRes();
    const next = vi.fn();

    await authRateLimiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalledWith(429);
  });

  it("responde 429 tras superar el máximo de intentos desde la misma IP", async () => {
    const ip = "10.0.0.2";
    let res;
    let next;

    for (let i = 0; i < 21; i++) {
      const req = buildReq(ip);
      res = buildRes();
      next = vi.fn();
      await authRateLimiter(req, res, next);
    }

    expect(res.status).toHaveBeenCalledWith(429);
    expect(next).not.toHaveBeenCalled();
  });

  it("no bloquea a una IP distinta aunque otra haya llegado al límite", async () => {
    const blockedIp = "10.0.0.3";
    for (let i = 0; i < 21; i++) {
      await authRateLimiter(buildReq(blockedIp), buildRes(), vi.fn());
    }

    const req = buildReq("10.0.0.4");
    const res = buildRes();
    const next = vi.fn();

    await authRateLimiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalledWith(429);
  });
});

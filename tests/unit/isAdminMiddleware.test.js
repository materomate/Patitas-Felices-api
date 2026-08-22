import { describe, it, expect, vi, beforeEach } from "vitest";
import isAdmin from "../../src/middlewares/isAdminMiddleware.js";

// Dobles simples de Express: req plano, res con status/json encadenables, next espiado.
// Unidad pura: sin Express, sin HTTP, sin DB, sin servicios externos.
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
  };
  return res;
}

describe("isAdmin middleware", () => {
  let res;
  let next;

  beforeEach(() => {
    res = buildRes();
    next = vi.fn();
  });

  // C1
  it("llama next() una vez cuando role === 'admin' y no responde", () => {
    const req = { user: { role: "admin" } };

    isAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  // C2
  it("responde 403 cuando role === 'customer' y no llama next()", () => {
    const req = { user: { role: "customer" } };

    isAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Admin access required" });
    expect(next).not.toHaveBeenCalled();
  });

  // C3
  it("responde 401 cuando no hay req.user y no llama next()", () => {
    const req = {};

    isAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Authentication is required",
    });
    expect(next).not.toHaveBeenCalled();
  });

  // C4: solo el literal "admin" pasa; el frontend usa "cliente"
  it("responde 403 cuando role === 'cliente' (solo 'admin' literal pasa)", () => {
    const req = { user: { role: "cliente" } };

    isAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Admin access required" });
    expect(next).not.toHaveBeenCalled();
  });

  // C5: al rechazar, next nunca se invoca
  it("nunca invoca next() en los caminos de rechazo (401/403)", () => {
    isAdmin({}, buildRes(), next);
    isAdmin({ user: { role: "customer" } }, buildRes(), next);

    expect(next).not.toHaveBeenCalled();
  });

});

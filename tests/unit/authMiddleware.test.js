import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import authMiddleware from "../../src/middlewares/authMiddleware.js";
import { revokeToken } from "../../src/utils/tokenBlacklist.js";

// Unidad: authMiddleware. Dependencia real: jsonwebtoken + process.env.JWT_SECRET.
// Sin Express, sin HTTP, sin DB. Los tokens se firman con un secreto de prueba.
const TEST_SECRET = "test-secret-unit";

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

describe("authMiddleware", () => {
  let res;
  let next;

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    res = buildRes();
    next = vi.fn();
  });

  it("acepta un token válido: asigna req.user y llama next()", () => {
    const payload = { userId: "u1", name: "Ada", role: "admin" };
    const token = jwt.sign(payload, TEST_SECRET, { expiresIn: "1h" });
    const req = { headers: { authorization: `Bearer ${token}` } };

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject(payload);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("responde 401 'Unauthorized' cuando no hay header Authorization", () => {
    const req = { headers: {} };

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("responde 401 'Unauthorized' cuando el header no incluye token", () => {
    const req = { headers: { authorization: "Bearer " } };

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("responde 401 'Invalid or expired token' con token inválido", () => {
    const req = { headers: { authorization: "Bearer not.a.valid.token" } };

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid or expired token",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("responde 401 'Invalid or expired token' con token expirado", () => {
    const token = jwt.sign({ userId: "u1" }, TEST_SECRET, { expiresIn: "-1s" });
    const req = { headers: { authorization: `Bearer ${token}` } };

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid or expired token",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("fix JWT sin revocación: rechaza un token válido pero revocado (logout)", () => {
    const token = jwt.sign({ userId: "u1" }, TEST_SECRET, { expiresIn: "1h" });
    const exp = Math.floor(Date.now() / 1000) + 3600;
    revokeToken(token, exp);

    const req = { headers: { authorization: `Bearer ${token}` } };

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid or expired token",
    });
    expect(next).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from "vitest";
import { body } from "express-validator";
import validate from "../../src/middlewares/validation.js";

// Unidad: middleware `validate`. Dependencia real: validationResult de express-validator.
// Se ejecuta una cadena de validación genérica (fixture) sobre un req simulado; NO se
// duplican los validadores de producción. Sin Express server, sin HTTP, sin DB.
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

describe("validate middleware", () => {
  it("llama next() cuando no hay errores de validación", async () => {
    const req = { body: { email: "user@example.com" } };
    await body("email").isEmail().run(req);

    const res = buildRes();
    const next = vi.fn();

    validate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("responde 422 con { errors: [...] } cuando hay errores", async () => {
    const req = { body: { email: "no-es-email" } };
    await body("email").isEmail().run(req);

    const res = buildRes();
    const next = vi.fn();

    validate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
    expect(res.body).toHaveProperty("errors");
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });
});

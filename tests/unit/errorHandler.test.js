import { describe, it, expect, vi, beforeEach } from "vitest";

// Unidad: errorHandler. Dependencias: fs / path / url. Se aísla `fs` con vi.mock para no
// escribir en disco durante el test (las llamadas se espían). Sin Express, sin HTTP, sin DB.
vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    appendFile: vi.fn((_path, _msg, cb) => {
      if (cb) cb(null);
    }),
  },
}));

import fs from "fs";
import errorHandler from "../../src/middlewares/errorHandler.js";

function buildRes() {
  const res = {
    statusCode: undefined,
    body: undefined,
    // Ojo: el código consulta `res.headerSent` (typo de Express, debería ser headersSent) -> D10.
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

describe("errorHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde 500 con payload genérico ante un error", () => {
    const err = new Error("boom");
    const req = { method: "GET", url: "/x" };
    const res = buildRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Internal Server Error",
    });
  });

  it("registra el error en el archivo de log (fs.appendFile)", () => {
    const err = new Error("boom");
    const req = { method: "POST", url: "/orders" };
    const res = buildRes();

    errorHandler(err, req, res, vi.fn());

    expect(fs.appendFile).toHaveBeenCalledTimes(1);
    const [, message] = fs.appendFile.mock.calls[0];
    expect(message).toContain("POST");
    expect(message).toContain("/orders");
    expect(message).toContain("boom");
  });
});

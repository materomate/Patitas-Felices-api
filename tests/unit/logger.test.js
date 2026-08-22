import { describe, it, expect, vi, afterEach } from "vitest";
import logger from "../../src/middlewares/logger.js";

// Unidad: logger. Dependencia: console.log. Sin Express, sin HTTP, sin DB.
describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("llama next() una vez", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const next = vi.fn();

    logger({ method: "GET", url: "/health" }, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("escribe en consola una línea con método y url", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    logger({ method: "GET", url: "/health" }, {}, vi.fn());

    expect(spy).toHaveBeenCalledTimes(1);
    const line = spy.mock.calls[0][0];
    expect(line).toContain("GET");
    expect(line).toContain("/health");
  });
});

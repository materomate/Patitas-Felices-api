import { describe, it, expect } from "vitest";
import { revokeToken, isRevoked } from "../../src/utils/tokenBlacklist.js";

// Unidad: tokenBlacklist. Store en memoria, sin Express, sin DB.
describe("tokenBlacklist (fix: JWT sin revocación)", () => {
  it("un token no revocado no está en la lista", () => {
    expect(isRevoked("token-nunca-revocado")).toBe(false);
  });

  it("revokeToken marca el token como revocado hasta su exp", () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    revokeToken("token-a", futureExp);

    expect(isRevoked("token-a")).toBe(true);
  });

  it("un token revocado ya expirado deja de considerarse revocado (se poda)", () => {
    const pastExp = Math.floor(Date.now() / 1000) - 10;
    revokeToken("token-b", pastExp);

    expect(isRevoked("token-b")).toBe(false);
  });

  it("ignora llamadas sin token o sin exp", () => {
    revokeToken(undefined, Math.floor(Date.now() / 1000) + 3600);
    revokeToken("token-c", undefined);

    expect(isRevoked("token-c")).toBe(false);
  });
});

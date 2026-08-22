// Los JWT son stateless: por sí solos no hay forma de invalidarlos antes de
// que expiren. Esta lista en memoria guarda los tokens revocados (logout)
// hasta su propio `exp`, para que authMiddleware pueda rechazarlos aunque la
// firma siga siendo válida.
const revokedTokens = new Map(); // token -> exp (segundos, epoch)

function pruneExpired() {
  const nowSeconds = Math.floor(Date.now() / 1000);
  for (const [token, exp] of revokedTokens) {
    if (exp <= nowSeconds) revokedTokens.delete(token);
  }
}

function revokeToken(token, expSeconds) {
  if (!token || !expSeconds) return;
  pruneExpired();
  revokedTokens.set(token, expSeconds);
}

function isRevoked(token) {
  pruneExpired();
  return revokedTokens.has(token);
}

export { revokeToken, isRevoked };

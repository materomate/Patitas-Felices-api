import rateLimit from "express-rate-limit";

// Sin este límite, /auth/login y /auth/register aceptan intentos ilimitados:
// permite fuerza bruta de contraseñas y automatizar la enumeración de emails
// registrados. 20 intentos / 15 min por IP es suficiente para un usuario real
// que se equivoca varias veces, pero frena la automatización.
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});

export default authRateLimiter;

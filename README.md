# ecommerce-api

Backend REST del e-commerce del curso React Full-Stack 2026-2. **Node + Express 5 + Mongoose (MongoDB)**, en **ES Modules** (`"type": "module"`).

> Estado y gaps del proyecto: [../docs/PROJECT_STATUS.md](../docs/PROJECT_STATUS.md). Mapa de endpoints: [../.claude/api-routes.md](../.claude/api-routes.md). Modelos: [../.claude/models.md](../.claude/models.md). Validadores: [../.claude/validators.md](../.claude/validators.md).

## Requisitos

- Node.js 18+
- MongoDB (local o remoto vía `MONGODB_URI`)

## Instalación y ejecución

```bash
npm install
cp .env.example .env     # ajusta valores
npm run dev              # nodemon server.js (recarga en caliente)
# npm start              # node server.js
npm run seedProducts     # limpia y siembra categorías + productos
```

## Variables de entorno (`.env`)

| Variable | Propósito |
|---|---|
| `PORT` | Puerto del servidor. **Usa `4000`**: el frontend consume `http://localhost:4000/api`. (El `.env.example` trae `3000`, que colisiona con el frontend.) |
| `MONGODB_URI` | Cadena de conexión a MongoDB (default en código: `mongodb://localhost:27017/ecommerce-db-test`). |
| `JWT_SECRET` | Secreto para firmar el access token. |
| `JWT_REFRESH_TOKEN` | Secreto para el refresh token. |
| `JWT_EXPIRES_IN` | Vigencia del access token (p. ej. `1h`). |
| `JWT_REFRESH_EXPIRES_IN` | Vigencia del refresh token (p. ej. `7d`). |

> `.env` está en `.gitignore` (no se versiona). Nunca lo commitees con valores reales.

## Arquitectura

`server.js` (entrypoint): middlewares globales en orden `cors({ origin: "http://localhost:3000", credentials: true })` → `express.json()` → `logger` → `errorHandler`; luego `connectDB()`, `GET /`, `app.use("/api", routes)` y catch-all 404.

```
src/
├── config/db.conf.js     # connectDB (mongoose.connect)
├── controllers/          # un controller por recurso (async + try/catch + next(error))
├── middlewares/          # authMiddleware, isAdminMiddleware, validation, errorHandler, logger
├── models/               # esquemas Mongoose
├── routes/               # un router por recurso + index.js agregador
└── seed/productsCategories.js
```

Flujo de una petición: `ruta → [authMiddleware] → [isAdminMiddleware] → <arrayValidación> → validate → controller`.

## Recursos

Montados en `src/routes/index.js`: `auth`, `cart`, `category`, `order`, `paymentMethod`, `product`, `user`, `wishlist`.

| Recurso | Estado |
|---|---|
| Products, Categories, Cart | Completo |
| Auth, Users | Completo (con bugs conocidos — ver PROJECT_STATUS) |
| Order, PaymentMethod, WishList | Funcional (no consumidos aún por el frontend) |
| **Address** | Modelo y controller existen, **pero el router no está montado** |

## Autenticación

JWT **Bearer** en header `Authorization`. Payload `{ userId, name, role }`. `authMiddleware` decodifica el token; `isAdminMiddleware` exige `role === "admin"`. Passwords con `bcrypt`. Validación con `express-validator` + middleware `validate` (responde `422` con array de errores).

## Bugs conocidos

Ver la tabla en [../docs/PROJECT_STATUS.md](../docs/PROJECT_STATUS.md#bugs-verificados-código) y los specs en [../docs/specs/](../docs/specs).

## Scripts

| Script | Acción |
|---|---|
| `npm start` | `node server.js` |
| `npm run dev` | `nodemon server.js` |
| `npm run seedProducts` | `node ./src/seed/productsCategories.js` |

# AGENTS.md — ecommerce-api

Guía para agentes de IA que trabajen sobre `ecommerce-api/`. Backend Node.js + Express 5 + Mongoose
(MongoDB), ES Modules (`"type": "module"`). Todo el contenido de este archivo está basado en el código
real presente en `ecommerce-api/src/` y `ecommerce-api/server.js`.

## Estructura de directorios (`src/`)

```
src/
├── config/
│   └── db.conf.js              # connectDB() — mongoose.connect
├── controllers/
│   ├── addressController.js    # getUserAddresses, getAddressById, createAddress, updateAddress, deleteAddress
│   ├── authController.js       # register, login
│   ├── cartController.js       # getCarts, getCartById, getCartByUser, createCart, updateCart, deleteCart
│   ├── categoryController.js   # getCategories, getCategoryById, createCategory, updateCategory, deleteCategory, getProductsByCategoryAndChildren
│   ├── orderController.js      # getOrders, getOrderById, createOrder, updateOrderStatus
│   ├── paymentMethodController.js # getPaymentMethods, getPaymentMethodById, createPaymentMethod, updatePaymentMethod, deletePaymentMethod
│   ├── productController.js    # searchProducts, getProducts, getProductById, createProduct, updateProduct, deleteProduct
│   ├── userController.js       # getUsers, getUserById, createUser, updateUser, deleteUser
│   └── wishlistController.js   # getWishlists, getWishlistByUser, addProductToWishlist, removeProductFromWishlist, deleteWishlist
├── middlewares/
│   ├── authMiddleware.js       # valida JWT (Authorization: Bearer <token>) → req.user
│   ├── errorHandler.js         # loguea a logs/error.log y responde 500 genérico
│   ├── isAdminMiddleware.js    # requiere req.user.role === "admin"
│   ├── logger.js               # console.log de cada request (timestamp | method | url)
│   └── validation.js           # `validate` — corta con 422 si express-validator tiene errores
├── models/
│   ├── Address.js
│   ├── Cart.js
│   ├── Category.js
│   ├── Order.js
│   ├── PaymentMethod.js
│   ├── Product.js
│   ├── User.js
│   └── WhishList.js            # nombre de archivo real (con "h"); el modelo registrado es "WishList"
├── routes/
│   ├── authRoutes.js
│   ├── cartRoutes.js
│   ├── categoryRoutes.js
│   ├── index.js                 # agrega todos los routers, se monta en `/api` desde server.js
│   ├── orderRoutes.js
│   ├── paymentMethodRoutes.js
│   ├── productRoutes.js
│   ├── userRoutes.js
│   └── wishlistRoutes.js
└── seed/
    └── productsCategories.js    # script de siembra (npm run seedProducts)
```

`server.js` (raíz de `ecommerce-api/`) es el entrypoint: crea `app`, aplica `cors({ origin:
"http://localhost:3000", credentials: true })` → `express.json()` → `logger` → `errorHandler`, llama
`connectDB()`, define `GET /` (texto plano), monta `app.use("/api", routes)` y un catch-all 404 al final
que responde `{ error, method, url }`. `port = process.env.PORT || 3000`.

`src/config/db.conf.js`: `connectDB` usa `mongoose.connect(process.env.MONGODB_URI ||
"mongodb://localhost:27017/ecommerce-db-test")`; en error hace `console.error` + `process.exit(1)`.

## Mapa de rutas API

Todas las rutas se montan bajo el prefijo `/api` (definido en `server.js`). "Auth" = requiere
`authMiddleware` (JWT válido). "Admin" = además requiere `isAdminMiddleware` (`req.user.role === "admin"`).

### `/api/auth` (`authRoutes.js`)

| Método | Path            | Auth | Admin | Controller |
|--------|-----------------|------|-------|------------|
| POST   | `/auth/register`| No   | No    | `register` |
| POST   | `/auth/login`   | No   | No    | `login`    |

### Carts (`cartRoutes.js`)

| Método | Path              | Auth | Admin | Controller     |
|--------|-------------------|------|-------|-----------------|
| GET    | `/cart`           | Sí   | Sí    | `getCarts`      |
| GET    | `/cart/:id`       | Sí   | Sí    | `getCartById`   |
| GET    | `/cart/user/:id`  | Sí   | No    | `getCartByUser` |
| POST   | `/cart`           | Sí   | No    | `createCart`    |
| PUT    | `/cart/:id`       | Sí   | No    | `updateCart`    |
| DELETE | `/cart/:id`       | Sí   | No    | `deleteCart`    |

### Categories (`categoryRoutes.js`)

| Método | Path                       | Auth | Admin | Controller                       |
|--------|----------------------------|------|-------|-----------------------------------|
| GET    | `/categories`              | No   | No    | `getCategories`                   |
| GET    | `/categories/:id/products` | No   | No    | `getProductsByCategoryAndChildren`|
| GET    | `/categories/:id`          | No   | No    | `getCategoryById`                 |
| POST   | `/categories`              | Sí   | Sí    | `createCategory`                  |
| PUT    | `/categories/:id`          | Sí   | Sí    | `updateCategory`                  |
| DELETE | `/categories/:id`          | Sí   | Sí    | `deleteCategory`                  |

### Orders (`orderRoutes.js`)

| Método | Path          | Auth | Admin | Controller          |
|--------|---------------|------|-------|-----------------------|
| GET    | `/orders`     | Sí   | Sí    | `getOrders`           |
| GET    | `/orders/:id` | Sí   | No    | `getOrderById`        |
| POST   | `/orders`     | Sí   | No    | `createOrder`         |
| PUT    | `/orders/:id` | Sí   | No    | `updateOrderStatus`   |

### Payment Methods (`paymentMethodRoutes.js`)

| Método | Path                    | Auth | Admin | Controller             |
|--------|-------------------------|------|-------|--------------------------|
| GET    | `/payment-methods`      | Sí   | Sí    | `getPaymentMethods`      |
| GET    | `/payment-methods/:id`  | Sí   | Sí    | `getPaymentMethodById`   |
| POST   | `/payment-methods`      | Sí   | No    | `createPaymentMethod`    |
| PUT    | `/payment-methods/:id`  | Sí   | No    | `updatePaymentMethod`    |
| DELETE | `/payment-methods/:id`  | Sí   | No    | `deletePaymentMethod`    |

### Products (`productRoutes.js`)

| Método | Path              | Auth | Admin | Controller       |
|--------|-------------------|------|-------|--------------------|
| GET    | `/products/search`| No   | No    | `searchProducts`   |
| GET    | `/products`       | No   | No    | `getProducts`      |
| GET    | `/products/:id`   | No   | No    | `getProductById`   |
| POST   | `/products`       | Sí   | Sí    | `createProduct`    |
| PUT    | `/products/:id`   | Sí   | Sí    | `updateProduct`    |
| DELETE | `/products/:id`   | Sí   | Sí    | `deleteProduct`    |

### Users (`userRoutes.js`)

| Método | Path        | Auth | Admin | Controller    |
|--------|-------------|------|-------|-----------------|
| GET    | `/users`    | Sí   | Sí    | `getUsers`      |
| GET    | `/users/:id`| Sí   | Sí    | `getUserById`   |
| POST   | `/users`    | Sí   | Sí    | `createUser`    |
| PUT    | `/users/:id`| Sí   | Sí    | `updateUser`    |
| DELETE | `/users/:id`| Sí   | Sí    | `deleteUser`    |

### Wishlist (`wishlistRoutes.js`)

| Método | Path                     | Auth | Admin | Controller                |
|--------|--------------------------|------|-------|------------------------------|
| GET    | `/wishlist`              | Sí   | Sí    | `getWishlists`               |
| GET    | `/wishlist/user/:id`     | Sí   | No    | `getWishlistByUser`          |
| POST   | `/wishlist`              | Sí   | No    | `addProductToWishlist`       |
| DELETE | `/wishlist/:id/product`  | Sí   | No    | `removeProductFromWishlist`  |
| DELETE | `/wishlist/:id`          | Sí   | No    | `deleteWishlist`             |

`src/controllers/addressController.js` existe (`getUserAddresses`, `getAddressById`, `createAddress`,
`updateAddress`, `deleteAddress`) pero no tiene archivo de rutas propio ni está importado en
`src/routes/index.js`: no expone endpoints bajo `/api`.

## Modelos Mongoose

Todos con `{ timestamps: true }`.

### `User` (`models/User.js`)
| Campo    | Tipo   | Detalle                                          |
|----------|--------|---------------------------------------------------|
| name     | String | required, trim                                     |
| email    | String | required, unique, trim, lowercase                   |
| password | String | required                                            |
| role     | String | enum `["customer", "admin"]`, default `"customer"`  |

### `Product` (`models/Product.js`)
| Campo       | Tipo     | Detalle                                            |
|-------------|----------|------------------------------------------------------|
| name        | String   | required, trim                                        |
| description | String   | —                                                     |
| price       | Number   | required                                              |
| stock       | Number   | default `0`                                           |
| imageURL    | String   | default `"https://placehold.co/600x400"`              |
| category    | ObjectId | ref `"Category"`                                      |

### `Category` (`models/Category.js`)
| Campo          | Tipo     | Detalle                                             |
|----------------|----------|--------------------------------------------------------|
| name           | String   | required, trim                                          |
| description    | String   | required                                                |
| imageURL       | String   | required, default `"https://placehold.co/800x600.png"`  |
| parentCategory | ObjectId | ref `"Category"`, default `null`                        |

### `Cart` (`models/Cart.js`)
| Campo             | Tipo     | Detalle                        |
|-------------------|----------|----------------------------------|
| user              | ObjectId | ref `"User"`, required           |
| products          | Array    | subdocumentos                    |
| products[].product| ObjectId | ref `"Product"`, required        |
| products[].quantity| Number  | required, min `1`                |

### `Order` (`models/Order.js`)
| Campo               | Tipo     | Detalle                                                       |
|---------------------|----------|-----------------------------------------------------------------|
| user                | ObjectId | ref `"User"`, required                                           |
| products            | Array    | subdocumentos                                                    |
| products[].productId| ObjectId | ref `"Product"`, required                                        |
| products[].quantity | Number   | required, min `1`                                                |
| products[].price    | Number   | required                                                         |
| address             | ObjectId | ref `"Address"`, required                                        |
| paymentMethod       | ObjectId | ref `"PaymentMethod"`, required                                  |
| shippingCost        | Number   | required, default `0`                                            |
| totalPrice          | Number   | required                                                         |
| status              | String   | enum `["pending","processing","shipped","delivered","cancelled"]`, default `"pending"` |
| paymentStatus       | String   | enum `["pending","paid","failed","refunded"]`, default `"pending"` |

### `PaymentMethod` (`models/PaymentMethod.js`)
| Campo          | Tipo    | Detalle                                                                    |
|----------------|---------|-------------------------------------------------------------------------------|
| user           | ObjectId| ref `"User"`, required                                                         |
| type           | String  | required, enum `["credit_card","debit_card","paypal","bank_transfer","cash_on_delivery"]` |
| cardNumber     | String  | max `16`                                                                        |
| cardHolderName | String  | trim                                                                            |
| expiryDate     | String  | —                                                                               |
| paypalEmail    | String  | —                                                                               |
| bankName       | String  | —                                                                               |
| accountNumber  | String  | —                                                                               |
| isDefault      | Boolean | default `false`                                                                 |
| isActive       | Boolean | default `true`                                                                  |
| cvv            | String  | —                                                                               |

### `Address` (`models/Address.js`)
| Campo       | Tipo    | Detalle                                          |
|-------------|---------|-----------------------------------------------------|
| user        | ObjectId| ref `"User"`, required                               |
| address     | String  | required, trim                                       |
| city        | String  | required, trim                                       |
| state       | String  | required, trim                                       |
| postalCode  | String  | required, min `4`, max `6`, trim                     |
| country     | String  | required, trim                                       |
| phone       | String  | required, max `10`, trim                             |
| isDefault   | Boolean | default `false`                                      |
| addressType | String  | enum `["home","work","other"]`, default `"home"`     |

### `WishList` (`models/WhishList.js`)
| Campo    | Tipo     | Detalle                          |
|----------|----------|------------------------------------|
| user     | ObjectId | ref `"User"`, required             |
| products | Array    | de ObjectId, ref `"Product"`, required cada uno |

## Validadores (`express-validator`, listados por nombre)

Definidos como arrays de cadenas `body()`/`param()` en cada archivo de rutas, seguidos siempre del
middleware `validate` (`src/middlewares/validation.js`, responde `422 { errors: [...] }` si hay fallos).

- `cartRoutes.js`: `cartIdValidation`, `userIdValidation`, `createCartValidation`, `putCartValidation`
- `categoryRoutes.js`: `categoryIdValidation`, `createCategoryValidation`, `updateCategoryValidation`
- `orderRoutes.js`: `orderIdValidation`, `createOrderValidation`, `updateOrderStatusValidation`
- `paymentMethodRoutes.js`: `paymentIdValidation`, `createPaymentValidation`, `updatePaymentValidation`
- `productRoutes.js`: `productIdValidation`, `createProductValidation`, `updateProductValidation`
- `userRoutes.js`: `userIdValidation`, `createUserValidation`, `updateUserValidation`
- `wishlistRoutes.js`: `wishlistIdValidation`, `userIdValidation`, `addProductValidation`, `removeProductValidation`

`authRoutes.js` no define validadores propios (`register`/`login` no tienen array de validación en la ruta).

## Patrón exacto de código

- **Imports ESM**: siempre con extensión `.js` explícita (`import Product from "../models/Product.js"`).
- **Controllers**: funciones `const nombre = async (req, res, next) => { try { ... } catch (error) {
  next(error) } }`, exportadas al final con `export { fn1, fn2, ... }`.
- **Mongoose**: `Model.find(filters).populate(...).sort(...).skip(...).limit(...)`,
  `Model.findById(id)`, `Model.create({...})`, `Model.findByIdAndUpdate(id, {...}, { new: true })`,
  `Model.findByIdAndDelete(id)`, `Model.countDocuments(filters)`, `.populate("campo")`.
- **Respuestas**: `res.status(200).json(obj)` / `res.json(obj)` en GET; `res.status(201).json(nuevo)` en
  creación; `res.status(204).send()` en delete exitoso; `res.status(404).json({ message: "... not
  found" })` cuando no existe el recurso.
- **Rutas**: cada router es `express.Router()`; arrays de validación declarados arriba del archivo;
  orden de middlewares en la definición de ruta: `authMiddleware` → `isAdmin` (si aplica) → array de
  validación → `validate` → controller (el orden exacto de `authMiddleware`/validación varía ligeramente
  entre archivos, ver tabla de rutas arriba).
  `routes/index.js` agrega todos los routers; solo `authRoutes` se monta con prefijo explícito
  (`router.use("/auth", authRoutes)`), el resto se monta en raíz porque cada ruta ya incluye su propio
  prefijo (p. ej. `/cart`, `/products`).
- **Auth**: `authMiddleware` lee `Authorization: Bearer <token>`, verifica con `jwt.verify(token,
  process.env.JWT_SECRET, ...)` y asigna `req.user = decoded` (payload: `{ userId, name, role }`).
  `isAdminMiddleware` exige `req.user.role === "admin"` (401 si no hay `req.user`, 403 si no es admin).
- **Passwords**: `bcrypt.hash(password, 10)` en registro, `bcrypt.compare` en login.
- **Tokens**: `jwt.sign({ userId, name, role }, JWT_SECRET, { expiresIn: "1h" })` para el access token;
  `jwt.sign({ userId }, JWT_REFRESH_TOKEN, { expiresIn: "7d" })` para el refresh token.
- **Errores no controlados**: `errorHandler` escribe en `logs/error.log` (crea el directorio si no
  existe) y responde `500 { status: "error", message: "Internal Server Error" }` si aún no se envió
  respuesta.

## Restricciones para el agente

- Trabajar y documentar **solo sobre el código real** de este repositorio. No inventar endpoints,
  campos, modelos, validadores ni comportamiento que no esté en el código.
- **No** incluir sugerencias, mejoras, refactors ni "buenas prácticas" no solicitadas explícitamente.
- **No** listar trabajo pendiente, TODOs ni deuda técnica.
- Respetar la convención existente: ES Modules con imports `.js`, controllers `try/catch + next(error)`,
  validación con `express-validator` + middleware `validate`, respuestas y códigos de estado como se
  documentan arriba.

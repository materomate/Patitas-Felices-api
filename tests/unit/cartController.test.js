import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  afterEach,
} from "vitest";
import mongoose from "mongoose";
import { connect, clearDatabase, disconnect } from "../helpers/db.js";
import Cart from "../../src/models/Cart.js";
import User from "../../src/models/User.js";
import Product from "../../src/models/Product.js";
import {
  getCarts,
  getCartById,
  getCartByUser,
  createCart,
  updateCart,
  deleteCart,
  addProductToCart,
} from "../../src/controllers/cartController.js";

// Unidad: cartController por invocación directa + memory-server. Sin Express, sin HTTP.
const oid = () => new mongoose.Types.ObjectId();

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
    send: vi.fn(function () {
      return this;
    }),
  };
  return res;
}

async function seedRefs() {
  const user = await User.create({ name: "U", email: "u@x.com", password: "h" });
  const product = await Product.create({ name: "Widget", price: 10, stock: 5 });
  return { user, product };
}

beforeAll(async () => {
  await connect();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnect();
});

// ─── getCarts ──────────────────────────────────────────────────────────────

describe("cartController.getCarts", () => {
  it("responde con la lista de carritos", async () => {
    const { user, product } = await seedRefs();
    await Cart.create({ user: user._id, products: [{ product: product._id, quantity: 1 }] });

    const res = buildRes();
    await getCarts({}, res, vi.fn());

    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.body).toHaveLength(1);
  });
});

// ─── getCartById ───────────────────────────────────────────────────────────

describe("cartController.getCartById", () => {
  it("responde con el carrito si existe", async () => {
    const { user, product } = await seedRefs();
    const cart = await Cart.create({
      user: user._id,
      products: [{ product: product._id, quantity: 2 }],
    });
    const res = buildRes();

    await getCartById({ params: { id: cart._id.toString() } }, res, vi.fn());

    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.body._id.toString()).toBe(cart._id.toString());
  });

  it("responde 404 si el carrito no existe", async () => {
    const res = buildRes();
    await getCartById({ params: { id: oid().toString() } }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ message: "Cart not found" });
  });
});

// ─── getCartByUser ─────────────────────────────────────────────────────────

describe("cartController.getCartByUser", () => {
  it("responde con el carrito del usuario cuando el solicitante es el dueño", async () => {
    const { user, product } = await seedRefs();
    await Cart.create({ user: user._id, products: [{ product: product._id, quantity: 1 }] });
    const req = {
      params: { id: user._id.toString() },
      user: { userId: user._id.toString() },
    };
    const res = buildRes();

    await getCartByUser(req, res, vi.fn());

    expect(res.json).toHaveBeenCalledTimes(1);
  });

  it("responde 404 si el usuario no tiene carrito", async () => {
    const requester = oid();
    const req = {
      params: { id: requester.toString() },
      user: { userId: requester.toString() },
    };
    const res = buildRes();
    await getCartByUser(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ message: "No cart found for this user" });
  });

  it("IDOR fix: responde 403 si un usuario pide el carrito de otro", async () => {
    const { user, product } = await seedRefs();
    await Cart.create({ user: user._id, products: [{ product: product._id, quantity: 1 }] });
    const attacker = oid();
    const req = {
      params: { id: user._id.toString() },
      user: { userId: attacker.toString() },
    };
    const res = buildRes();

    await getCartByUser(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("IDOR fix: un admin sí puede consultar el carrito de otro usuario", async () => {
    const { user, product } = await seedRefs();
    await Cart.create({ user: user._id, products: [{ product: product._id, quantity: 1 }] });
    const req = {
      params: { id: user._id.toString() },
      user: { userId: oid().toString(), role: "admin" },
    };
    const res = buildRes();

    await getCartByUser(req, res, vi.fn());

    expect(res.json).toHaveBeenCalledTimes(1);
  });
});

// ─── createCart ────────────────────────────────────────────────────────────

describe("cartController.createCart", () => {
  it("responde 201 y persiste el carrito", async () => {
    const { user, product } = await seedRefs();
    const req = {
      body: {
        user: user._id.toString(),
        products: [{ product: product._id.toString(), quantity: 1 }],
      },
      user: { userId: user._id.toString() },
    };
    const res = buildRes();

    await createCart(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(await Cart.countDocuments()).toBe(1);
  });

  it("D7 (defecto conocido): responde 404 en vez de 400/422 cuando faltan datos requeridos", async () => {
    const req = { body: { user: null, products: null }, user: { userId: oid().toString() } };
    const res = buildRes();

    await createCart(req, res, vi.fn());

    // D7: línea 50 — debería ser 400 o 422, retorna 404
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body.error).toBeDefined();
  });

  it("IDOR fix: responde 403 si el body.user no coincide con el usuario autenticado", async () => {
    const { user, product } = await seedRefs();
    const req = {
      body: {
        user: user._id.toString(),
        products: [{ product: product._id.toString(), quantity: 1 }],
      },
      user: { userId: oid().toString() },
    };
    const res = buildRes();

    await createCart(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(await Cart.countDocuments()).toBe(0);
  });
});

// ─── updateCart ────────────────────────────────────────────────────────────

describe("cartController.updateCart", () => {
  it("responde 200 con el carrito actualizado", async () => {
    const { user, product } = await seedRefs();
    const cart = await Cart.create({
      user: user._id,
      products: [{ product: product._id, quantity: 1 }],
    });
    const req = {
      params: { id: cart._id.toString() },
      body: {
        user: user._id.toString(),
        products: [{ product: product._id.toString(), quantity: 3 }],
      },
      user: { userId: user._id.toString() },
    };
    const res = buildRes();

    await updateCart(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.products[0].quantity).toBe(3);
  });

  it("responde 404 si el carrito no existe", async () => {
    const { user, product } = await seedRefs();
    const req = {
      params: { id: oid().toString() },
      body: {
        user: user._id.toString(),
        products: [{ product: product._id.toString(), quantity: 1 }],
      },
      user: { userId: user._id.toString() },
    };
    const res = buildRes();

    await updateCart(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ message: "Cart not found" });
  });

  it("IDOR fix: responde 403 si un usuario intenta modificar el carrito de otro", async () => {
    const { user, product } = await seedRefs();
    const cart = await Cart.create({
      user: user._id,
      products: [{ product: product._id, quantity: 1 }],
    });
    const attacker = oid();
    const req = {
      params: { id: cart._id.toString() },
      body: {
        user: user._id.toString(),
        products: [{ product: product._id.toString(), quantity: 99 }],
      },
      user: { userId: attacker.toString() },
    };
    const res = buildRes();

    await updateCart(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    const stored = await Cart.findById(cart._id);
    expect(stored.products[0].quantity).toBe(1);
  });

  it("IDOR fix: responde 403 si el dueño intenta reasignar el carrito a otro usuario", async () => {
    const { user, product } = await seedRefs();
    const cart = await Cart.create({
      user: user._id,
      products: [{ product: product._id, quantity: 1 }],
    });
    const victim = oid();
    const req = {
      params: { id: cart._id.toString() },
      body: {
        user: victim.toString(),
        products: [{ product: product._id.toString(), quantity: 1 }],
      },
      user: { userId: user._id.toString() },
    };
    const res = buildRes();

    await updateCart(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ─── deleteCart ────────────────────────────────────────────────────────────

describe("cartController.deleteCart", () => {
  it("responde 204 y elimina el carrito", async () => {
    const { user, product } = await seedRefs();
    const cart = await Cart.create({
      user: user._id,
      products: [{ product: product._id, quantity: 1 }],
    });
    const req = {
      params: { id: cart._id.toString() },
      user: { userId: user._id.toString() },
    };
    const res = buildRes();

    await deleteCart(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(204);
    expect(await Cart.findById(cart._id)).toBeNull();
  });

  it("D14 (defecto conocido): responde 400 en vez de 404 cuando el carrito no existe", async () => {
    const req = { params: { id: oid().toString() }, user: { userId: oid().toString() } };
    const res = buildRes();
    await deleteCart(req, res, vi.fn());

    // D14: línea 129 — debería ser 404, retorna 400
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({ message: "Cart not found" });
  });

  it("IDOR fix: responde 403 si un usuario intenta borrar el carrito de otro", async () => {
    const { user, product } = await seedRefs();
    const cart = await Cart.create({
      user: user._id,
      products: [{ product: product._id, quantity: 1 }],
    });
    const attacker = oid();
    const req = {
      params: { id: cart._id.toString() },
      user: { userId: attacker.toString() },
    };
    const res = buildRes();

    await deleteCart(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(await Cart.findById(cart._id)).not.toBeNull();
  });
});

// ─── addProductToCart ──────────────────────────────────────────────────────

describe("cartController.addProductToCart", () => {
  it("D4 (defecto crítico): addProductToCart siempre lanza StrictPopulateError → next(error), res.json nunca se llama", async () => {
    const { user, product } = await seedRefs();
    const req = {
      body: { userId: user._id.toString(), productId: product._id.toString(), quantity: 1 },
    };
    const res = buildRes();
    const next = vi.fn();

    await addProductToCart(req, res, next);

    // D4: línea 160 — cart.populate("products.productId") no existe en el schema (campo real: "products.product")
    // Mongoose 8 lanza StrictPopulateError → next(error) siempre, el cliente NUNCA recibe respuesta
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].name).toBe("StrictPopulateError");
    expect(res.json).not.toHaveBeenCalled();
  });

  it("D4 (efecto secundario): pese al crash, la cart SÍ queda guardada en DB", async () => {
    const { user, product } = await seedRefs();
    const req = {
      body: { userId: user._id.toString(), productId: product._id.toString(), quantity: 1 },
    };

    await addProductToCart(req, buildRes(), vi.fn());

    // cart.save() ocurre antes del crash → el documento existe en DB
    expect(await Cart.countDocuments()).toBe(1);
  });

  it("D4 (efecto secundario): la acumulación de cantidad se persiste en DB pese al crash", async () => {
    const { user, product } = await seedRefs();
    await Cart.create({ user: user._id, products: [{ product: product._id, quantity: 2 }] });

    const req = {
      body: { userId: user._id.toString(), productId: product._id.toString(), quantity: 3 },
    };

    await addProductToCart(req, buildRes(), vi.fn());

    // cart.save() ejecuta antes del crash → la cantidad fue actualizada
    const stored = await Cart.findOne({ user: user._id });
    expect(stored.products[0].quantity).toBe(5); // 2 + 3
  });
});

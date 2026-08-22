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
import Order from "../../src/models/Order.js";
import Address from "../../src/models/Address.js";
import PaymentMethod from "../../src/models/PaymentMethod.js";
// El modelo se usa solo por su registro en Mongoose para que populate() no lance MissingSchemaError.
import "../../src/models/User.js";
import "../../src/models/Product.js";
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
} from "../../src/controllers/orderController.js";

// Unidad: orderController por invocación directa + memory-server. Sin Express, sin HTTP.
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

function orderBody(overrides = {}) {
  return {
    user: oid(),
    products: [{ productId: oid(), quantity: 1, price: 99 }],
    address: oid(),
    paymentMethod: oid(),
    totalPrice: 99,
    shippingCost: 0,
    ...overrides,
  };
}

const addrBody = {
  address: "Calle 1",
  city: "CDMX",
  state: "CDMX",
  postalCode: "01000",
  country: "México",
  phone: "5512345678",
};

const pmBody = {
  type: "credit_card",
  cardNumber: "1234567890123456",
  cardHolderName: "Test User",
  expiryDate: "12/28",
};

// createOrder ahora valida que `address` y `paymentMethod` sean documentos
// reales que pertenezcan a `user`, así que hay que sembrarlos de verdad.
async function seedOwnedOrderRefs(userId) {
  const address = await Address.create({ user: userId, ...addrBody });
  const paymentMethod = await PaymentMethod.create({ user: userId, ...pmBody });
  return { address, paymentMethod };
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

describe("orderController.getOrders", () => {
  it("responde con la lista de órdenes", async () => {
    await Order.create(orderBody());
    const res = buildRes();

    await getOrders({}, res, vi.fn());

    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.body).toHaveLength(1);
  });
});

describe("orderController.getOrderById", () => {
  it("responde con la orden si existe", async () => {
    const o = await Order.create(orderBody());
    const res = buildRes();

    await getOrderById({ params: { id: o._id.toString() } }, res, vi.fn());

    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.body._id.toString()).toBe(o._id.toString());
  });

  it("responde 404 si la orden no existe", async () => {
    const res = buildRes();

    await getOrderById({ params: { id: oid().toString() } }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ message: "Order not found" });
  });
});

describe("orderController.createOrder", () => {
  it("responde 201 y persiste la orden en DB cuando address/paymentMethod son del usuario", async () => {
    const userId = oid();
    const { address, paymentMethod } = await seedOwnedOrderRefs(userId);
    const req = {
      body: orderBody({
        user: userId.toString(),
        address: address._id.toString(),
        paymentMethod: paymentMethod._id.toString(),
      }),
      user: { userId: userId.toString() },
    };
    const res = buildRes();

    await createOrder(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(await Order.countDocuments()).toBe(1);
  });

  it("IDOR fix: responde 403 si el body.user no coincide con el usuario autenticado", async () => {
    const userId = oid();
    const { address, paymentMethod } = await seedOwnedOrderRefs(userId);
    const req = {
      body: orderBody({
        user: userId.toString(),
        address: address._id.toString(),
        paymentMethod: paymentMethod._id.toString(),
      }),
      user: { userId: oid().toString() },
    };
    const res = buildRes();

    await createOrder(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(await Order.countDocuments()).toBe(0);
  });

  it("IDOR fix: responde 400 si address/paymentMethod pertenecen a otro usuario", async () => {
    const userId = oid();
    const { address, paymentMethod } = await seedOwnedOrderRefs(oid()); // pertenecen a otro usuario
    const req = {
      body: orderBody({
        user: userId.toString(),
        address: address._id.toString(),
        paymentMethod: paymentMethod._id.toString(),
      }),
      user: { userId: userId.toString() },
    };
    const res = buildRes();

    await createOrder(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(await Order.countDocuments()).toBe(0);
  });
});

describe("orderController.updateOrderStatus", () => {
  it("actualiza el status y responde con la orden actualizada", async () => {
    const o = await Order.create(orderBody());
    const req = {
      params: { id: o._id.toString() },
      body: { status: "processing", paymentStatus: "paid" },
    };
    const res = buildRes();

    await updateOrderStatus(req, res, vi.fn());

    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.body.status).toBe("processing");
    expect(res.body.paymentStatus).toBe("paid");
  });

  it("D6 (defecto conocido): responde 204 en vez de 404 cuando la orden no existe", async () => {
    const req = {
      params: { id: oid().toString() },
      body: { status: "shipped" },
    };
    const res = buildRes();

    await updateOrderStatus(req, res, vi.fn());

    // D6: línea 69 de orderController.js — debería ser 404, retorna 204
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.body).toEqual({ message: "Order not found" });
  });
});

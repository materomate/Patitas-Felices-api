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
import PaymentMethod from "../../src/models/PaymentMethod.js";
import User from "../../src/models/User.js";
import {
  getPaymentMethods,
  getPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from "../../src/controllers/paymentMethodController.js";

// Unidad: paymentMethodController por invocación directa + memory-server. Sin Express, sin HTTP.
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

function pmBody(userId, overrides = {}) {
  return {
    user: userId,
    type: "credit_card",
    cardNumber: "1234567890123456",
    cardHolderName: "Test User",
    expiryDate: "12/28",
    isDefault: false,
    ...overrides,
  };
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

// ─── getPaymentMethods ─────────────────────────────────────────────────────

describe("paymentMethodController.getPaymentMethods", () => {
  it("responde 200 con la lista de métodos de pago", async () => {
    const user = await User.create({ name: "U", email: "u@x.com", password: "h" });
    await PaymentMethod.create(pmBody(user._id));

    const res = buildRes();
    await getPaymentMethods({}, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toHaveLength(1);
  });
});

// ─── getPaymentMethodById ──────────────────────────────────────────────────

describe("paymentMethodController.getPaymentMethodById", () => {
  it("responde 200 si el método de pago existe", async () => {
    const user = await User.create({ name: "U", email: "u@x.com", password: "h" });
    const pm = await PaymentMethod.create(pmBody(user._id));
    const res = buildRes();

    await getPaymentMethodById({ params: { id: pm._id.toString() } }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body._id.toString()).toBe(pm._id.toString());
  });

  it("responde 404 si no existe", async () => {
    const res = buildRes();
    await getPaymentMethodById({ params: { id: oid().toString() } }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ message: "Payment method not found" });
  });
});

// ─── createPaymentMethod ───────────────────────────────────────────────────

describe("paymentMethodController.createPaymentMethod", () => {
  it("responde 201 y persiste el método de pago", async () => {
    const user = await User.create({ name: "U", email: "u@x.com", password: "h" });
    const req = {
      body: pmBody(user._id.toString()),
      user: { userId: user._id.toString() },
    };
    const res = buildRes();

    await createPaymentMethod(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(await PaymentMethod.countDocuments()).toBe(1);
  });

  it("nunca persiste el cvv aunque venga en el body", async () => {
    const user = await User.create({ name: "U", email: "u@x.com", password: "h" });
    const req = {
      body: { ...pmBody(user._id.toString()), cvv: "123" },
      user: { userId: user._id.toString() },
    };
    const res = buildRes();

    await createPaymentMethod(req, res, vi.fn());

    const stored = await PaymentMethod.findOne();
    expect(stored.toObject().cvv).toBeUndefined();
  });

  it("al crear isDefault=true, el método anterior del usuario queda en isDefault=false", async () => {
    const user = await User.create({ name: "U", email: "u@x.com", password: "h" });
    const existing = await PaymentMethod.create(pmBody(user._id, { isDefault: true }));

    const req = {
      body: pmBody(user._id.toString(), {
        cardNumber: "9999999999999999",
        isDefault: true,
      }),
      user: { userId: user._id.toString() },
    };
    const res = buildRes();

    await createPaymentMethod(req, res, vi.fn());

    const refreshed = await PaymentMethod.findById(existing._id);
    expect(refreshed.isDefault).toBe(false);
    expect(res.body.isDefault).toBe(true);
  });

  it("IDOR fix: responde 403 si el body.user no coincide con el usuario autenticado", async () => {
    const user = await User.create({ name: "U", email: "u@x.com", password: "h" });
    const req = {
      body: pmBody(user._id.toString()),
      user: { userId: oid().toString() },
    };
    const res = buildRes();

    await createPaymentMethod(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(await PaymentMethod.countDocuments()).toBe(0);
  });
});

// ─── updatePaymentMethod ───────────────────────────────────────────────────

describe("paymentMethodController.updatePaymentMethod", () => {
  it("responde 200 con el método actualizado", async () => {
    const user = await User.create({ name: "U", email: "u@x.com", password: "h" });
    const pm = await PaymentMethod.create(pmBody(user._id));
    const req = {
      params: { id: pm._id.toString() },
      body: { ...pmBody(user._id.toString()), cardHolderName: "Nuevo Nombre" },
      user: { userId: user._id.toString() },
    };
    const res = buildRes();

    await updatePaymentMethod(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.cardHolderName).toBe("Nuevo Nombre");
  });

  it("responde 404 si el método no existe", async () => {
    const req = {
      params: { id: oid().toString() },
      body: pmBody(oid().toString()),
      user: { userId: oid().toString() },
    };
    const res = buildRes();

    await updatePaymentMethod(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ message: "Payment method not found" });
  });

  it("IDOR fix: responde 403 si un usuario intenta modificar el método de pago de otro", async () => {
    const owner = await User.create({ name: "U", email: "u@x.com", password: "h" });
    const pm = await PaymentMethod.create(pmBody(owner._id));
    const req = {
      params: { id: pm._id.toString() },
      body: { ...pmBody(owner._id.toString()), cardHolderName: "Atacante" },
      user: { userId: oid().toString() },
    };
    const res = buildRes();

    await updatePaymentMethod(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    const stored = await PaymentMethod.findById(pm._id);
    expect(stored.cardHolderName).toBe("Test User");
  });
});

// ─── deletePaymentMethod ───────────────────────────────────────────────────

describe("paymentMethodController.deletePaymentMethod", () => {
  it("responde 204 y elimina el método de pago", async () => {
    const user = await User.create({ name: "U", email: "u@x.com", password: "h" });
    const pm = await PaymentMethod.create(pmBody(user._id));
    const req = {
      params: { id: pm._id.toString() },
      user: { userId: user._id.toString() },
    };
    const res = buildRes();

    await deletePaymentMethod(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(204);
    expect(await PaymentMethod.findById(pm._id)).toBeNull();
  });

  it("responde 404 si el método no existe", async () => {
    const req = { params: { id: oid().toString() }, user: { userId: oid().toString() } };
    const res = buildRes();
    await deletePaymentMethod(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ message: "Payment method not found" });
  });

  it("IDOR fix: responde 403 si un usuario intenta borrar el método de pago de otro", async () => {
    const owner = await User.create({ name: "U", email: "u@x.com", password: "h" });
    const pm = await PaymentMethod.create(pmBody(owner._id));
    const req = {
      params: { id: pm._id.toString() },
      user: { userId: oid().toString() },
    };
    const res = buildRes();

    await deletePaymentMethod(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(await PaymentMethod.findById(pm._id)).not.toBeNull();
  });
});

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
} from "vitest";
import mongoose from "mongoose";
import { connect, clearDatabase, disconnect } from "../helpers/db.js";

import User from "../../src/models/User.js";
import Product from "../../src/models/Product.js";
import Category from "../../src/models/Category.js";
import Order from "../../src/models/Order.js";
import Cart from "../../src/models/Cart.js";
import Address from "../../src/models/Address.js";
import PaymentMethod from "../../src/models/PaymentMethod.js";
import WishList from "../../src/models/WhishList.js";

// Unidad: schemas Mongoose. La mayoría se verifica con doc.validate() (sin escribir en DB);
// la unicidad de email requiere índices + memory-server. Sin Express, sin HTTP, sin red externa.
const oid = () => new mongoose.Types.ObjectId();

async function validationError(doc) {
  return doc.validate().then(
    () => null,
    (err) => err,
  );
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

describe("User model", () => {
  it("valida un documento correcto", async () => {
    const doc = new User({ name: "Ada", email: "ada@x.com", password: "secret" });
    expect(await validationError(doc)).toBeNull();
  });

  it("falla si falta name / email / password (required)", async () => {
    const err = await validationError(new User({}));
    expect(err.errors.name).toBeDefined();
    expect(err.errors.email).toBeDefined();
    expect(err.errors.password).toBeDefined();
  });

  it("aplica default role = 'customer'", () => {
    expect(new User({ name: "A", email: "a@x.com", password: "p" }).role).toBe(
      "customer",
    );
  });

  it("rechaza role fuera del enum", async () => {
    const err = await validationError(
      new User({ name: "A", email: "a@x.com", password: "p", role: "root" }),
    );
    expect(err.errors.role).toBeDefined();
  });

  it("normaliza email con lowercase + trim", () => {
    const u = new User({ name: "A", email: "  Test@X.COM  ", password: "p" });
    expect(u.email).toBe("test@x.com");
  });

  it("impone unicidad de email (índice unique)", async () => {
    await User.init();
    await User.create({ name: "A", email: "dup@x.com", password: "p" });
    await expect(
      User.create({ name: "B", email: "dup@x.com", password: "p" }),
    ).rejects.toThrow();
  });
});

describe("Product model", () => {
  it("falla si falta name o price (required)", async () => {
    const err = await validationError(new Product({}));
    expect(err.errors.name).toBeDefined();
    expect(err.errors.price).toBeDefined();
  });

  it("aplica defaults stock = 0 e imageURL", () => {
    const p = new Product({ name: "X", price: 10 });
    expect(p.stock).toBe(0);
    expect(p.imageURL).toBe("https://placehold.co/600x400");
  });
});

describe("Category model", () => {
  it("falla si falta name o description (required)", async () => {
    const err = await validationError(new Category({}));
    expect(err.errors.name).toBeDefined();
    expect(err.errors.description).toBeDefined();
  });

  it("aplica defaults imageURL y parentCategory = null", () => {
    const c = new Category({ name: "X", description: "d" });
    expect(c.imageURL).toBe("https://placehold.co/800x600.png");
    expect(c.parentCategory).toBeNull();
  });
});

describe("Order model", () => {
  const baseProducts = [{ productId: oid(), quantity: 2, price: 5 }];

  it("falla si falta user (required)", async () => {
    const err = await validationError(
      new Order({
        products: baseProducts,
        address: oid(),
        paymentMethod: oid(),
        totalPrice: 10,
      }),
    );
    expect(err.errors.user).toBeDefined();
  });

  it("aplica defaults status / paymentStatus = 'pending' y shippingCost = 0", () => {
    const o = new Order({
      user: oid(),
      products: baseProducts,
      address: oid(),
      paymentMethod: oid(),
      totalPrice: 10,
    });
    expect(o.status).toBe("pending");
    expect(o.paymentStatus).toBe("pending");
    expect(o.shippingCost).toBe(0);
  });

  it("rechaza quantity < 1 (min: 1)", async () => {
    const err = await validationError(
      new Order({
        user: oid(),
        products: [{ productId: oid(), quantity: 0, price: 5 }],
        address: oid(),
        paymentMethod: oid(),
        totalPrice: 10,
      }),
    );
    expect(err.errors["products.0.quantity"]).toBeDefined();
  });

  it("rechaza status fuera del enum", async () => {
    const err = await validationError(
      new Order({
        user: oid(),
        products: baseProducts,
        address: oid(),
        paymentMethod: oid(),
        totalPrice: 10,
        status: "unknown",
      }),
    );
    expect(err.errors.status).toBeDefined();
  });
});

describe("Cart model", () => {
  it("falla si falta user (required)", async () => {
    const err = await validationError(
      new Cart({ products: [{ product: oid(), quantity: 1 }] }),
    );
    expect(err.errors.user).toBeDefined();
  });

  it("rechaza quantity < 1 (min: 1)", async () => {
    const err = await validationError(
      new Cart({ user: oid(), products: [{ product: oid(), quantity: 0 }] }),
    );
    expect(err.errors["products.0.quantity"]).toBeDefined();
  });
});

describe("Address model", () => {
  it("falla si faltan campos required", async () => {
    const err = await validationError(new Address({}));
    for (const field of [
      "user",
      "address",
      "city",
      "state",
      "postalCode",
      "country",
      "phone",
    ]) {
      expect(err.errors[field]).toBeDefined();
    }
  });

  it("aplica defaults addressType = 'home' e isDefault = false", () => {
    const a = new Address({});
    expect(a.addressType).toBe("home");
    expect(a.isDefault).toBe(false);
  });

  it("rechaza addressType fuera del enum", async () => {
    const err = await validationError(new Address({ addressType: "garage" }));
    expect(err.errors.addressType).toBeDefined();
  });
});

describe("PaymentMethod model", () => {
  it("falla si falta user o type (required)", async () => {
    const err = await validationError(new PaymentMethod({}));
    expect(err.errors.user).toBeDefined();
    expect(err.errors.type).toBeDefined();
  });

  it("rechaza type fuera del enum", async () => {
    const err = await validationError(
      new PaymentMethod({ user: oid(), type: "crypto" }),
    );
    expect(err.errors.type).toBeDefined();
  });

  it("aplica defaults isActive = true e isDefault = false", () => {
    const pm = new PaymentMethod({ user: oid(), type: "paypal" });
    expect(pm.isActive).toBe(true);
    expect(pm.isDefault).toBe(false);
  });
});

describe("WishList model", () => {
  it("falla si falta user (required)", async () => {
    const err = await validationError(new WishList({ products: [oid()] }));
    expect(err.errors.user).toBeDefined();
  });

  it("valida un documento correcto con productos", async () => {
    const doc = new WishList({ user: oid(), products: [oid(), oid()] });
    expect(await validationError(doc)).toBeNull();
  });
});

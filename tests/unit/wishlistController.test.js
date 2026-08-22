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
import WishList from "../../src/models/WhishList.js";
import User from "../../src/models/User.js";
import Product from "../../src/models/Product.js";
import {
  getWishlists,
  getWishlistByUser,
  addProductToWishlist,
  removeProductFromWishlist,
  deleteWishlist,
} from "../../src/controllers/wishlistController.js";

// Unidad: wishlistController por invocación directa + memory-server. Sin Express, sin HTTP.
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

let user;
let productA;
let productB;

beforeAll(async () => {
  await connect();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnect();
});

async function seedRefs() {
  user = await User.create({ name: "U", email: "u@x.com", password: "h" });
  productA = await Product.create({ name: "A", price: 10, stock: 1 });
  productB = await Product.create({ name: "B", price: 20, stock: 1 });
}

describe("wishlistController.getWishlists", () => {
  it("responde 200 con la lista de wishlists", async () => {
    await seedRefs();
    await WishList.create({ user: user._id, products: [productA._id] });

    const res = buildRes();
    await getWishlists({}, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toHaveLength(1);
  });
});

describe("wishlistController.getWishlistByUser", () => {
  it("responde 200 con la wishlist del usuario", async () => {
    await seedRefs();
    await WishList.create({ user: user._id, products: [productA._id] });

    const res = buildRes();
    await getWishlistByUser({ params: { id: user._id.toString() } }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("responde 404 si el usuario no tiene wishlist", async () => {
    const res = buildRes();
    await getWishlistByUser({ params: { id: oid().toString() } }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ message: "Wishlist not found" });
  });
});

describe("wishlistController.addProductToWishlist", () => {
  it("crea la wishlist si no existe y agrega el producto", async () => {
    await seedRefs();
    const req = {
      body: { userId: user._id.toString(), productId: productA._id.toString() },
    };
    const res = buildRes();

    await addProductToWishlist(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    const stored = await WishList.findOne({ user: user._id });
    expect(stored.products).toHaveLength(1);
  });

  it("responde 'Product already in wishlist' si el producto ya está", async () => {
    await seedRefs();
    await WishList.create({ user: user._id, products: [productA._id] });

    const req = {
      body: { userId: user._id.toString(), productId: productA._id.toString() },
    };
    const res = buildRes();

    await addProductToWishlist(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.message).toBe("Product already in wishlist");
  });

  it("agrega un nuevo producto a una wishlist existente", async () => {
    await seedRefs();
    await WishList.create({ user: user._id, products: [productA._id] });

    const req = {
      body: { userId: user._id.toString(), productId: productB._id.toString() },
    };
    await addProductToWishlist(req, buildRes(), vi.fn());

    const stored = await WishList.findOne({ user: user._id });
    expect(stored.products).toHaveLength(2);
  });
});

describe("wishlistController.removeProductFromWishlist", () => {
  it("elimina el producto y responde 200", async () => {
    await seedRefs();
    const wl = await WishList.create({
      user: user._id,
      products: [productA._id],
    });

    const req = {
      params: { id: wl._id.toString() },
      body: { productId: productA._id.toString() },
    };
    const res = buildRes();

    await removeProductFromWishlist(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    const stored = await WishList.findById(wl._id);
    expect(stored.products).toHaveLength(0);
  });

  it("responde 404 si la wishlist no existe", async () => {
    const req = {
      params: { id: oid().toString() },
      body: { productId: oid().toString() },
    };
    const res = buildRes();

    await removeProductFromWishlist(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ message: "Wishlist not found" });
  });
});

describe("wishlistController.deleteWishlist", () => {
  it("responde 204 y elimina la wishlist", async () => {
    await seedRefs();
    const wl = await WishList.create({ user: user._id, products: [] });
    const res = buildRes();

    await deleteWishlist({ params: { id: wl._id.toString() } }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(204);
    expect(await WishList.findById(wl._id)).toBeNull();
  });

  it("responde 404 si la wishlist no existe", async () => {
    const res = buildRes();
    await deleteWishlist({ params: { id: oid().toString() } }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ message: "Wishlist not found" });
  });
});

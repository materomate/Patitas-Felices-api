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
import Product from "../../src/models/Product.js";
import {
  searchProducts,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../../src/controllers/productController.js";

// Unidad: productController por invocación directa + memory-server. Sin Express, sin HTTP.
const oid = () => new mongoose.Types.ObjectId();

function buildRes() {
  const res = {
    statusCode: undefined,
    body: undefined,
    sent: false,
    status: vi.fn(function (code) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function (payload) {
      this.body = payload;
      return this;
    }),
    send: vi.fn(function () {
      this.sent = true;
      return this;
    }),
  };
  return res;
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

describe("productController.searchProducts", () => {
  it("devuelve todos los productos con metadata de paginación", async () => {
    await Product.create([
      { name: "iPhone", price: 1000, stock: 5 },
      { name: "Galaxy", price: 800, stock: 5 },
      { name: "Pixel", price: 700, stock: 5 },
    ]);

    const req = { query: {} };
    const res = buildRes();

    await searchProducts(req, res, vi.fn());

    expect(res.body.products).toHaveLength(3);
    expect(res.body.pagination.totalResults).toBe(3);
    expect(res.body.pagination.currentPage).toBe(1);
  });

  it("filtra por término de búsqueda q (regex sobre name/description)", async () => {
    await Product.create([
      { name: "iPhone 15", price: 1000, stock: 5 },
      { name: "Galaxy S24", price: 800, stock: 5 },
    ]);

    const req = { query: { q: "iphone" } };
    const res = buildRes();

    await searchProducts(req, res, vi.fn());

    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0].name).toBe("iPhone 15");
  });

  it("filtra por inStock=true (stock > 0)", async () => {
    await Product.create([
      { name: "Agotado", price: 100, stock: 0 },
      { name: "Disponible", price: 100, stock: 3 },
    ]);

    const req = { query: { inStock: "true" } };
    const res = buildRes();

    await searchProducts(req, res, vi.fn());

    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0].name).toBe("Disponible");
  });
});

describe("productController.getProducts", () => {
  it("devuelve solo productos con stock > 0", async () => {
    await Product.create([
      { name: "Agotado", price: 100, stock: 0 },
      { name: "Disponible", price: 100, stock: 3 },
    ]);

    const req = { query: {} };
    const res = buildRes();

    await getProducts(req, res, vi.fn());

    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0].name).toBe("Disponible");
  });
});

describe("productController.getProductById", () => {
  it("responde 200 con el producto existente", async () => {
    const p = await Product.create({ name: "X", price: 10, stock: 1 });
    const req = { params: { id: p._id.toString() } };
    const res = buildRes();

    await getProductById(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.name).toBe("X");
  });

  it("responde 404 si el producto no existe", async () => {
    const req = { params: { id: oid().toString() } };
    const res = buildRes();

    await getProductById(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ message: "Product not found" });
  });
});

describe("productController.createProduct", () => {
  it("responde 201 y persiste el producto", async () => {
    const req = {
      body: { name: "Nuevo", description: "d", price: 50, stock: 2 },
    };
    const res = buildRes();

    await createProduct(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.body.name).toBe("Nuevo");
    expect(await Product.countDocuments()).toBe(1);
  });
});

describe("productController.updateProduct", () => {
  it("responde 200 con el producto actualizado", async () => {
    const p = await Product.create({ name: "Viejo", price: 10, stock: 1 });
    const req = {
      params: { id: p._id.toString() },
      body: { name: "Actualizado", price: 99 },
    };
    const res = buildRes();

    await updateProduct(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.name).toBe("Actualizado");
    expect(res.body.price).toBe(99);
  });

  it("responde 404 si el producto no existe", async () => {
    const req = {
      params: { id: oid().toString() },
      body: { name: "X" },
    };
    const res = buildRes();

    await updateProduct(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ message: "Product not found" });
  });
});

describe("productController.deleteProduct", () => {
  it("responde 204 y elimina el producto", async () => {
    const p = await Product.create({ name: "X", price: 10, stock: 1 });
    const req = { params: { id: p._id.toString() } };
    const res = buildRes();

    await deleteProduct(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
    expect(await Product.findById(p._id)).toBeNull();
  });

  it("responde 404 si el producto no existe", async () => {
    const req = { params: { id: oid().toString() } };
    const res = buildRes();

    await deleteProduct(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ message: "Product not found" });
  });
});

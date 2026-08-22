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
import Category from "../../src/models/Category.js";
import Product from "../../src/models/Product.js";
import {
  getCategories,
  getCategoryById,
  getProductsByCategoryAndChildren,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../src/controllers/categoryController.js";

// Unidad: categoryController por invocación directa + memory-server. Sin Express, sin HTTP.
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

beforeAll(async () => {
  await connect();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnect();
});

describe("categoryController.getCategories", () => {
  it("responde 200 con la lista de categorías", async () => {
    await Category.create([
      { name: "A", description: "da" },
      { name: "B", description: "db" },
    ]);

    const res = buildRes();
    await getCategories({}, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toHaveLength(2);
  });
});

describe("categoryController.getCategoryById", () => {
  it("responde 200 si existe", async () => {
    const c = await Category.create({ name: "A", description: "d" });
    const res = buildRes();

    await getCategoryById({ params: { id: c._id.toString() } }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.name).toBe("A");
  });

  it("responde 404 si no existe", async () => {
    const res = buildRes();
    await getCategoryById({ params: { id: oid().toString() } }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ message: "Category not found" });
  });
});

describe("categoryController.createCategory", () => {
  it("responde 201 con parentCategory = null por defecto", async () => {
    const req = { body: { name: "Nueva", description: "d" } };
    const res = buildRes();

    await createCategory(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.body.parentCategory).toBeNull();
  });
});

describe("categoryController.updateCategory", () => {
  it("responde 200 con la categoría actualizada", async () => {
    const c = await Category.create({ name: "Vieja", description: "d" });
    const req = {
      params: { id: c._id.toString() },
      body: { name: "Nueva", description: "d2" },
    };
    const res = buildRes();

    await updateCategory(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.name).toBe("Nueva");
  });

  it("responde 404 si no existe", async () => {
    const req = {
      params: { id: oid().toString() },
      body: { name: "X", description: "d" },
    };
    const res = buildRes();

    await updateCategory(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ message: "Category not found" });
  });
});

describe("categoryController.deleteCategory", () => {
  it("responde 204 y elimina", async () => {
    const c = await Category.create({ name: "A", description: "d" });
    const res = buildRes();

    await deleteCategory({ params: { id: c._id.toString() } }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(204);
    expect(await Category.findById(c._id)).toBeNull();
  });

  it("responde 404 si no existe", async () => {
    const res = buildRes();
    await deleteCategory({ params: { id: oid().toString() } }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ message: "Category not found" });
  });
});

describe("categoryController.getProductsByCategoryAndChildren", () => {
  it("responde 404 si la categoría no existe", async () => {
    const res = buildRes();
    await getProductsByCategoryAndChildren(
      { params: { id: oid().toString() }, query: {} },
      res,
      vi.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ message: "Category not found" });
  });

  it("incluye productos de la categoría padre y de sus hijas", async () => {
    const parent = await Category.create({ name: "Padre", description: "d" });
    const child = await Category.create({
      name: "Hija",
      description: "d",
      parentCategory: parent._id,
    });
    await Product.create({ name: "P1", price: 10, category: parent._id });
    await Product.create({ name: "P2", price: 10, category: child._id });

    const res = buildRes();
    await getProductsByCategoryAndChildren(
      { params: { id: parent._id.toString() }, query: {} },
      res,
      vi.fn(),
    );

    expect(res.body.products).toHaveLength(2);
    expect(res.body.pagination.totalResults).toBe(2);
  });

  it("D8 (defecto conocido): NO pagina — devuelve todos los productos aunque limit=2", async () => {
    const parent = await Category.create({ name: "Padre", description: "d" });
    await Product.create([
      { name: "P1", price: 10, category: parent._id },
      { name: "P2", price: 10, category: parent._id },
      { name: "P3", price: 10, category: parent._id },
    ]);

    const res = buildRes();
    await getProductsByCategoryAndChildren(
      { params: { id: parent._id.toString() }, query: { page: 1, limit: 2 } },
      res,
      vi.fn(),
    );

    // La metadata calcula 2 páginas (ceil(3/2)) pero el find no aplica skip/limit:
    expect(res.body.pagination.totalPages).toBe(2);
    expect(res.body.products).toHaveLength(3); // <- debería ser 2 si paginara
  });
});

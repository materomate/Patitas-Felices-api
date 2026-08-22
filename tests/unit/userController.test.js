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
import User from "../../src/models/User.js";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "../../src/controllers/userController.js";

// Unidad: userController por invocación directa + memory-server. Sin Express, sin HTTP.
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

describe("userController.getUsers", () => {
  it("responde 200 con los usuarios sin el campo password", async () => {
    await User.create([
      { name: "A", email: "a@x.com", password: "hash1" },
      { name: "B", email: "b@x.com", password: "hash2" },
    ]);

    const res = buildRes();
    await getUsers({}, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].password).toBeUndefined();
  });
});

describe("userController.getUserById", () => {
  it("responde 200 sin password si existe", async () => {
    const u = await User.create({ name: "A", email: "a@x.com", password: "h" });
    const res = buildRes();

    await getUserById({ params: { id: u._id.toString() } }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.password).toBeUndefined();
  });

  it("responde 404 si no existe", async () => {
    const res = buildRes();
    await getUserById({ params: { id: oid().toString() } }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ message: "User not found" });
  });
});

describe("userController.createUser", () => {
  it("responde 201, hashea el password y no lo expone", async () => {
    const req = {
      body: { name: "Nuevo", email: "n@x.com", password: "plano123", role: "customer" },
    };
    const res = buildRes();

    await createUser(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.body.password).toBeUndefined();

    const stored = await User.findOne({ email: "n@x.com" });
    expect(stored.password).not.toBe("plano123");
  });
});

describe("userController.updateUser", () => {
  it("actualiza name/email/role sin exigir password y no lo expone", async () => {
    const u = await User.create({ name: "A", email: "a@x.com", password: "h" });
    const req = {
      params: { id: u._id.toString() },
      body: { name: "Cambiado", email: "a@x.com", role: "admin" },
    };
    const res = buildRes();

    await updateUser(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.name).toBe("Cambiado");
    expect(res.body.role).toBe("admin");
    expect(res.body.password).toBeUndefined();

    const stored = await User.findById(u._id);
    expect(stored.password).toBe("h");
  });

  it("si se envía password, lo hashea antes de guardar", async () => {
    const u = await User.create({ name: "A", email: "a@x.com", password: "h" });
    const req = {
      params: { id: u._id.toString() },
      body: { password: "nuevoPlano123" },
    };
    const res = buildRes();

    await updateUser(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    const stored = await User.findById(u._id);
    expect(stored.password).not.toBe("nuevoPlano123");
    expect(stored.password).not.toBe("h");
  });

  it("responde 404 si no existe", async () => {
    const res = buildRes();
    await updateUser(
      { params: { id: oid().toString() }, body: { name: "X" } },
      res,
      vi.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ message: "User not found" });
  });
});

describe("userController.deleteUser", () => {
  it("responde 204 y elimina el usuario", async () => {
    const u = await User.create({ name: "A", email: "a@x.com", password: "h" });
    const res = buildRes();

    await deleteUser({ params: { id: u._id.toString() } }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(204);
    expect(await User.findById(u._id)).toBeNull();
  });

  it("responde 404 si no existe", async () => {
    const res = buildRes();
    await deleteUser({ params: { id: oid().toString() } }, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ message: "User not found" });
  });
});

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
import Address from "../../src/models/Address.js";
import {
  getUserAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
} from "../../src/controllers/addressController.js";

// Unidad: addressController por invocación directa (req/res/next simulados) + memory-server.
// Sin Express, sin HTTP.
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
  };
  return res;
}

const validBody = {
  address: "Calle 1",
  city: "CDMX",
  state: "CDMX",
  postalCode: "01000",
  country: "México",
  phone: "5512345678",
};

beforeAll(async () => {
  await connect();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnect();
});

describe("addressController.getUserAddresses", () => {
  it("responde 200 con solo las direcciones del usuario autenticado", async () => {
    const userA = oid();
    const userB = oid();
    await Address.create({ user: userA, ...validBody });
    await Address.create({ user: userA, ...validBody });
    await Address.create({ user: userB, ...validBody });

    const req = { user: { userId: userA.toString() } };
    const res = buildRes();
    const next = vi.fn();

    await getUserAddresses(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.addresses).toHaveLength(2);
    expect(next).not.toHaveBeenCalled();
  });

  it("llama next(error) si no hay req.user (acceso a userId indefinido)", async () => {
    const req = {};
    const res = buildRes();
    const next = vi.fn();

    await getUserAddresses(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("addressController.getAddressById", () => {
  it("responde 200 con la dirección del usuario", async () => {
    const userId = oid();
    const created = await Address.create({ user: userId, ...validBody });

    const req = {
      params: { addressId: created._id.toString() },
      user: { userId: userId.toString() },
    };
    const res = buildRes();

    await getAddressById(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body._id.toString()).toBe(created._id.toString());
  });

  it("responde 404 si la dirección no existe para el usuario", async () => {
    const req = {
      params: { addressId: oid().toString() },
      user: { userId: oid().toString() },
    };
    const res = buildRes();

    await getAddressById(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ message: "Address not found" });
  });
});

describe("addressController.createAddress", () => {
  it("responde 201 y aplica defaults country='México' y addressType='home'", async () => {
    const userId = oid();
    const { country, ...bodyWithoutCountry } = validBody;
    const req = {
      body: bodyWithoutCountry,
      user: { userId: userId.toString() },
    };
    const res = buildRes();

    await createAddress(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.body.country).toBe("México");
    expect(res.body.addressType).toBe("home");
    expect(res.body.isDefault).toBe(false);
    expect(res.body.user.toString()).toBe(userId.toString());
  });

  it("desactiva isDefault de otras direcciones cuando se crea una por defecto", async () => {
    const userId = oid();
    const previous = await Address.create({
      user: userId,
      ...validBody,
      isDefault: true,
    });

    const req = {
      body: { ...validBody, isDefault: true },
      user: { userId: userId.toString() },
    };
    await createAddress(req, buildRes(), vi.fn());

    const refreshed = await Address.findById(previous._id);
    expect(refreshed.isDefault).toBe(false);
  });
});

describe("addressController.updateAddress", () => {
  it("responde 200 con la dirección actualizada", async () => {
    const userId = oid();
    const created = await Address.create({ user: userId, ...validBody });

    const req = {
      params: { addressId: created._id.toString() },
      body: { ...validBody, city: "Puebla" },
      user: { userId: userId.toString() },
    };
    const res = buildRes();

    await updateAddress(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.city).toBe("Puebla");
  });

  it("responde 404 si la dirección no existe o no pertenece al usuario", async () => {
    const created = await Address.create({ user: oid(), ...validBody });

    const req = {
      params: { addressId: created._id.toString() },
      body: { ...validBody, city: "Puebla" },
      user: { userId: oid().toString() },
    };
    const res = buildRes();

    await updateAddress(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ message: "Address not found" });
  });
});

describe("addressController.deleteAddress", () => {
  it("responde 200 y elimina la dirección existente", async () => {
    const userId = oid();
    const created = await Address.create({ user: userId, ...validBody });

    const req = {
      params: { addressId: created._id.toString() },
      user: { userId: userId.toString() },
    };
    const res = buildRes();

    await deleteAddress(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual({ message: "Address deleted successfully" });
    expect(await Address.findById(created._id)).toBeNull();
  });

  it("responde 404 si la dirección no existe", async () => {
    const req = {
      params: { addressId: oid().toString() },
      user: { userId: oid().toString() },
    };
    const res = buildRes();

    await deleteAddress(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.body).toEqual({ message: "Address not found" });
  });
});

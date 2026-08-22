import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  afterEach,
} from "vitest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { connect, clearDatabase, disconnect } from "../helpers/db.js";
import User from "../../src/models/User.js";
import { register, login, logout } from "../../src/controllers/authController.js";
import authMiddleware from "../../src/middlewares/authMiddleware.js";

// Unidad: authController por invocación directa + memory-server. Sin Express, sin HTTP.
// Cubre helpers privados: generateToken, generateRefreshToken, generatePassword, checkUserExist.
const TEST_SECRET = "test-jwt-secret-auth";
const TEST_REFRESH = "test-refresh-secret-auth";

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

beforeAll(async () => {
  process.env.JWT_SECRET = TEST_SECRET;
  process.env.JWT_REFRESH_TOKEN = TEST_REFRESH;
  await connect();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnect();
});

// ─── register ──────────────────────────────────────────────────────────────

describe("authController.register", () => {
  it("responde 201 con {name, email, phone} para usuario nuevo", async () => {
    const req = {
      body: { name: "Ana", email: "ana@x.com", password: "secreta123", phone: "555-1234" },
    };
    const res = buildRes();

    await register(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    // D3 (conocido): phone se incluye en la respuesta aunque el schema User no lo define
    expect(res.body).toEqual({ name: "Ana", email: "ana@x.com", phone: "555-1234" });
  });

  it("guarda el password como bcrypt hash — nunca en texto plano (cubre generatePassword)", async () => {
    const plain = "mi-contraseña-super-segura";
    await register(
      { body: { name: "A", email: "a@x.com", password: plain } },
      buildRes(),
      vi.fn(),
    );

    const stored = await User.findOne({ email: "a@x.com" });
    expect(stored.password).not.toBe(plain);
    expect(await bcrypt.compare(plain, stored.password)).toBe(true);
  });

  it("responde 400 si el email ya está registrado (cubre checkUserExist)", async () => {
    await User.create({ name: "X", email: "dup@x.com", password: "h" });
    const req = { body: { name: "Y", email: "dup@x.com", password: "p" } };
    const res = buildRes();

    await register(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({ message: "User already exist" });
  });
});

// ─── login ─────────────────────────────────────────────────────────────────

describe("authController.login", () => {
  it("responde 200 con token y refreshToken JWT válidos (cubre generateToken + generateRefreshToken)", async () => {
    const plain = "pass-seguro-123";
    const hash = await bcrypt.hash(plain, 10);
    await User.create({ name: "U", email: "u@x.com", password: hash, role: "customer" });

    const req = { body: { email: "u@x.com", password: plain } };
    const res = buildRes();

    await login(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    const { token, refreshToken } = res.body;
    expect(token).toBeDefined();
    expect(refreshToken).toBeDefined();

    const decoded = jwt.verify(token, TEST_SECRET);
    expect(decoded.role).toBe("customer");

    const decodedRefresh = jwt.verify(refreshToken, TEST_REFRESH);
    expect(decodedRefresh.userId).toBeDefined();
  });

  it("responde 400 si el usuario no existe", async () => {
    const req = { body: { email: "noexiste@x.com", password: "cualquiera" } };
    const res = buildRes();

    await login(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({ message: "Invalid email or password" });
  });

  it("responde 400 si el password es incorrecto", async () => {
    const hash = await bcrypt.hash("correcta-123", 10);
    await User.create({ name: "U", email: "u@x.com", password: hash });

    const req = { body: { email: "u@x.com", password: "incorrecta" } };
    const res = buildRes();

    await login(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({ message: "Invalid email or password" });
  });

  it("fix enumeración: el mensaje es idéntico si el usuario no existe o si el password es incorrecto", async () => {
    const hash = await bcrypt.hash("correcta-123", 10);
    await User.create({ name: "U", email: "existe@x.com", password: hash });

    const resNoExiste = buildRes();
    await login(
      { body: { email: "noexiste@x.com", password: "cualquiera" } },
      resNoExiste,
      vi.fn(),
    );

    const resPasswordMala = buildRes();
    await login(
      { body: { email: "existe@x.com", password: "incorrecta" } },
      resPasswordMala,
      vi.fn(),
    );

    expect(resNoExiste.body).toEqual(resPasswordMala.body);
  });
});

// ─── logout ────────────────────────────────────────────────────────────────

describe("authController.logout (fix: JWT sin revocación)", () => {
  it("responde 200 y revoca el token: authMiddleware lo rechaza después del logout", async () => {
    const plain = "pass-seguro-123";
    const hash = await bcrypt.hash(plain, 10);
    await User.create({ name: "U", email: "u@x.com", password: hash });

    const loginRes = buildRes();
    await login({ body: { email: "u@x.com", password: plain } }, loginRes, vi.fn());
    const { token } = loginRes.body;

    // Antes del logout, el token pasa authMiddleware con normalidad.
    const preLogoutReq = { headers: { authorization: `Bearer ${token}` } };
    const preLogoutNext = vi.fn();
    authMiddleware(preLogoutReq, buildRes(), preLogoutNext);
    expect(preLogoutNext).toHaveBeenCalledTimes(1);

    // logout() usa req.user (poblado por authMiddleware en la ruta real).
    const logoutReq = {
      headers: { authorization: `Bearer ${token}` },
      user: preLogoutReq.user,
    };
    const logoutRes = buildRes();
    await logout(logoutReq, logoutRes, vi.fn());

    expect(logoutRes.status).toHaveBeenCalledWith(200);

    // Después del logout, el MISMO token (firma válida, sin expirar) ya no pasa.
    const postLogoutRes = buildRes();
    const postLogoutNext = vi.fn();
    authMiddleware(
      { headers: { authorization: `Bearer ${token}` } },
      postLogoutRes,
      postLogoutNext,
    );

    expect(postLogoutNext).not.toHaveBeenCalled();
    expect(postLogoutRes.status).toHaveBeenCalledWith(401);
  });
});

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { revokeToken } from "../utils/tokenBlacklist.js";

const generateToken = (userId, name, role) => {
  return jwt.sign({ userId, name, role }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

const generateRefreshToken = (userId) => {
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_TOKEN, {
    expiresIn: "7d",
  });

  return { token: refreshToken, userId };
};

const generatePassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

const checkUserExist = async (email) => {
  const user = await User.findOne({ email });
  return user;
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    const userExist = await checkUserExist(email);

    if (userExist) {
      return res.status(400).json({ message: "User already exist" });
    }

    const hashPassword = await generatePassword(password);
    const role = "customer";

    const newUser = new User({
      name,
      email,
      password: hashPassword,
      role,
      phone,
    });

    await newUser.save();
    res.status(201).json({ name, email, phone });
  } catch (error) {
    next(error);
  }
};

// Mismo mensaje para "usuario no existe" y "password incorrecto": distinguirlos
// permite enumerar qué emails están registrados en la tienda.
const INVALID_LOGIN_MESSAGE = "Invalid email or password";

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const userExist = await checkUserExist(email);

    if (!userExist) {
      return res.status(400).json({ message: INVALID_LOGIN_MESSAGE });
    }

    const isMatch = await bcrypt.compare(password, userExist.password);

    if (!isMatch) {
      return res.status(400).json({ message: INVALID_LOGIN_MESSAGE });
    }

    const token = generateToken(userExist._id, userExist.name, userExist.role);
    const refreshToken = generateRefreshToken(userExist._id);

    res.status(200).json({ token, refreshToken: refreshToken.token });
  } catch (error) {
    next(error);
  }
};

// El JWT es stateless: no hay forma de invalidarlo salvo llevar una lista de
// revocados. Requiere authMiddleware antes (así req.user.exp ya está validado
// y solo se revocan tokens que eran realmente válidos).
const logout = async (req, res, next) => {
  try {
    const token = req.headers["authorization"]?.split(" ")[1];
    revokeToken(token, req.user?.exp);
    res.status(200).json({ message: "Logged out" });
  } catch (error) {
    next(error);
  }
};

export { register, login, logout };

import express from "express";
import { register, login, logout } from "../controllers/authController.js";
import authRateLimiter from "../middlewares/rateLimiter.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", authRateLimiter, register);
router.post("/login", authRateLimiter, login);
router.post("/logout", authMiddleware, logout);

export default router;

import express from "express";
import { body } from "express-validator";
import {
  register,
  login,
  logout,
  getMe,
  updateMe,
  changePassword,
} from "../controllers/authController.js";
import authRateLimiter from "../middlewares/rateLimiter.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import validate from "../middlewares/validation.js";

const router = express.Router();

const updateMeValidation = [
  body("name").optional().notEmpty().withMessage("Name cannot be empty"),
  body("email").optional().isEmail().withMessage("A valid email is required"),
];

const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
];

router.post("/register", authRateLimiter, register);
router.post("/login", authRateLimiter, login);
router.post("/logout", authMiddleware, logout);
router.get("/me", authMiddleware, getMe);
router.put("/me", authMiddleware, updateMeValidation, validate, updateMe);
router.put(
  "/me/password",
  authMiddleware,
  changePasswordValidation,
  validate,
  changePassword,
);

export default router;

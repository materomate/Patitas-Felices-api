import express from "express";
import { body, param } from "express-validator";
import {
  getUserAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
} from "../controllers/addressController.js";
import validate from "../middlewares/validation.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

const addressIdValidation = [
  param("addressId")
    .isMongoId()
    .withMessage("Address ID must be a valid MongoDB ObjectId"),
];

const createAddressValidation = [
  body("address").notEmpty().withMessage("Address is required"),
  body("city").notEmpty().withMessage("City is required"),
  body("state").notEmpty().withMessage("State is required"),
  body("postalCode").notEmpty().withMessage("Postal code is required"),
  body("phone").notEmpty().withMessage("Phone is required"),
  body("country").optional(),
  body("isDefault")
    .optional()
    .isBoolean()
    .withMessage("isDefault must be a boolean"),
  body("addressType")
    .optional()
    .isIn(["home", "work", "other"])
    .withMessage("Invalid address type"),
];

const updateAddressValidation = [
  ...addressIdValidation,
  body("address").notEmpty().withMessage("Address is required"),
  body("city").notEmpty().withMessage("City is required"),
  body("state").notEmpty().withMessage("State is required"),
  body("postalCode").notEmpty().withMessage("Postal code is required"),
  body("phone").notEmpty().withMessage("Phone is required"),
  body("country").optional(),
  body("isDefault")
    .optional()
    .isBoolean()
    .withMessage("isDefault must be a boolean"),
  body("addressType")
    .optional()
    .isIn(["home", "work", "other"])
    .withMessage("Invalid address type"),
];

router.get("/addresses", authMiddleware, getUserAddresses);

router.get(
  "/addresses/:addressId",
  authMiddleware,
  addressIdValidation,
  validate,
  getAddressById,
);

router.post(
  "/addresses",
  authMiddleware,
  createAddressValidation,
  validate,
  createAddress,
);

router.put(
  "/addresses/:addressId",
  authMiddleware,
  updateAddressValidation,
  validate,
  updateAddress,
);

router.delete(
  "/addresses/:addressId",
  authMiddleware,
  addressIdValidation,
  validate,
  deleteAddress,
);

export default router;

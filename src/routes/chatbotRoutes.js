import express from "express";
import { body } from "express-validator";
import { sendMessage } from "../controllers/chatbotController.js";
import validate from "../middlewares/validation.js";

const router = express.Router();

const sendMessageValidation = [
  body("message")
    .notEmpty()
    .withMessage("Message is required")
    .isString()
    .withMessage("Message must be a string"),
  body("history").optional().isArray().withMessage("History must be an array"),
];

router.post("/chatbot", sendMessageValidation, validate, sendMessage);

export default router;

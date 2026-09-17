import express from "express";
import { GoogleGenAI } from "@google/genai";
import asyncHandler from "../middlewares/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";

const router = express.Router();

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

router.post("/chat", isAuthenticated, asyncHandler(async (req, res) => {
    const { message } = req.body;

    if (!message) throw new AppError("Message is required", 400);

    const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [
            {
                role: "user",
                parts: [
                    {
                        text: `You are a helpful study assistant. Answer the student's question clearly and concisely.

Student: ${message}`
                    }
                ]
            }
        ]
    });

    res.json({
        success: true,
        reply: response.text
    });
}));

export default router;
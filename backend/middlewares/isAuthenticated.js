import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import asyncHandler from "./asyncHandler.js"; // same folder, so "./" not "../middlewares/"
import AppError from "../utils/AppError.js";

export const isAuthenticated = asyncHandler(async (req, res, next) => { // asyncHandler works here too since middleware is just a function with the same (req, res, next) shape
    const authHeader = req.headers.authorization; // e.g. "Bearer eyJhbGciOi..."

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AppError("Access token is missing or invalid", 401); // 401 = unauthenticated, no valid credentials given at all
    }

    const token = authHeader.split(" ")[1]; // strip the "Bearer " prefix, keep just the token

    let decoded;
    try { // this inner try/catch is intentional — jwt.verify throws its own error types, and we want to translate them into specific AppErrors, same pattern as verification() in userController.js
        decoded = jwt.verify(token, process.env.SECRET_KEY); // synchronous form instead of the old callback form — plays nicer with async/await
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            throw new AppError("Access token has expired, please log in again", 401);
        }
        throw new AppError("Access token is invalid", 401);
    }

    const user = await User.findById(decoded.id); // confirm the user in the token still actually exists
    if (!user) throw new AppError("User not found", 404);

    req.userId = user._id; // this is what every controller reads to scope queries to the logged-in user
    next(); // hand control to the actual route handler
});
import { sendOtpMail } from "../emailVerify/sendOtpMail.js"
import { verifyMail } from "../emailVerify/verifyMail.js"
import User from "../models/userModel.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import asyncHandler from "../middlewares/asyncHandler.js";
import AppError from "../utils/AppError.js";

/**
 * @route registerUser
 * @description Register a new user
 * @access Public
*/
export const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password, profileImageUrl } = req.body
    if (!username || !email || !password) {
        throw new AppError("All fields are required", 400);
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
        throw new AppError("User already exists", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = await User.create({
        username,
        email,
        password: hashedPassword,
        profileImageUrl
    })

    // 24h instead of 10m — 10 minutes is too short a window for most users to
    // actually check their inbox, which is exactly what caused this bug.
    const token = jwt.sign({ id: newUser._id }, process.env.SECRET_KEY, { expiresIn: '24h' })
    try {
        await verifyMail(token, email)
    } catch (err) {
        console.error("Failed to send verification email:", err)
        // don't block registration on email failure
    }
    newUser.token = token
    newUser.lastVerificationSentAt = new Date()
    await newUser.save()

    return res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: newUser
    })
})

/**
 * @route resendVerificationEmail
 * @description Resend the verification email to a user who hasn't verified yet
 * @access Public
*/
export const resendVerificationEmail = asyncHandler(async (req, res) => {
    const { email } = req.body
    if (!email) throw new AppError("Email is required", 400);

    const user = await User.findOne({ email })
    // Don't reveal whether the email exists — respond the same way either way
    if (!user) {
        return res.status(200).json({
            success: true,
            message: "If an account with that email exists, a verification link has been sent."
        })
    }

    if (user.isVerified) {
        throw new AppError("This account is already verified. Please log in.", 400);
    }

    // Cooldown: block resend spam, 60s between requests
    const COOLDOWN_MS = 60 * 1000
    if (user.lastVerificationSentAt && Date.now() - user.lastVerificationSentAt.getTime() < COOLDOWN_MS) {
        const waitSeconds = Math.ceil((COOLDOWN_MS - (Date.now() - user.lastVerificationSentAt.getTime())) / 1000)
        throw new AppError(`Please wait ${waitSeconds}s before requesting another verification email`, 429);
    }

    const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, { expiresIn: '24h' })
    await verifyMail(token, email)

    user.token = token
    user.lastVerificationSentAt = new Date()
    await user.save()

    return res.status(200).json({
        success: true,
        message: "Verification email sent. Please check your inbox."
    })
})

/**
 * @route verification
 * @description Verification of a new user through email
 * @access Private
*/
export const verification = asyncHandler(async (req, res) => {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AppError("Authorization token is missing or invalid", 401);
    }

    const token = authHeader.split(" ")[1]

    // KEEP this inner try/catch — it's converting jwt's own thrown error into
    // a specific AppError with the right message, not just letting it crash generically
    let decoded
    try {
        decoded = jwt.verify(token, process.env.SECRET_KEY)
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            throw new AppError("The registration token has expired", 400);
        }
        throw new AppError("Token verification Failed", 400);
    }

        const user = await User.findById(decoded.id)
    if (!user) throw new AppError("User not found", 400);

    if (user.isVerified) throw new AppError("Account is already verified", 400);

    user.token = null
    user.isVerified = true
    await user.save()

    return res.status(200).json({ success: true, message: "Email verified successfully" })
})

/**
 * @route loginUser
 * @description Login a user with email and password
 * @access Public
*/
export const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new AppError("All fields are required", 400);
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) throw new AppError("User not found", 401);

    const passwordCheck = await bcrypt.compare(password, user.password);
    if (!passwordCheck) throw new AppError("Incorrect Password", 401);

    if (!user.isVerified) throw new AppError("Verify your account before login", 403);

    const token = jwt.sign(
        { id: user._id },
        process.env.SECRET_KEY,
        { expiresIn: "10d" }
    );

    user.isLoggedIn = true;
    user.token = token;
    await user.save();

    const userObj = user.toObject();
    delete userObj.password;

    return res.status(200).json({
        success: true,
        token,
        user: userObj
    });
});

/**
 * @route logoutUser
 * @description Logout a existing user
 * @access Public
*/
export const logoutUser = asyncHandler(async (req, res) => {
    const userId = req.userId
    if (!userId) throw new AppError("Unauthorized user", 401);

    const user = await User.findById(userId)
    if (!user) throw new AppError("User not found", 404);

    user.token = null
    user.isLoggedIn = false
    await user.save()

    return res.status(200).json({ success: true, message: "Logged out successfully" })
})

/**
 * @route forgotPassword
 * @description Forgot your password through otp sending on your email
 * @access Private
*/
export const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body
    const user = await User.findOne({ email })
    if (!user) throw new AppError("User not found", 404);

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiry = new Date(Date.now() + 10 * 60 * 1000)

    user.otp = otp
    user.otpExpiry = expiry
    await user.save()
    await sendOtpMail(email, otp)

    return res.status(200).json({ success: true, message: "OTP sent successfully" })
})

/**
 * @route verifyOTP
 * @description Verify otp sending on your email
 * @access Private
*/
export const verifyOTP = asyncHandler(async (req, res) => {
    const { otp } = req.body
    const email = req.params.email

    if (!otp) throw new AppError("OTP is required", 400);

    const user = await User.findOne({ email })
    if (!user) throw new AppError("User not found", 404);

    if (!user.otp || !user.otpExpiry) throw new AppError("OTP not generated or already verified", 400);

    if (user.otpExpiry < new Date()) throw new AppError("OTP has expired. Please request a new one", 400);

    if (otp !== user.otp) throw new AppError("Invalid OTP", 400);

    user.otp = null
    user.otpExpiry = null
    await user.save()

    return res.status(200).json({ success: true, message: "OTP verified successfully" })
})

/**
 * @route changePassword
 * @description Change your password before entering your otp
 * @access Private
*/
export const changePassword = asyncHandler(async (req, res) => {
    const { newPassword, confirmPassword } = req.body
    const email = req.params.email

    if (!newPassword || !confirmPassword) throw new AppError("All fields are required", 400);

    if (newPassword !== confirmPassword) throw new AppError("Password do not match", 400);

    const user = await User.findOne({ email })
    if (!user) throw new AppError("User not found", 404);

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    user.password = hashedPassword
    await user.save()

    return res.status(200).json({ success: true, message: "Password changed successfully" })
})

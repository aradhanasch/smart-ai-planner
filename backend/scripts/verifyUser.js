// One-off helper script: manually marks a user as verified in the database.
// This exists ONLY because email sending (Gmail SMTP) isn't configured locally —
// it does NOT change any app logic, it just skips clicking the email link once.
//
// Usage (run from inside the backend/ folder):
//   node scripts/verifyUser.js youremail@example.com

import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../configs/db.js"; // reuses the same DNS fix your real app uses
import User from "../models/userModel.js";

const email = process.argv[2]; // grabs whatever you typed after the script name

if (!email) {
    console.log("Usage: node scripts/verifyUser.js <email>");
    process.exit(1);
}

const run = async () => {
    await connectDB(); // sets DNS servers to 8.8.8.8/8.8.4.4 first, THEN connects

    const user = await User.findOneAndUpdate(
        { email },
        { isVerified: true, token: null },
        { new: true }
    );

    if (!user) {
        console.log(`No user found with email: ${email}`);
    } else {
        console.log(`✅ ${user.email} is now verified. You can log in.`);
    }

    await mongoose.disconnect();
    process.exit(0);
};

run();
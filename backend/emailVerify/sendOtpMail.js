import "dotenv/config"
import { sendEmail } from "../utils/sendEmail.js"

export const sendOtpMail = async (email, otp) => {
    try {
        const info = await sendEmail({
            to: email,
            subject: "Password reset OTP",
            html: `<p>Your OTP for password reset is: <b>${otp}</b>. It is valid for 10 minutes.</p>`,
            fromName: "OTP Verification"
        })
        console.log("OTP email sent successfully:", info.id)
    } catch (error) {
        console.error("Failed to send OTP email via Resend:", error.message)
        throw error
    }
}
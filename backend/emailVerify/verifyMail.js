import nodemailer from "nodemailer"
import "dotenv/config"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import handlebars from "handlebars"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const verifyMail = async (token, email) => {

    const emailTemplateSource = fs.readFileSync(
        path.join(__dirname, "template.hbs"),
        "utf-8"
    )

    const template = handlebars.compile(emailTemplateSource)
    const htmlToSend = template({ token: encodeURIComponent(token) })

    const transporter = nodemailer.createTransport({
        service: "gmail",
        port: 587,
        // Force IPv4: many container hosts (Railway included) don't have
        // outbound IPv6 routing, and Gmail's SMTP hostname resolves to an
        // IPv6 address first, causing ENETUNREACH.
        family: 4,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASSWORD
        }
    })
    const mailConfigurations = {
        from: {
            name: "Study Planner Verification",
            address: process.env.MAIL_USER
        },
        to: email,
        subject: "Email Verification",
        html: htmlToSend,
    }

    // Promise-based send instead of the callback form: a callback-style
    // `throw` here would be an uncaught exception outside any promise chain,
    // which crashes the whole Node process on any send failure. Using
    // await + try/catch lets the caller (registerUser / resendVerificationEmail)
    // catch it normally like any other rejected promise.
    try {
        const info = await transporter.sendMail(mailConfigurations)
        console.log("Email sent successfully:", info.messageId)
    } catch (error) {
        console.error("Failed to send email via nodemailer:", error.message)
        throw error
    }
}

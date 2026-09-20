import "dotenv/config"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import handlebars from "handlebars"
import { sendEmail } from "../utils/sendEmail.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const verifyMail = async (token, email) => {

    const emailTemplateSource = fs.readFileSync(
        path.join(__dirname, "template.hbs"),
        "utf-8"
    )

    const template = handlebars.compile(emailTemplateSource)
    const htmlToSend = template({ token: encodeURIComponent(token) })

    try {
        const info = await sendEmail({
            to: email,
            subject: "Email Verification",
            html: htmlToSend,
            fromName: "Study Planner Verification"
        })
        console.log("Email sent successfully:", info.id)
    } catch (error) {
        console.error("Failed to send email via Resend:", error.message)
        throw error
    }
}
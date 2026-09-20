import "dotenv/config"
 
const RESEND_API_URL = "https://api.resend.com/emails"
 
// Resend's sandbox sender. Works immediately with no setup, but can only
// deliver to the email address you signed up to Resend with, until you
// verify your own domain (see the deployment guide).
const DEFAULT_FROM = process.env.MAIL_FROM || "onboarding@resend.dev"
 
/**
 * Sends an email via Resend's HTTPS API instead of raw SMTP.
 * @param {Object} params
 * @param {string} params.to - recipient email address
 * @param {string} params.subject - email subject
 * @param {string} params.html - email HTML body
 * @param {string} [params.fromName] - display name shown to the recipient
 */
export const sendEmail = async ({ to, subject, html, fromName }) => {
    if (!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is not set")
    }
 
    const response = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: fromName ? `${fromName} <${DEFAULT_FROM}>` : DEFAULT_FROM,
            to: [to],
            subject,
            html
        })
    })
 
    const data = await response.json().catch(() => ({}))
 
    if (!response.ok) {
        throw new Error(`Resend API error (${response.status}): ${data.message || JSON.stringify(data)}`)
    }
 
    return data
}
 
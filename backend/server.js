import express from "express"
import "dotenv/config"
import dns from "dns"
// Prefer IPv4 for all outbound DNS lookups from this process. Railway's
// containers frequently lack outbound IPv6 routing, and several external
// services (Gmail SMTP included) resolve to IPv6 addresses first, causing
// ENETUNREACH errors. Node 18+ only.
dns.setDefaultResultOrder("ipv4first")
import connectDB from "./configs/db.js"
import notesRoute from "./routes/noteRoute.js"
import userRoute from "./routes/userRoute.js"
import aiRoute from "./routes/aiRoute.js"
import studySessionRoute from "./routes/studySessionRoute.js"
import taskRoute from "./routes/taskRoute.js"
import cors from "cors"
import path from "path"
import errorHandler from "./middlewares/errorHandler.js";

const app = express()
app.set("trust proxy", 1) 
//* middlewares
app.use(express.json())

// Allow the deployed frontend, any Vercel preview URL for this project, and localhost dev
const allowedOrigins = [
    process.env.CLIENT_URL,          // e.g. https://smart-ai-planner.vercel.app
    "http://localhost:5173",
]

app.use(cors({
    origin: (origin, callback) => {
        // allow non-browser requests (curl, server-to-server) with no origin
        if (!origin) return callback(null, true)

        const isAllowed =
            allowedOrigins.includes(origin) ||
            /^https:\/\/smart-ai-planner.*\.vercel\.app$/.test(origin)

        if (isAllowed) {
            callback(null, true)
        } else {
            callback(new Error(`CORS blocked for origin: ${origin}`))
        }
    },
    credentials: true
}))

//* routes
app.use("/user", userRoute)
app.use("/api/notes", notesRoute);
app.use("/api/ai", aiRoute);
app.use("/api/planner", studySessionRoute);
app.use("/api/tasks", taskRoute);
// Serve uploads folder
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")))
app.use((req, res, next) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});
app.use(errorHandler);

const PORT = process.env.PORT || 3000

//* server starting
app.listen(PORT, () => {
    connectDB()
    console.log(`Server is Running on PORT: ${PORT}`)
})
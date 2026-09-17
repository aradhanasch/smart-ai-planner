import express from "express"
import "dotenv/config"
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

//* middlewares
app.use(express.json())
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
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
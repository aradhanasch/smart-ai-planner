import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import mongoose from "mongoose"

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("MongoDB Connected Successfully")
    } catch (error) {
        console.error("MongoDB Connection Error: ", error.message)
        process.exit(1)  // crash loudly instead of running with a dead DB
    }
}

export default connectDB

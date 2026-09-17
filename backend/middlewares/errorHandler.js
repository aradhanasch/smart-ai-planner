// This is Express's special "error-handling middleware" — Express recognizes
// it because it takes FOUR arguments (err, req, res, next), not three.
// It must be registered LAST in server.js, after all your routes.
const errorHandler = (err, req, res, next) => {
    // Mongoose throws this when an ID string isn't a valid 24-char ObjectId —
    // catch it here so EVERY model (Note, Task, StudySession, User) gets a
    // clean 400 instead of a generic 500, without repeating this check in every controller
    if (err.name === "CastError") {
        return res.status(400).json({ success: false, message: `Invalid ${err.path}: ${err.value}` });
    }

    if (err.name === "MulterError" || err.message?.includes("Only .jpeg")) {
        return res.status(400).json({ success: false, message: err.message });
    }

    const statusCode = err.statusCode || 500;
    const message = err.isOperational ? err.message : "Something went wrong on our end";
    console.error(`[${new Date().toISOString()}] ${err.stack || err}`);
    res.status(statusCode).json({ success: false, message });
};
export default errorHandler;
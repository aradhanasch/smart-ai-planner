// AppError represents an error WE deliberately threw (e.g. "task not found"),
// as opposed to an unexpected bug. isOperational=true tells our error handler
// "this is safe to show the user" vs a raw crash, which we hide in production.
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);            // sets this.message
        this.statusCode = statusCode;
        this.isOperational = true; // marks this as an expected, handled error
        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;
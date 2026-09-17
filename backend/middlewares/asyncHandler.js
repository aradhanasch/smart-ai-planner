// Wraps an async controller so we don't need try/catch in every single one.
// If the wrapped function throws (or an awaited promise rejects), this
// automatically forwards the error to next(err) -> our errorHandler above.
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
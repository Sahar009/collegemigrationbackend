/**
 * Async handler to wrap async route handlers and catch errors
 * @param {Function} fn The async route handler function
 * @returns {Function} Express middleware function
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        console.log('=== ASYNC HANDLER CALLED ===');
        console.log('Path:', req.path);
        console.log('Method:', req.method);
        
        Promise.resolve(fn(req, res, next))
            .catch((error) => {
                console.error('Request Error:', {
                    path: req.path,
                    method: req.method,
                    error: error.message
                });
                
                next(error);
            });
    };
}; 
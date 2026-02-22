import rateLimit from "express-rate-limit";

/**
 * Rate limiters for sensitive endpoints.
 */

// General API rate limit: 100 requests per 15 minutes
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
});

// Deploy endpoint: 10 requests per 15 minutes
export const deployLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Deployment rate limit exceeded. Try again later." },
});

// Upload endpoint: 20 requests per 15 minutes
export const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Upload rate limit exceeded. Try again later." },
});

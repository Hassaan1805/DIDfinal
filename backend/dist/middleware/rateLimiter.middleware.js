"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generalRateLimiter = exports.adminRateLimiter = exports.challengeRateLimiter = exports.authRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: 'Too many authentication attempts. Please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
});
exports.challengeRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        error: 'Too many challenge requests. Please try again later.',
        retryAfter: '5 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.adminRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: {
        success: false,
        error: 'Too many admin requests. Please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.generalRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return req.path === '/api/health';
    },
});
//# sourceMappingURL=rateLimiter.middleware.js.map
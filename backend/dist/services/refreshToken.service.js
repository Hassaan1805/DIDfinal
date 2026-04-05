"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRefreshToken = generateRefreshToken;
exports.storeRefreshToken = storeRefreshToken;
exports.getRefreshToken = getRefreshToken;
exports.revokeRefreshToken = revokeRefreshToken;
exports.revokeAllUserTokens = revokeAllUserTokens;
exports.revokeAllDIDTokens = revokeAllDIDTokens;
exports.getUserRefreshTokens = getUserRefreshTokens;
exports.cleanupExpiredTokens = cleanupExpiredTokens;
exports.getRefreshTokenStats = getRefreshTokenStats;
const crypto_1 = __importDefault(require("crypto"));
const refreshTokenStore = new Map();
function generateRefreshToken() {
    return crypto_1.default.randomBytes(32).toString('hex');
}
function storeRefreshToken(token, userId, did, expiresInDays = 7, deviceInfo, badge, permissions, credentialVerified) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);
    const record = {
        token,
        userId,
        did,
        badge,
        permissions,
        credentialVerified,
        expiresAt,
        createdAt: now,
        lastUsed: now,
        deviceInfo,
    };
    refreshTokenStore.set(token, record);
    return record;
}
function getRefreshToken(token) {
    const record = refreshTokenStore.get(token);
    if (!record) {
        return null;
    }
    if (new Date() > record.expiresAt) {
        refreshTokenStore.delete(token);
        return null;
    }
    record.lastUsed = new Date();
    refreshTokenStore.set(token, record);
    return record;
}
function revokeRefreshToken(token) {
    return refreshTokenStore.delete(token);
}
function revokeAllUserTokens(userId) {
    let count = 0;
    for (const [token, record] of refreshTokenStore.entries()) {
        if (record.userId === userId) {
            refreshTokenStore.delete(token);
            count++;
        }
    }
    return count;
}
function revokeAllDIDTokens(did) {
    let count = 0;
    for (const [token, record] of refreshTokenStore.entries()) {
        if (record.did === did) {
            refreshTokenStore.delete(token);
            count++;
        }
    }
    return count;
}
function getUserRefreshTokens(userId) {
    const tokens = [];
    for (const record of refreshTokenStore.values()) {
        if (record.userId === userId) {
            tokens.push(record);
        }
    }
    return tokens;
}
function cleanupExpiredTokens() {
    let count = 0;
    const now = new Date();
    for (const [token, record] of refreshTokenStore.entries()) {
        if (now > record.expiresAt) {
            refreshTokenStore.delete(token);
            count++;
        }
    }
    return count;
}
function getRefreshTokenStats() {
    const now = new Date();
    let active = 0;
    let expired = 0;
    for (const record of refreshTokenStore.values()) {
        if (now > record.expiresAt) {
            expired++;
        }
        else {
            active++;
        }
    }
    return {
        total: refreshTokenStore.size,
        active,
        expired,
    };
}
//# sourceMappingURL=refreshToken.service.js.map
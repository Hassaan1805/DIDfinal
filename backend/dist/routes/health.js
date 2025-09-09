"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = void 0;
const express_1 = require("express");
const router = (0, express_1.Router)();
exports.healthRoutes = router;
router.get('/', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Decentralized Trust Platform Backend',
        version: '1.0.0'
    });
});
router.get('/detailed', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Decentralized Trust Platform Backend',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});
//# sourceMappingURL=health.js.map
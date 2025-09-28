"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
}
const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
console.log(`📁 Loading environment from: ${envFile}`);
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
const envResult = dotenv_1.default.config({ path: envFile });
if (envResult.error) {
    console.warn(`⚠️ Warning: Could not load ${envFile}:`, envResult.error.message);
    dotenv_1.default.config();
}
else {
    console.log(`✅ Environment loaded successfully from ${envFile}`);
}
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const auth_1 = require("./routes/auth");
const did_1 = require("./routes/did");
const health_1 = require("./routes/health");
const admin_1 = __importDefault(require("./routes/admin"));
const benchmark_1 = require("./routes/benchmark");
const zkp_routes_1 = __importDefault(require("./routes/zkp.routes"));
const premium_routes_1 = __importDefault(require("./routes/premium.routes"));
const monitoring_1 = __importDefault(require("./routes/monitoring"));
const simple_test_1 = __importDefault(require("./routes/simple-test"));
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
console.log(`🔧 Environment variables loaded:`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   DEMO_MODE: ${process.env.DEMO_MODE}`);
console.log(`   PORT: ${process.env.PORT}`);
console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '[SET]' : '[NOT SET]'}`);
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://yourdomain.com']
        : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175', 'http://127.0.0.1:8080', 'http://localhost:8080', 'http://localhost:3002', 'http://localhost:8081', 'http://localhost:8082', 'null', 'file://', '*'],
    credentials: true
}));
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/health', health_1.healthRoutes);
app.use('/api/auth', auth_1.authRoutes);
app.use('/api/auth', zkp_routes_1.default);
app.use('/api/did', did_1.didRoutes);
app.use('/api/admin', admin_1.default);
app.use('/api/benchmark', benchmark_1.benchmarkRoutes);
app.use('/api/premium', premium_routes_1.default);
app.use('/api/monitor', monitoring_1.default);
app.use('/api/simple-test', simple_test_1.default);
app.use((err, req, res, next) => {
    console.error('Error:', err);
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            details: err.details
        });
    }
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or missing authentication token'
        });
    }
    return res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`
    });
});
app.listen(PORT, HOST, () => {
    console.log(`🚀 Decentralized Trust Platform Backend running on ${HOST}:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://${HOST}:${PORT}/api/health`);
    console.log(`🌐 Network access: http://192.168.1.100:${PORT}/api/health`);
    console.log(`📱 Mobile access: Use 192.168.1.100:${PORT} in your mobile app`);
});
exports.default = app;
//# sourceMappingURL=app.js.map
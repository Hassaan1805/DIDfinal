"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.benchmarkRoutes = void 0;
const express_1 = require("express");
const ethers_1 = require("ethers");
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
exports.benchmarkRoutes = router;
const benchmarkResults = [];
const TEST_WALLET = new ethers_1.ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
const TEST_DID = `did:ethr:${TEST_WALLET.address}`;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secure-jwt-secret-key';
console.log('🧪 Benchmark Suite initialized with test wallet:', TEST_WALLET.address);
class PrecisionTimer {
    constructor() {
        this.startTime = null;
    }
    start() {
        this.startTime = process.hrtime();
    }
    stop() {
        if (!this.startTime) {
            throw new Error('Timer not started');
        }
        const diff = process.hrtime(this.startTime);
        const milliseconds = diff[0] * 1000 + diff[1] / 1000000;
        return Math.round(milliseconds * 1000) / 1000;
    }
}
async function runDIDAuthTest() {
    const testId = crypto_1.default.randomUUID();
    const timer = new PrecisionTimer();
    const stepTimers = {
        challengeGeneration: 0,
        signatureVerification: 0
    };
    try {
        console.log('🔐 Starting DID authentication benchmark test:', testId);
        timer.start();
        const challengeTimer = new PrecisionTimer();
        challengeTimer.start();
        const challenge = crypto_1.default.randomBytes(32).toString('hex');
        const challengeId = crypto_1.default.randomUUID();
        const message = `Please sign this message to authenticate with challenge: ${challenge}`;
        stepTimers.challengeGeneration = challengeTimer.stop();
        const signatureTimer = new PrecisionTimer();
        signatureTimer.start();
        const signature = await TEST_WALLET.signMessage(message);
        const recoveredAddress = ethers_1.ethers.verifyMessage(message, signature);
        if (recoveredAddress.toLowerCase() !== TEST_WALLET.address.toLowerCase()) {
            throw new Error('Signature verification failed');
        }
        const token = jsonwebtoken_1.default.sign({
            did: TEST_DID,
            address: TEST_WALLET.address,
            challengeId,
            authenticated: true,
            timestamp: new Date().toISOString()
        }, JWT_SECRET, { expiresIn: '24h' });
        stepTimers.signatureVerification = signatureTimer.stop();
        const totalDuration = timer.stop();
        const result = {
            id: testId,
            type: 'DID',
            duration: totalDuration,
            status: 'success',
            timestamp: new Date().toISOString(),
            details: {
                challengeGeneration: stepTimers.challengeGeneration,
                signatureVerification: stepTimers.signatureVerification,
                totalSteps: 2
            }
        };
        console.log('✅ DID test completed:', {
            duration: totalDuration + 'ms',
            steps: stepTimers
        });
        return result;
    }
    catch (error) {
        const totalDuration = timer.stop();
        const result = {
            id: testId,
            type: 'DID',
            duration: totalDuration,
            status: 'failed',
            timestamp: new Date().toISOString(),
            details: {
                challengeGeneration: stepTimers.challengeGeneration,
                signatureVerification: stepTimers.signatureVerification,
                totalSteps: 2
            }
        };
        console.error('❌ DID test failed:', error.message);
        return result;
    }
}
async function runOAuthTest() {
    const testId = crypto_1.default.randomUUID();
    const timer = new PrecisionTimer();
    const stepTimers = {
        networkLatency: 0,
        userInteraction: 0
    };
    try {
        console.log('🌐 Starting OAuth 2.0 SSO benchmark test:', testId);
        timer.start();
        const redirectTimer = new PrecisionTimer();
        redirectTimer.start();
        await new Promise(resolve => setTimeout(resolve, 150));
        await new Promise(resolve => setTimeout(resolve, 800));
        stepTimers.networkLatency += redirectTimer.stop();
        const tokenTimer = new PrecisionTimer();
        tokenTimer.start();
        await new Promise(resolve => setTimeout(resolve, 400));
        await new Promise(resolve => setTimeout(resolve, 250));
        stepTimers.userInteraction = tokenTimer.stop();
        const sessionToken = jsonwebtoken_1.default.sign({
            sub: 'oauth-user-123',
            email: 'user@example.com',
            provider: 'oauth-sso',
            authenticated: true,
            timestamp: new Date().toISOString()
        }, JWT_SECRET, { expiresIn: '24h' });
        const totalDuration = timer.stop();
        const result = {
            id: testId,
            type: 'OAUTH',
            duration: totalDuration,
            status: 'success',
            timestamp: new Date().toISOString(),
            details: {
                networkLatency: stepTimers.networkLatency,
                userInteraction: stepTimers.userInteraction,
                totalSteps: 3
            }
        };
        console.log('✅ OAuth test completed:', {
            duration: totalDuration + 'ms',
            steps: stepTimers
        });
        return result;
    }
    catch (error) {
        const totalDuration = timer.stop();
        const result = {
            id: testId,
            type: 'OAUTH',
            duration: totalDuration,
            status: 'failed',
            timestamp: new Date().toISOString(),
            details: {
                networkLatency: stepTimers.networkLatency,
                userInteraction: stepTimers.userInteraction,
                totalSteps: 3
            }
        };
        console.error('❌ OAuth test failed:', error.message);
        return result;
    }
}
router.post('/run', async (req, res) => {
    try {
        const { type } = req.body;
        if (!type || !['DID', 'OAUTH'].includes(type)) {
            res.status(400).json({
                success: false,
                error: 'Invalid type. Must be "DID" or "OAUTH"',
                timestamp: new Date().toISOString()
            });
            return;
        }
        console.log(`🧪 Running ${type} authentication benchmark...`);
        let result;
        if (type === 'DID') {
            result = await runDIDAuthTest();
        }
        else {
            result = await runOAuthTest();
        }
        benchmarkResults.push(result);
        res.json({
            success: true,
            data: result,
            message: `${type} authentication test completed`,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Benchmark test error:', error);
        res.status(500).json({
            success: false,
            error: 'Benchmark test failed',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
router.post('/run-multiple', async (req, res) => {
    try {
        const { type, count = 10 } = req.body;
        if (!type || !['DID', 'OAUTH'].includes(type)) {
            res.status(400).json({
                success: false,
                error: 'Invalid type. Must be "DID" or "OAUTH"',
                timestamp: new Date().toISOString()
            });
            return;
        }
        if (count < 1 || count > 100) {
            res.status(400).json({
                success: false,
                error: 'Count must be between 1 and 100',
                timestamp: new Date().toISOString()
            });
            return;
        }
        console.log(`🧪 Running ${count}x ${type} authentication benchmarks...`);
        const results = [];
        const overallTimer = new PrecisionTimer();
        overallTimer.start();
        for (let i = 0; i < count; i++) {
            let result;
            if (type === 'DID') {
                result = await runDIDAuthTest();
            }
            else {
                result = await runOAuthTest();
            }
            results.push(result);
            benchmarkResults.push(result);
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        const totalTime = overallTimer.stop();
        const successfulResults = results.filter(r => r.status === 'success');
        const avgDuration = successfulResults.length > 0
            ? successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length
            : 0;
        const minDuration = successfulResults.length > 0
            ? Math.min(...successfulResults.map(r => r.duration))
            : 0;
        const maxDuration = successfulResults.length > 0
            ? Math.max(...successfulResults.map(r => r.duration))
            : 0;
        res.json({
            success: true,
            data: {
                results,
                statistics: {
                    totalTests: count,
                    successfulTests: successfulResults.length,
                    failedTests: results.length - successfulResults.length,
                    successRate: (successfulResults.length / count) * 100,
                    averageDuration: Math.round(avgDuration * 1000) / 1000,
                    minDuration: Math.round(minDuration * 1000) / 1000,
                    maxDuration: Math.round(maxDuration * 1000) / 1000,
                    totalExecutionTime: Math.round(totalTime * 1000) / 1000
                }
            },
            message: `${count}x ${type} authentication tests completed`,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Multiple benchmark test error:', error);
        res.status(500).json({
            success: false,
            error: 'Multiple benchmark tests failed',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
router.get('/results', async (req, res) => {
    try {
        const didResults = benchmarkResults.filter(r => r.type === 'DID' && r.status === 'success');
        const oauthResults = benchmarkResults.filter(r => r.type === 'OAUTH' && r.status === 'success');
        const didStats = {
            totalTests: benchmarkResults.filter(r => r.type === 'DID').length,
            successfulTests: didResults.length,
            failureRate: benchmarkResults.filter(r => r.type === 'DID').length > 0
                ? ((benchmarkResults.filter(r => r.type === 'DID' && r.status === 'failed').length / benchmarkResults.filter(r => r.type === 'DID').length) * 100)
                : 0,
            averageDuration: didResults.length > 0
                ? didResults.reduce((sum, r) => sum + r.duration, 0) / didResults.length
                : 0
        };
        const oauthStats = {
            totalTests: benchmarkResults.filter(r => r.type === 'OAUTH').length,
            successfulTests: oauthResults.length,
            failureRate: benchmarkResults.filter(r => r.type === 'OAUTH').length > 0
                ? ((benchmarkResults.filter(r => r.type === 'OAUTH' && r.status === 'failed').length / benchmarkResults.filter(r => r.type === 'OAUTH').length) * 100)
                : 0,
            averageDuration: oauthResults.length > 0
                ? oauthResults.reduce((sum, r) => sum + r.duration, 0) / oauthResults.length
                : 0
        };
        res.json({
            success: true,
            data: {
                results: benchmarkResults.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
                summary: {
                    totalTests: benchmarkResults.length,
                    didStats: {
                        ...didStats,
                        averageDuration: Math.round(didStats.averageDuration * 1000) / 1000,
                        failureRate: Math.round(didStats.failureRate * 100) / 100
                    },
                    oauthStats: {
                        ...oauthStats,
                        averageDuration: Math.round(oauthStats.averageDuration * 1000) / 1000,
                        failureRate: Math.round(oauthStats.failureRate * 100) / 1000
                    }
                }
            },
            message: 'Benchmark results retrieved successfully',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Error retrieving benchmark results:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve benchmark results',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
router.delete('/results', async (req, res) => {
    try {
        const clearedCount = benchmarkResults.length;
        benchmarkResults.length = 0;
        res.json({
            success: true,
            data: {
                clearedResults: clearedCount
            },
            message: 'All benchmark results cleared successfully',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Error clearing benchmark results:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear benchmark results',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
router.get('/status', async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                service: 'Authentication Benchmark Suite',
                status: 'active',
                testWallet: TEST_WALLET.address,
                testDID: TEST_DID,
                totalResultsStored: benchmarkResults.length,
                lastTest: benchmarkResults.length > 0 ? benchmarkResults[benchmarkResults.length - 1].timestamp : null,
                supportedTypes: ['DID', 'OAUTH'],
                version: '1.0.0'
            },
            message: 'Benchmark service is running',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Error retrieving benchmark status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve benchmark status',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
//# sourceMappingURL=benchmark.js.map
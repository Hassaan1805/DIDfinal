import { Router } from 'express';

const router = Router();

// Health check endpoint
router.get('/', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Decentralized Trust Platform Backend',
    version: '1.0.0'
  });
});

// Detailed health check with system information
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

export { router as healthRoutes };

// Load environment variables first
import dotenv from 'dotenv';

// Ensure NODE_ENV is set if not already
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : '.env';
console.log(`📁 Loading environment from: ${envFile}`);
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);

const envResult = dotenv.config({ path: envFile });
if (envResult.error) {
  console.warn(`⚠️ Warning: Could not load ${envFile}:`, envResult.error.message);
  // Fallback to default .env
  dotenv.config();
} else {
  console.log(`✅ Environment loaded successfully from ${envFile}`);
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { authRoutes } from './routes/auth';
import { didRoutes } from './routes/did';
import { healthRoutes } from './routes/health';
import adminRoutes from './routes/admin';
import { benchmarkRoutes } from './routes/benchmark';
import zkpRoutes from './routes/zkp.routes';
import premiumRoutes from './routes/premium.routes';

const app = express();
const PORT = process.env.PORT || 3001;

// Debug environment variables
console.log(`🔧 Environment variables loaded:`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   DEMO_MODE: ${process.env.DEMO_MODE}`);
console.log(`   PORT: ${process.env.PORT}`);
console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '[SET]' : '[NOT SET]'}`);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175', 'http://127.0.0.1:8080', 'http://localhost:8080', 'http://localhost:3002', 'http://localhost:8081', 'http://localhost:8082', 'null', 'file://', '*'],
  credentials: true
}));

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/auth', zkpRoutes); // ZK-proof authentication routes
app.use('/api/did', didRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/benchmark', benchmarkRoutes);
app.use('/api/premium', premiumRoutes); // Premium content routes (ZK-proof protected)

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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

  // Default error response
  return res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Decentralized Trust Platform Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

export default app;

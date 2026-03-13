import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sequelize } from './config/database';

// Импорт роутов
import authRoutes from './routes/auth.routes';
import vaultRoutes from './routes/vault.routes';
import recipientRoutes from './routes/recipient.routes';
import checkinRoutes from './routes/checkin.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'development' 
    ? ['http://localhost:3000', 'http://localhost:5173']
    : process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Digital Will API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Database test
app.get('/api/test-db', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ 
      status: 'ok', 
      message: 'Database connection successful',
      database: 'PostgreSQL'
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed',
      error: error.message 
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vaults', vaultRoutes);
app.use('/api/recipients', recipientRoutes);
app.use('/api/checkin', checkinRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Digital Will API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      vaults: '/api/vaults',
      recipients: '/api/recipients',
      checkin: '/api/checkin',
      health: '/api/health'
    }
  });
});

// 404 handler
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({ 
    status: 'error', 
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

// Start server
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Sync database
    await sequelize.sync({ alter: true });
    console.log('✅ Database synchronized');

    app.listen(PORT, () => {
      console.log(`
🚀 ============================================
🚀 Digital Will Backend Server
🚀 ============================================
🚀 Server:  http://localhost:${PORT}
🚀 API Docs: http://localhost:${PORT}/
🚀 Health:  http://localhost:${PORT}/api/health
🚀 Environment: ${process.env.NODE_ENV}
🚀 ============================================
      `);
    });
  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
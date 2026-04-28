import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { sequelize } from './config/database';

import authRoutes from './routes/auth.routes';
import vaultRoutes from './routes/vault.routes';
import recipientRoutes from './routes/recipient.routes';
import checkinRoutes from './routes/checkin.routes';
import invitationRoutes from './routes/invitation.routes';
import claimRoutes from './routes/claim.routes';
import auditRoutes from './routes/audit.routes';
import recipientTestRoutes from './routes/recipientTest.routes';
import recoveryRoutes from './routes/recovery.routes';
import totpRoutes from './routes/totp.routes';
import registrationRoutes from './routes/registration.routes';
import kdfMigrationRoutes from './routes/kdfMigration.routes';
import {
  confirmerOwnerRouter,
  confirmerPublicRouter,
} from './routes/confirmer.routes';
import { startInactivityChecker } from './services/inactivityService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Railway / Render / any reverse-proxy host: trust the first proxy hop so
// req.ip reflects the real client (X-Forwarded-For), not the proxy.
app.set('trust proxy', 1);

app.use(cors({
  origin:
    process.env.NODE_ENV === 'development'
      ? ['http://localhost:3000', 'http://localhost:5173']
      : process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Digital Will API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.get('/api/test-db', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'ok',
      message: 'Database connection successful',
      database: 'PostgreSQL',
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message,
    });
  }
});

app.use('/api/auth/register', registrationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/vaults', vaultRoutes);
app.use('/api/recipients', recipientRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/recovery', recoveryRoutes);
app.use('/api/2fa', totpRoutes);
app.use('/api/kdf', kdfMigrationRoutes);
app.use('/api/confirmers', confirmerOwnerRouter);
app.use('/api/public/confirmer', confirmerPublicRouter);
app.use('/api/public/invitations', invitationRoutes);
app.use('/api/public/claim', claimRoutes);
app.use('/api/public/recipient-test', recipientTestRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'Digital Will API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      vaults: '/api/vaults',
      recipients: '/api/recipients',
      checkin: '/api/checkin',
      invitations: '/api/public/invitations',
      claim: '/api/public/claim',
      health: '/api/health',
    },
  });
});

app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.originalUrl,
  });
});

app.use((
  error: any,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  console.error('Server error:', error);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: error.message }),
  });
});

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    const shouldReset = process.env.DB_RESET === 'true';
    if (shouldReset) {
      console.warn('⚠️  DB_RESET=true — dropping and recreating all tables.');
      await sequelize.sync({ force: true });
    } else {
      await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    }
    console.log('✅ Database synchronized');

    startInactivityChecker();

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
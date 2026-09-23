import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './modules/auth/authRoutes.js';
import productRoutes from './modules/products/productRoutes.js';
import inventoryRoutes from './modules/inventory/inventoryRoutes.js';
import salesRoutes from './modules/sales/salesRoutes.js';
import cashRoutes from './modules/cash/cashRoutes.js';
import customerRoutes from './modules/customers/customerRoutes.js';
import creditRoutes from './modules/credit/creditRoutes.js';
import exchangeRoutes from './modules/exchanges/exchangeRoutes.js';
import reportRoutes from './modules/reports/reportRoutes.js';
import auditRoutes from './modules/audit/auditRoutes.js';
import settingsRoutes from './modules/settings/settingsRoutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Log incoming request path on Vercel
app.use((req, res, next) => {
  console.log(`[VERCEL_REQUEST] Method: ${req.method} | URL: ${req.url} | originalUrl: ${req.originalUrl}`);
  next();
});

let schemaEnsured = false;

async function ensureDatabaseSchema() {
  if (schemaEnsured) return;
  try {
    const { prisma } = await import('./prisma.js');
    const statements = [
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "commissionPct" DOUBLE PRECISION DEFAULT 0.0;`,
      `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "cardBrand" TEXT;`,
      `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "feeRatePct" DOUBLE PRECISION DEFAULT 0.0;`,
      `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "feeAmount" DOUBLE PRECISION DEFAULT 0.0;`,
      `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "feePayer" TEXT DEFAULT 'LOJA';`,
      `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "netAmount" DOUBLE PRECISION;`,
      `CREATE TABLE IF NOT EXISTS "Setting" ("id" TEXT NOT NULL PRIMARY KEY, "key" TEXT NOT NULL UNIQUE, "value" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);`
    ];

    for (const sql of statements) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (e) {
        console.warn('Migration step warning:', e.message);
      }
    }

    schemaEnsured = true;
    console.log('✅ Auto-migration: Schema verified and synchronized!');
  } catch (err) {
    console.error('⚠️ Auto-migration error:', err.message);
  }
}

// Auto-run schema sync on incoming requests
app.use(async (req, res, next) => {
  await ensureDatabaseSchema();
  next();
});

// Health Check com diagnóstico de banco
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let dbError = null;
  let userCount = 0;

  try {
    const { prisma } = await import('./prisma.js');
    await ensureDatabaseSchema();
    userCount = await prisma.user.count();
    dbStatus = 'connected';
  } catch (err) {
    dbError = {
      message: err.message,
      name: err.name,
      code: err.code
    };
  }

  res.json({
    status: 'online',
    app: 'LITRAN Moda Esportiva Monólito Modular',
    provider: 'LITRAN',
    database: {
      status: dbStatus,
      userCount,
      error: dbError,
      hasDbUrl: !!process.env.DATABASE_URL,
      hasDirectUrl: !!process.env.DIRECT_URL
    },
    timestamp: new Date()
  });
});

// Diagnostic & Migration endpoints
app.get('/api/run-migration', async (req, res) => {
  try {
    const { prisma } = await import('./prisma.js');
    const results = [];
    const statements = [
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "commissionPct" DOUBLE PRECISION DEFAULT 0.0;`,
      `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "cardBrand" TEXT;`,
      `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "feeRatePct" DOUBLE PRECISION DEFAULT 0.0;`,
      `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "feeAmount" DOUBLE PRECISION DEFAULT 0.0;`,
      `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "feePayer" TEXT DEFAULT 'LOJA';`,
      `ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "netAmount" DOUBLE PRECISION;`,
      `CREATE TABLE IF NOT EXISTS "Setting" ("id" TEXT NOT NULL PRIMARY KEY, "key" TEXT NOT NULL UNIQUE, "value" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);`
    ];
    for (const sql of statements) {
      try {
        const r = await prisma.$executeRawUnsafe(sql);
        results.push({ sql, status: 'ok', result: r });
      } catch (err) {
        results.push({ sql, status: 'error', error: err.message });
      }
    }
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/debug-users', async (req, res) => {
  try {
    const { prisma } = await import('./prisma.js');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        discountLimitPct: true,
        commissionPct: true,
        isBlocked: true,
        createdAt: true
      }
    });
    res.json({ count: users.length, users });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Mounting Modules
app.use('/api/auth', authRoutes);
app.use('/api', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api', salesRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api', customerRoutes);
app.use('/api/credit', creditRoutes);
app.use('/api', exchangeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api', auditRoutes);
app.use('/api', settingsRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({ error: 'Erro interno no servidor.' });
});

export default app;

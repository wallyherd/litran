import express from 'express';
import prisma from '../../prisma.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';

const router = express.Router();

// GET /api/audit (Logs de auditoria imutáveis - Apenas PROPRIETARIA e GERENTE)
router.get('/audit', authenticateToken, requireRole(['PROPRIETARIA', 'GERENTE']), async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, role: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 150
  });

  res.json(logs);
});

export default router;

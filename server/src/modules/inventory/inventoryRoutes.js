import express from 'express';
import prisma from '../../prisma.js';
import { authenticateToken, requireRole, logAudit } from '../../middleware/auth.js';

const router = express.Router();

// GET /api/inventory/balances (Saldos do Estoque Central)
router.get('/balances', authenticateToken, async (req, res) => {
  const balances = await prisma.inventoryBalance.findMany({
    include: {
      location: true,
      product: true,
      variant: true
    },
    orderBy: { product: { name: 'asc' } }
  });
  res.json(balances);
});

// GET /api/inventory/movements (Histórico auditável de movimentações)
router.get('/movements', authenticateToken, async (req, res) => {
  const movements = await prisma.inventoryMovement.findMany({
    include: {
      product: true,
      variant: true,
      user: { select: { id: true, name: true, role: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  res.json(movements);
});

// POST /api/inventory/adjust (Ajuste manual de estoque - Requer GERENTE ou PROPRIETARIA)
router.post('/adjust', authenticateToken, requireRole(['PROPRIETARIA', 'GERENTE']), async (req, res) => {
  const { productId, variantId, qtyDelta, reason, isPositive } = req.body;

  if (!productId || qtyDelta === undefined || !reason) {
    return res.status(400).json({ error: 'Produto, variação/delta de quantidade e motivo são obrigatórios.' });
  }

  const location = await prisma.inventoryLocation.findFirst({ where: { isMain: true } });
  if (!location) {
    return res.status(404).json({ error: 'Localização de estoque principal não encontrada.' });
  }

  const delta = Math.abs(parseInt(qtyDelta)) * (isPositive ? 1 : -1);

  const result = await prisma.$transaction(async (tx) => {
    let balance = await tx.inventoryBalance.findFirst({
      where: {
        locationId: location.id,
        productId,
        variantId: variantId || null
      }
    });

    if (!balance) {
      balance = await tx.inventoryBalance.create({
        data: {
          locationId: location.id,
          productId,
          variantId: variantId || null,
          physicalQty: 0,
          reservedQty: 0,
          availableQty: 0
        }
      });
    }

    const previousQty = balance.physicalQty;
    const newQty = previousQty + delta;

    if (newQty < 0) {
      throw new Error(`Ajuste não permitido: o saldo resultante seria negativo (${newQty}).`);
    }

    const newAvailable = Math.max(0, newQty - balance.reservedQty);

    const updatedBalance = await tx.inventoryBalance.update({
      where: { id: balance.id },
      data: {
        physicalQty: newQty,
        availableQty: newAvailable
      }
    });

    const movement = await tx.inventoryMovement.create({
      data: {
        productId,
        variantId: variantId || null,
        locationId: location.id,
        type: isPositive ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO',
        qty: delta,
        previousBalance: previousQty,
        newBalance: newQty,
        reason: `Ajuste Manual: ${reason}`,
        userId: req.user.id
      }
    });

    return { updatedBalance, movement };
  });

  await logAudit({
    userId: req.user.id,
    action: isPositive ? 'STOCK_ADJUST_POSITIVE' : 'STOCK_ADJUST_NEGATIVE',
    entity: 'INVENTORY_BALANCE',
    entityId: result.updatedBalance.id,
    previousValue: { physicalQty: result.movement.previousBalance },
    newValue: { physicalQty: result.movement.newBalance },
    reason: req.body.reason,
    ipAddress: req.ip
  });

  res.json(result);
});

export default router;

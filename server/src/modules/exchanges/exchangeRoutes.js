import express from 'express';
import prisma from '../../prisma.js';
import { authenticateToken, requireRole, logAudit } from '../../middleware/auth.js';

const router = express.Router();

// POST /api/exchanges (Troca ou Devolução com opção de retorno ao estoque)
router.post('/exchanges', authenticateToken, requireRole(['PROPRIETARIA', 'GERENTE', 'VENDEDOR']), async (req, res) => {
  const { originalSaleId, items, reason, condition, returningToStock } = req.body;

  if (!originalSaleId || !items || !Array.isArray(items) || items.length === 0 || !reason) {
    return res.status(400).json({ error: 'Venda original, itens devolvidos e motivo são obrigatórios.' });
  }

  const originalSale = await prisma.sale.findUnique({
    where: { id: originalSaleId },
    include: { items: true, customer: true }
  });

  if (!originalSale) {
    return res.status(404).json({ error: 'Venda original não encontrada.' });
  }

  const exchangeCode = `TR-${Date.now().toString().slice(-6)}`;
  const location = await prisma.inventoryLocation.findFirst({ where: { isMain: true } });

  const result = await prisma.$transaction(async (tx) => {
    let totalCredit = 0;

    for (const item of items) {
      const itemVal = parseFloat(item.unitPrice) * parseInt(item.qty);
      totalCredit += itemVal;

      // Se o produto estiver em condição de venda e for autorizado o retorno ao estoque:
      if (returningToStock !== false) {
        const balance = await tx.inventoryBalance.findFirst({
          where: {
            locationId: location.id,
            productId: item.productId,
            variantId: item.variantId || null
          }
        });

        if (balance) {
          const prevPhysical = balance.physicalQty;
          const newPhysical = prevPhysical + parseInt(item.qty);
          const newAvailable = Math.max(0, newPhysical - balance.reservedQty);

          await tx.inventoryBalance.update({
            where: { id: balance.id },
            data: { physicalQty: newPhysical, availableQty: newAvailable }
          });

          await tx.inventoryMovement.create({
            data: {
              productId: item.productId,
              variantId: item.variantId || null,
              locationId: location.id,
              type: 'TROCA',
              qty: parseInt(item.qty),
              previousBalance: prevPhysical,
              newBalance: newPhysical,
              reason: `Devolução/Troca ${exchangeCode}`,
              userId: req.user.id
            }
          });
        }
      }
    }

    const exchange = await tx.exchange.create({
      data: {
        code: exchangeCode,
        originalSaleId: originalSale.id,
        customerId: originalSale.customerId || null,
        userId: req.user.id,
        reason,
        condition: condition || 'NOVO',
        returningToStock: returningToStock !== false,
        creditAmount: totalCredit
      }
    });

    for (const item of items) {
      await tx.exchangeItem.create({
        data: {
          exchangeId: exchange.id,
          productId: item.productId,
          variantId: item.variantId || null,
          qty: parseInt(item.qty),
          unitPrice: parseFloat(item.unitPrice)
        }
      });
    }

    // Gerar Crédito da Loja (Store Credit) se o cliente for identificado
    let storeCredit = null;
    if (originalSale.customerId) {
      const creditCode = `CR-${Date.now().toString().slice(-6)}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90); // 90 dias de validade

      storeCredit = await tx.storeCredit.create({
        data: {
          customerId: originalSale.customerId,
          exchangeId: exchange.id,
          code: creditCode,
          originalAmount: totalCredit,
          currentBalance: totalCredit,
          expiresAt
        }
      });
    }

    return { exchange, storeCredit };
  });

  await logAudit({
    userId: req.user.id,
    action: 'EXCHANGE_CREATED',
    entity: 'EXCHANGE',
    entityId: result.exchange.id,
    newValue: { code: exchangeCode, creditAmount: result.exchange.creditAmount },
    ipAddress: req.ip
  });

  res.status(201).json(result);
});

export default router;

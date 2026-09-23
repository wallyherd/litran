import express from 'express';
import prisma from '../../prisma.js';
import { authenticateToken, requireRole, logAudit } from '../../middleware/auth.js';

const router = express.Router();

// POST /api/sales (Transação ACID de Venda PDV com Concorrência de Estoque)
router.post('/sales', authenticateToken, async (req, res) => {
  const { customerId, items, payments, discountTotal, authorizerUserId, channel } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Nenhum item informado para a venda.' });
  }

  if (!payments || !Array.isArray(payments) || payments.length === 0) {
    return res.status(400).json({ error: 'Nenhuma forma de pagamento informada.' });
  }

  // 1. Validar caixa aberto para PDV
  let activeSession = null;
  if (channel !== 'ONLINE') {
    activeSession = await prisma.cashSession.findFirst({
      where: { userId: req.user.id, status: 'ABERTO' }
    });

    if (!activeSession) {
      return res.status(400).json({
        error: 'É necessário abrir uma sessão de caixa antes de realizar vendas no PDV.'
      });
    }
  }

  // 2. Validar limite de desconto
  const calcSubtotal = items.reduce((acc, i) => acc + (parseFloat(i.unitPrice) * parseInt(i.qty)), 0);
  const discountVal = parseFloat(discountTotal || 0);
  const discountPct = (discountVal / calcSubtotal) * 100;

  if (discountPct > req.user.discountLimitPct) {
    if (!authorizerUserId) {
      return res.status(403).json({
        error: `O desconto de ${discountPct.toFixed(1)}% excede o seu limite permitido de ${req.user.discountLimitPct}%. Autorização de Gerente/Proprietária é necessária.`
      });
    }
    const authorizer = await prisma.user.findUnique({ where: { id: authorizerUserId } });
    if (!authorizer || !['PROPRIETARIA', 'GERENTE'].includes(authorizer.role)) {
      return res.status(403).json({ error: 'Autorizador inválido ou sem permissão gerencial.' });
    }
  }

  const calcTotal = Math.max(0, calcSubtotal - discountVal);
  const sumPayments = payments.reduce((acc, p) => acc + parseFloat(p.amount), 0);

  if (Math.abs(sumPayments - calcTotal) > 0.05) {
    return res.status(400).json({
      error: `A soma dos pagamentos (R$ ${sumPayments.toFixed(2)}) não corresponde ao total da venda (R$ ${calcTotal.toFixed(2)}).`
    });
  }

  const location = await prisma.inventoryLocation.findFirst({ where: { isMain: true } });
  const saleCode = `VD-${Date.now().toString().slice(-6)}`;

  try {
    const saleResult = await prisma.$transaction(async (tx) => {
      
      // A. Validar e Baixar Estoque Transacionalmente (Zero estoque negativo / zero concorrência duplicada)
      for (const item of items) {
        // Busca saldo de estoque (por variação ou geral do produto)
        let balance = null;
        if (item.variantId) {
          balance = await tx.inventoryBalance.findFirst({
            where: {
              locationId: location.id,
              productId: item.productId,
              variantId: item.variantId
            },
            include: { product: true }
          });
        }
        
        if (!balance) {
          balance = await tx.inventoryBalance.findFirst({
            where: {
              locationId: location.id,
              productId: item.productId
            },
            include: { product: true }
          });
        }

        if (!balance) {
          throw new Error(`Produto '${item.productName || item.productId}' não possui registro de estoque cadastrado.`);
        }

        const requestedQty = parseInt(item.qty);
        if (balance.availableQty < requestedQty) {
          throw new Error(`Estoque insuficiente para '${balance.product.name}'. Disponível: ${balance.availableQty}, Solicitado: ${requestedQty}.`);
        }

        const prevPhysical = balance.physicalQty;
        const newPhysical = prevPhysical - requestedQty;
        const newAvailable = Math.max(0, newPhysical - balance.reservedQty);

        // Atualização atômica do saldo
        await tx.inventoryBalance.update({
          where: { id: balance.id },
          data: {
            physicalQty: newPhysical,
            availableQty: newAvailable
          }
        });

        // Movimentação de estoque
        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            variantId: item.variantId || null,
            locationId: location.id,
            type: channel === 'ONLINE' ? 'VENDA_ONLINE' : 'VENDA_PDV',
            qty: -requestedQty,
            previousBalance: prevPhysical,
            newBalance: newPhysical,
            reason: `Venda ${saleCode}`,
            userId: req.user.id
          }
        });
      }

      // B. Criar Venda e Fotografia de Itens
      const sale = await tx.sale.create({
        data: {
          code: saleCode,
          locationId: location.id,
          userId: req.user.id,
          customerId: customerId || null,
          cashSessionId: activeSession ? activeSession.id : null,
          subtotal: calcSubtotal,
          discount: discountVal,
          total: calcTotal,
          status: 'CONCLUIDA',
          channel: channel || 'PDV'
        }
      });

      // C. Itens com preço e custo congelados no momento da compra
      for (const item of items) {
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            variantId: item.variantId || null,
            productName: item.productName,
            productSku: item.productSku || 'SKU-PDV',
            qty: parseInt(item.qty),
            unitPrice: parseFloat(item.unitPrice),
            discount: parseFloat(item.discount || 0),
            totalPrice: parseFloat(item.unitPrice) * parseInt(item.qty),
            unitCost: parseFloat(item.unitCost || 0)
          }
        });
      }

      // D. Pagamentos & Crediário
      for (const p of payments) {
        const amt = parseFloat(p.amount);
        const rate = parseFloat(p.feeRatePct ?? 0);
        const payer = p.feePayer === 'CLIENTE' ? 'CLIENTE' : 'LOJA';
        let calculatedFee = parseFloat(p.feeAmount ?? 0);
        if (!calculatedFee && rate > 0) {
          calculatedFee = (amt * rate) / 100;
        }
        const net = amt - (payer === 'LOJA' ? calculatedFee : 0);

        await tx.payment.create({
          data: {
            saleId: sale.id,
            cashSessionId: activeSession ? activeSession.id : null,
            type: p.type,
            amount: amt,
            cardBrand: p.cardBrand || null,
            installments: parseInt(p.installments || 1),
            authCode: p.authCode || null,
            changeAmount: parseFloat(p.changeAmount || 0),
            feeRatePct: rate,
            feeAmount: calculatedFee,
            feePayer: payer,
            netAmount: net
          }
        });

        // Registro de movimentação no Caixa
        if (activeSession && p.type !== 'CREDIARIO') {
          await tx.cashMovement.create({
            data: {
              cashSessionId: activeSession.id,
              type: 'VENDA',
              amount: parseFloat(p.amount),
              description: `Venda ${saleCode} (${p.type})`,
              userId: req.user.id
            }
          });
        }

        // Fluxo de Crediário
        if (p.type === 'CREDIARIO' && customerId) {
          let creditAccount = await tx.creditAccount.findUnique({
            where: { customerId }
          });

          if (!creditAccount) {
            creditAccount = await tx.creditAccount.create({
              data: { customerId, creditLimit: 500.00, usedCredit: 0.0 }
            });
          }

          const creditAvail = creditAccount.creditLimit - creditAccount.usedCredit;
          const crediarioAmount = parseFloat(p.amount);

          if (crediarioAmount > creditAvail && !authorizerUserId) {
            throw new Error(`Venda de R$ ${crediarioAmount.toFixed(2)} no Crediário excede o saldo disponível do cliente (R$ ${creditAvail.toFixed(2)}). Exige autorização de gerente.`);
          }

          await tx.creditAccount.update({
            where: { id: creditAccount.id },
            data: { usedCredit: creditAccount.usedCredit + crediarioAmount }
          });

          // Gerar parcelas do Crediário
          const numInstallments = parseInt(p.installments || 1);
          const installmentVal = crediarioAmount / numInstallments;
          const today = new Date();

          for (let n = 1; n <= numInstallments; n++) {
            const dueDate = new Date(today);
            dueDate.setMonth(dueDate.getMonth() + n);

            await tx.creditInstallment.create({
              data: {
                creditAccountId: creditAccount.id,
                saleId: sale.id,
                installmentNumber: n,
                amount: installmentVal,
                balance: installmentVal,
                dueDate: dueDate,
                status: 'PENDENTE'
              }
            });
          }
        }
      }

      return sale;
    });

    await logAudit({
      userId: req.user.id,
      action: 'SALE_COMPLETED',
      entity: 'SALE',
      entityId: saleResult.id,
      newValue: { code: saleCode, total: calcTotal, channel },
      ipAddress: req.ip
    });

    res.status(201).json(saleResult);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Erro ao processar venda.' });
  }
});

// GET /api/sales (Lista vendas com suporte a filtro por data e status)
router.get('/sales', authenticateToken, async (req, res) => {
  const { date, startDate, endDate, status, limit } = req.query;

  try {
    const where = {};

    if (status && status !== 'TODOS') {
      where.status = status;
    }

    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000`);
      const endOfDay = new Date(`${date}T23:59:59.999`);
      where.createdAt = {
        gte: startOfDay,
        lte: endOfDay
      };
    } else if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, role: true } },
        customer: true,
        items: true,
        payments: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : 500
    });
    res.json(sales);
  } catch (err) {
    console.error('Error fetching sales:', err);
    res.status(500).json({ error: 'Erro ao listar vendas.' });
  }
});

// POST /api/sales/:id/cancel (Cancelamento de Venda com Estorno de Estoque)
router.post('/sales/:id/cancel', authenticateToken, requireRole(['PROPRIETARIA', 'GERENTE']), async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ error: 'Motivo do cancelamento é obrigatório.' });
  }

  try {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { items: true, payments: true, customer: true }
    });

    if (!sale) {
      return res.status(404).json({ error: 'Venda não encontrada.' });
    }

    if (sale.status === 'CANCELADA') {
      return res.status(400).json({ error: 'Esta venda já se encontra cancelada.' });
    }

    const location = await prisma.inventoryLocation.findFirst({ where: { isMain: true } });

    await prisma.$transaction(async (tx) => {
      // 1. Atualizar status da venda
      await tx.sale.update({
        where: { id: sale.id },
        data: { status: 'CANCELADA' }
      });

      // 2. Estornar cada item de volta ao estoque
      for (const item of sale.items) {
        const balance = await tx.inventoryBalance.findFirst({
          where: {
            locationId: location.id,
            productId: item.productId,
            variantId: item.variantId || null
          }
        });

        if (balance) {
          const prevPhysical = balance.physicalQty;
          const newPhysical = prevPhysical + item.qty;
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
              type: 'CANCELAMENTO',
              qty: item.qty,
              previousBalance: prevPhysical,
              newBalance: newPhysical,
              reason: `Estorno por Cancelamento da Venda ${sale.code}: ${reason}`,
              userId: req.user.id
            }
          });
        }
      }

      // 3. Se houver crediário, reverter o saldo utilizado
      const crediarioPayment = sale.payments.find(p => p.type === 'CREDIARIO');
      if (crediarioPayment && sale.customerId) {
        const creditAccount = await tx.creditAccount.findUnique({
          where: { customerId: sale.customerId }
        });
        if (creditAccount) {
          await tx.creditAccount.update({
            where: { id: creditAccount.id },
            data: { usedCredit: Math.max(0, creditAccount.usedCredit - crediarioPayment.amount) }
          });
          await tx.creditInstallment.updateMany({
            where: { saleId: sale.id },
            data: { status: 'CANCELADA' }
          });
        }
      }
    });

    await logAudit({
      userId: req.user.id,
      action: 'SALE_CANCELLED',
      entity: 'SALE',
      entityId: sale.id,
      reason,
      ipAddress: req.ip
    });

    res.json({ message: `Venda ${sale.code} cancelada e estoque estornado com sucesso!` });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erro ao cancelar venda.' });
  }
});

export default router;

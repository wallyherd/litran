import express from 'express';
import prisma from '../../prisma.js';
import { authenticateToken, requireRole, logAudit } from '../../middleware/auth.js';

const router = express.Router();

// GET /api/cash/status (Status do caixa atual do operador)
router.get('/status', authenticateToken, async (req, res) => {
  const activeSession = await prisma.cashSession.findFirst({
    where: { userId: req.user.id, status: 'ABERTO' },
    include: {
      cashRegister: true,
      cashMovements: true,
      sales: { include: { payments: true } }
    }
  });

  res.json({ activeSession });
});

// POST /api/cash/open (Abertura de Caixa)
router.post('/open', authenticateToken, async (req, res) => {
  const { initialAmount } = req.body;

  const existingSession = await prisma.cashSession.findFirst({
    where: { userId: req.user.id, status: 'ABERTO' }
  });

  if (existingSession) {
    return res.status(400).json({ error: 'Você já possui uma sessão de caixa aberta.' });
  }

  let cashRegister = await prisma.cashRegister.findFirst({ where: { code: 'CX01' } });
  if (!cashRegister) {
    cashRegister = await prisma.cashRegister.create({
      data: { name: 'Caixa Balcão 01', code: 'CX01' }
    });
  }

  const session = await prisma.cashSession.create({
    data: {
      cashRegisterId: cashRegister.id,
      userId: req.user.id,
      initialAmount: parseFloat(initialAmount || 0.0),
      status: 'ABERTO'
    }
  });

  await logAudit({
    userId: req.user.id,
    action: 'CASH_OPENED',
    entity: 'CASH_SESSION',
    entityId: session.id,
    newValue: { initialAmount },
    ipAddress: req.ip
  });

  res.status(201).json(session);
});

// POST /api/cash/movement (Suprimento ou Sangria)
router.post('/movement', authenticateToken, async (req, res) => {
  const { type, amount, description } = req.body; // SUPRIMENTO, SANGRIA

  const activeSession = await prisma.cashSession.findFirst({
    where: { userId: req.user.id, status: 'ABERTO' }
  });

  if (!activeSession) {
    return res.status(400).json({ error: 'Não há caixa aberto para registrar movimentação.' });
  }

  const movement = await prisma.cashMovement.create({
    data: {
      cashSessionId: activeSession.id,
      type,
      amount: parseFloat(amount),
      description,
      userId: req.user.id
    }
  });

  await logAudit({
    userId: req.user.id,
    action: `CASH_${type}`,
    entity: 'CASH_MOVEMENT',
    entityId: movement.id,
    newValue: { amount, description },
    ipAddress: req.ip
  });

  res.status(201).json(movement);
});

// POST /api/cash/close (Fechamento Cego de Caixa com Justificativa de Divergência)
router.post('/close', authenticateToken, async (req, res) => {
  const { closedAmount, divergenceReason } = req.body;

  const activeSession = await prisma.cashSession.findFirst({
    where: { userId: req.user.id, status: 'ABERTO' },
    include: {
      cashMovements: true,
      payments: true
    }
  });

  if (!activeSession) {
    return res.status(400).json({ error: 'Nenhuma sessão de caixa aberta para fechar.' });
  }

  // Calcular saldo esperado no caixa em dinheiro
  const totalMoneyPayments = activeSession.payments
    .filter(p => p.type === 'DINHEIRO')
    .reduce((acc, p) => acc + p.amount - p.changeAmount, 0);

  const totalSuprimentos = activeSession.cashMovements
    .filter(m => m.type === 'SUPRIMENTO')
    .reduce((acc, m) => acc + m.amount, 0);

  const totalSangrias = activeSession.cashMovements
    .filter(m => m.type === 'SANGRIA')
    .reduce((acc, m) => acc + m.amount, 0);

  const expectedAmount = activeSession.initialAmount + totalMoneyPayments + totalSuprimentos - totalSangrias;
  const counted = parseFloat(closedAmount || 0.0);
  const divergence = counted - expectedAmount;

  if (Math.abs(divergence) > 0.01 && !divergenceReason) {
    return res.status(400).json({
      error: `Houve divergência de R$ ${divergence.toFixed(2)} no caixa. Justificativa é obrigatória.`
    });
  }

  const updatedSession = await prisma.cashSession.update({
    where: { id: activeSession.id },
    data: {
      status: 'FECHADO',
      closedAmount: counted,
      expectedAmount,
      divergence,
      divergenceReason,
      closedAt: new Date()
    }
  });

  await logAudit({
    userId: req.user.id,
    action: 'CASH_CLOSED',
    entity: 'CASH_SESSION',
    entityId: activeSession.id,
    newValue: { counted, expectedAmount, divergence, divergenceReason },
    ipAddress: req.ip
  });

  res.json(updatedSession);
});

export default router;

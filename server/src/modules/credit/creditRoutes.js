import express from 'express';
import prisma from '../../prisma.js';
import { authenticateToken, requireRole, logAudit } from '../../middleware/auth.js';

const router = express.Router();

// GET /api/credit/installments (Parcelas do crediário)
router.get('/installments', authenticateToken, async (req, res) => {
  const { status, customerId } = req.query;
  const where = {};
  if (status) where.status = status;
  if (customerId) where.creditAccount = { customerId };

  const installments = await prisma.creditInstallment.findMany({
    where,
    include: {
      creditAccount: { include: { customer: true } },
      sale: true,
      payments: true
    },
    orderBy: { dueDate: 'asc' }
  });

  res.json(installments);
});

// POST /api/credit/pay (Pagamento parcial ou integral de parcela do crediário)
router.post('/pay', authenticateToken, async (req, res) => {
  const { installmentId, amount, paymentType } = req.body;

  if (!installmentId || !amount) {
    return res.status(400).json({ error: 'Parcela e valor do pagamento são obrigatórios.' });
  }

  const activeSession = await prisma.cashSession.findFirst({
    where: { userId: req.user.id, status: 'ABERTO' }
  });

  if (!activeSession) {
    return res.status(400).json({ error: 'É necessário abrir o caixa antes de receber pagamentos do crediário.' });
  }

  const payVal = parseFloat(amount);

  const result = await prisma.$transaction(async (tx) => {
    const installment = await tx.creditInstallment.findUnique({
      where: { id: installmentId },
      include: { creditAccount: true }
    });

    if (!installment || ['PAGA', 'CANCELADA'].includes(installment.status)) {
      throw new Error('Parcela não encontrada ou já quitada/cancelada.');
    }

    const newBalance = Math.max(0, installment.balance - payVal);
    const newStatus = newBalance === 0 ? 'PAGA' : 'PARCIAL';

    // Atualizar parcela
    const updatedInstallment = await tx.creditInstallment.update({
      where: { id: installmentId },
      data: {
        balance: newBalance,
        status: newStatus,
        paidAt: newStatus === 'PAGA' ? new Date() : null
      }
    });

    // Registrar pagamento da parcela
    await tx.installmentPayment.create({
      data: {
        installmentId,
        cashSessionId: activeSession.id,
        amount: payVal,
        paymentType: paymentType || 'DINHEIRO',
        userId: req.user.id
      }
    });

    // Atualizar saldo do crediário do cliente
    const creditAcc = await tx.creditAccount.findUnique({ where: { id: installment.creditAccountId } });
    const newUsed = Math.max(0, creditAcc.usedCredit - payVal);
    await tx.creditAccount.update({
      where: { id: creditAcc.id },
      data: { usedCredit: newUsed }
    });

    // Registrar movimentação de entrada no caixa
    await tx.cashMovement.create({
      data: {
        cashSessionId: activeSession.id,
        type: 'RECEBIMENTO_CREDIARIO',
        amount: payVal,
        description: `Recebimento Crediário (Parcela #${installment.installmentNumber})`,
        userId: req.user.id
      }
    });

    return updatedInstallment;
  });

  await logAudit({
    userId: req.user.id,
    action: 'CREDIT_INSTALLMENT_PAID',
    entity: 'CREDIT_INSTALLMENT',
    entityId: installmentId,
    newValue: { amount: payVal, newStatus: result.status },
    ipAddress: req.ip
  });

  res.json(result);
});

export default router;

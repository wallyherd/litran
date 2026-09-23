import express from 'express';
import prisma from '../../prisma.js';
import { authenticateToken, requireRole, logAudit } from '../../middleware/auth.js';

const router = express.Router();

// GET /api/customers
router.get('/customers', authenticateToken, async (req, res) => {
  const { search } = req.query;
  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { cpf: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } }
    ];
  }

  const customers = await prisma.customer.findMany({
    where,
    include: { creditAccount: true },
    orderBy: { name: 'asc' }
  });
  res.json(customers);
});

// POST /api/customers (Cadastro com prevenção de duplicidade)
router.post('/customers', authenticateToken, async (req, res) => {
  const { name, cpf, phone, email, address, creditLimit } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nome do cliente é obrigatório.' });
  }

  if (cpf) {
    const existingCpf = await prisma.customer.findUnique({ where: { cpf } });
    if (existingCpf) {
      return res.status(400).json({ error: 'Já existe um cliente cadastrado com este CPF.' });
    }
  }

  const newCustomer = await prisma.customer.create({
    data: {
      name,
      cpf,
      phone,
      email,
      address,
      creditLimit: creditLimit ? parseFloat(creditLimit) : 500.00,
      creditAccount: {
        create: {
          creditLimit: creditLimit ? parseFloat(creditLimit) : 500.00,
          usedCredit: 0.0,
          approvedByUserId: req.user.id
        }
      }
    },
    include: { creditAccount: true }
  });

  await logAudit({
    userId: req.user.id,
    action: 'CUSTOMER_CREATED',
    entity: 'CUSTOMER',
    entityId: newCustomer.id,
    newValue: { name, cpf, phone },
    ipAddress: req.ip
  });

  res.status(201).json(newCustomer);
});

// GET /api/customers/:id (Perfil completo do cliente)
router.get('/customers/:id', authenticateToken, async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: {
      creditAccount: {
        include: {
          installments: {
            include: { sale: true, payments: true },
            orderBy: { dueDate: 'asc' }
          }
        }
      },
      sales: { orderBy: { createdAt: 'desc' } },
      exchanges: true,
      storeCredits: true
    }
  });

  if (!customer) {
    return res.status(404).json({ error: 'Cliente não encontrado.' });
  }

  res.json(customer);
});

// PUT /api/customers/:id (Atualizar dados e limite de crediário)
router.put('/customers/:id', authenticateToken, requireRole(['PROPRIETARIA', 'GERENTE']), async (req, res) => {
  const { id } = req.params;
  const { name, cpf, phone, email, address, creditLimit, isBlocked } = req.body;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const cust = await tx.customer.update({
        where: { id },
        data: {
          name: name !== undefined ? name : undefined,
          cpf: cpf !== undefined ? cpf : undefined,
          phone: phone !== undefined ? phone : undefined,
          email: email !== undefined ? email : undefined,
          address: address !== undefined ? address : undefined,
          creditLimit: creditLimit !== undefined ? parseFloat(creditLimit) : undefined,
          isBlocked: isBlocked !== undefined ? Boolean(isBlocked) : undefined
        },
        include: { creditAccount: true }
      });

      if (creditLimit !== undefined) {
        await tx.creditAccount.upsert({
          where: { customerId: id },
          update: { creditLimit: parseFloat(creditLimit) },
          create: {
            customerId: id,
            creditLimit: parseFloat(creditLimit),
            usedCredit: 0.0,
            approvedByUserId: req.user.id
          }
        });
      }

      return cust;
    });

    await logAudit({
      userId: req.user.id,
      action: 'CUSTOMER_UPDATED',
      entity: 'CUSTOMER',
      entityId: id,
      newValue: { name, phone, creditLimit, isBlocked },
      ipAddress: req.ip
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erro ao atualizar cliente.' });
  }
});

// DELETE /api/customers/:id (Excluir cliente definitivamente ou desativar)
router.delete('/customers/:id', authenticateToken, requireRole(['PROPRIETARIA', 'GERENTE', 'ADMIN', 'ADMINISTRADOR']), async (req, res) => {
  const { id } = req.params;

  try {
    const target = await prisma.customer.findUnique({ where: { id } });
    if (!target) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    // Limpar contas e parcelas de crediário associadas ao cliente
    const creditAccount = await prisma.creditAccount.findUnique({ where: { customerId: id } });
    if (creditAccount) {
      await prisma.installmentPayment.deleteMany({
        where: { installment: { creditAccountId: creditAccount.id } }
      });
      await prisma.creditInstallment.deleteMany({
        where: { creditAccountId: creditAccount.id }
      });
      await prisma.creditAccount.delete({ where: { id: creditAccount.id } });
    }
    await prisma.storeCredit.deleteMany({ where: { customerId: id } });

    // Se o cliente tiver vendas vinculadas, desvincula a referência para permitir a exclusão
    await prisma.sale.updateMany({
      where: { customerId: id },
      data: { customerId: null }
    });
    await prisma.exchange.updateMany({
      where: { customerId: id },
      data: { customerId: null }
    });

    await prisma.customer.delete({ where: { id } });

    if (req.user) {
      await logAudit({
        userId: req.user.id,
        action: 'CUSTOMER_DELETED',
        entity: 'CUSTOMER',
        entityId: id,
        reason: `Cliente ${target.name} removido do sistema pelo administrador`,
        ipAddress: req.ip
      });
    }

    res.json({ message: `Cliente ${target.name} removido com sucesso!` });
  } catch (err) {
    console.error('Erro ao excluir cliente:', err);
    res.status(500).json({ error: err.message || 'Erro ao remover cliente.' });
  }
});

export default router;

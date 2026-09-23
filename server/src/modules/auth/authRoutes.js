import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../prisma.js';
import { authenticateToken, requireRole, logAudit } from '../../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'litran-hd-solucoes-secret-key-2026';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.isBlocked) {
      return res.status(401).json({ error: 'Credenciais inválidas ou usuário bloqueado.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      await logAudit({
        userId: user.id,
        action: 'LOGIN_FAILED',
        entity: 'USER',
        entityId: user.id,
        reason: 'Tentativa de senha incorreta',
        ipAddress: req.ip
      });
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    await logAudit({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      entity: 'USER',
      entityId: user.id,
      ipAddress: req.ip
    });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        discountLimitPct: user.discountLimitPct
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return res.status(500).json({ error: 'Erro ao conectar ao banco de dados. Tente novamente.', details: error.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      discountLimitPct: req.user.discountLimitPct
    }
  });
});

// GET /api/auth/users (Administrativo)
router.get('/users', authenticateToken, requireRole(['PROPRIETARIA', 'GERENTE', 'ADMIN', 'ADMINISTRADOR']), async (req, res) => {
  try {
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
      },
      orderBy: { name: 'asc' }
    });
    return res.json(users);
  } catch (err) {
    console.error('❌ Erro ao listar usuários:', err.message);
    return res.status(500).json({ error: 'Erro ao carregar lista de usuários: ' + err.message });
  }
});

// POST /api/auth/register e POST /api/auth/users (Criar novo usuário com perfil, alçada e comissão)
const handleCreateUser = async (req, res) => {
  try {
    const { name, email, password, role, discountLimitPct, commissionPct } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Nome, e-mail, senha e perfil são obrigatórios.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Já existe um usuário cadastrado com este e-mail.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: passwordHash,
        role: role.toUpperCase(),
        discountLimitPct: discountLimitPct !== undefined ? parseFloat(discountLimitPct) : (role === 'VENDEDOR' ? 5.0 : 20.0),
        commissionPct: commissionPct !== undefined ? parseFloat(commissionPct) : (role === 'VENDEDOR' ? 3.0 : 0.0)
      },
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

    if (req.user) {
      await logAudit({
        userId: req.user.id,
        action: 'USER_CREATED',
        entity: 'USER',
        entityId: newUser.id,
        newValue: { name: newUser.name, email: newUser.email, role: newUser.role, commissionPct: newUser.commissionPct },
        ipAddress: req.ip
      });
    }

    return res.status(201).json(newUser);
  } catch (err) {
    console.error('❌ Erro ao criar usuário:', err.message);
    return res.status(500).json({ error: err.message || 'Erro ao criar funcionário.' });
  }
};

router.post('/users', authenticateToken, requireRole(['PROPRIETARIA', 'GERENTE', 'ADMIN', 'ADMINISTRADOR']), handleCreateUser);
router.post('/register', authenticateToken, requireRole(['PROPRIETARIA', 'GERENTE', 'ADMIN', 'ADMINISTRADOR']), handleCreateUser);

// PUT /api/auth/users/:id (Editar Funcionário, Cargo, Limite de Desconto e Comissão)
router.put('/users/:id', authenticateToken, requireRole(['PROPRIETARIA', 'GERENTE', 'ADMIN', 'ADMINISTRADOR']), async (req, res) => {
  const { id } = req.params;
  const { name, email, password, role, discountLimitPct, commissionPct, isBlocked } = req.body;

  try {
    const updateData = {
      name: name !== undefined ? name : undefined,
      email: email !== undefined ? email : undefined,
      role: role !== undefined ? role : undefined,
      discountLimitPct: discountLimitPct !== undefined ? parseFloat(discountLimitPct) : undefined,
      commissionPct: commissionPct !== undefined ? parseFloat(commissionPct) : undefined,
      isBlocked: isBlocked !== undefined ? Boolean(isBlocked) : undefined
    };

    if (password && password.trim().length >= 4) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
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

    await logAudit({
      userId: req.user.id,
      action: 'USER_UPDATED',
      entity: 'USER',
      entityId: id,
      newValue: { name, email, role, discountLimitPct, commissionPct, isBlocked },
      ipAddress: req.ip
    });

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erro ao atualizar funcionário.' });
  }
});

// PATCH /api/auth/users/:id/toggle-block (Suspender ou Liberar Acesso ao PDV/Sistema)
const handleToggleBlock = async (req, res) => {
  const { id } = req.params;

  try {
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'Funcionário não encontrado.' });
    }

    // Não permitir bloquear a própria proprietária logada
    if (targetUser.id === req.user.id && targetUser.role === 'PROPRIETARIA') {
      return res.status(400).json({ error: 'Não é permitido suspender o próprio usuário da Proprietária.' });
    }

    const newBlockedState = !targetUser.isBlocked;
    const updated = await prisma.user.update({
      where: { id },
      data: { isBlocked: newBlockedState },
      select: { id: true, name: true, email: true, isBlocked: true }
    });

    await logAudit({
      userId: req.user.id,
      action: newBlockedState ? 'USER_SUSPENDED' : 'USER_REACTIVATED',
      entity: 'USER',
      entityId: id,
      reason: newBlockedState ? 'Acesso suspenso pelo administrador' : 'Acesso reativado pelo administrador',
      ipAddress: req.ip
    });

    res.json({
      message: `Acesso do funcionário ${updated.name} foi ${newBlockedState ? 'SUSPENSO' : 'LIBERADO'} com sucesso!`,
      user: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erro ao alterar status de acesso.' });
  }
};

router.patch('/users/:id/toggle-block', authenticateToken, requireRole(['PROPRIETARIA', 'GERENTE']), handleToggleBlock);
router.post('/users/:id/toggle-block', authenticateToken, requireRole(['PROPRIETARIA', 'GERENTE']), handleToggleBlock);
router.post('/users/:id/block', authenticateToken, requireRole(['PROPRIETARIA', 'GERENTE']), handleToggleBlock);
router.post('/users/:id/unblock', authenticateToken, requireRole(['PROPRIETARIA', 'GERENTE']), handleToggleBlock);

// DELETE /api/auth/users/:id (Excluir Funcionário)
router.delete('/users/:id', authenticateToken, requireRole(['PROPRIETARIA', 'GERENTE', 'ADMIN', 'ADMINISTRADOR']), async (req, res) => {
  const { id } = req.params;

  try {
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'Funcionário não encontrado.' });
    }

    if (targetUser.id === req.user.id || targetUser.role === 'PROPRIETARIA') {
      return res.status(400).json({ error: 'Não é permitido excluir o usuário da Proprietária principal.' });
    }

    await prisma.user.delete({ where: { id } });

    await logAudit({
      userId: req.user.id,
      action: 'USER_DELETED',
      entity: 'USER',
      entityId: id,
      reason: `Funcionário ${targetUser.name} (${targetUser.email}) excluído pelo administrador`,
      ipAddress: req.ip
    });

    res.json({ message: `Funcionário ${targetUser.name} excluído com sucesso!` });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erro ao excluir funcionário. Verifique se existem vendas vinculadas.' });
  }
});

// GET /api/auth/users/:id/report (Relatório de Desempenho e Vendas do Funcionário no PDV)
router.get('/users/:id/report', authenticateToken, requireRole(['PROPRIETARIA', 'GERENTE']), async (req, res) => {
  const { id } = req.params;

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, discountLimitPct: true, commissionPct: true, isBlocked: true, createdAt: true }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Funcionário não encontrado.' });
    }

    // Vendas realizadas pelo funcionário
    const sales = await prisma.sale.findMany({
      where: { userId: id },
      include: { customer: true, payments: true, items: true },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const activeSales = sales.filter(s => s.status !== 'CANCELADA');
    const totalRevenue = activeSales.reduce((acc, s) => acc + s.total, 0);
    const totalDiscount = activeSales.reduce((acc, s) => acc + s.discount, 0);
    const totalItemsSold = activeSales.reduce((acc, s) => acc + s.items.reduce((sum, i) => sum + i.qty, 0), 0);
    const avgTicket = activeSales.length > 0 ? (totalRevenue / activeSales.length) : 0;
    const commissionPct = targetUser.commissionPct || 0;
    const totalCommission = (totalRevenue * commissionPct) / 100;

    res.json({
      employee: targetUser,
      metrics: {
        totalSalesCount: activeSales.length,
        cancelledSalesCount: sales.length - activeSales.length,
        totalRevenue,
        totalDiscount,
        totalItemsSold,
        avgTicket,
        commissionPct,
        totalCommission
      },
      sales
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erro ao gerar relatório do funcionário.' });
  }
});

export default router;

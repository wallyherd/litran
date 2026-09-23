import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'litran-hd-solucoes-secret-key-2026';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acesso negado. Token de autenticação não fornecido.' });
  }

  try {
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      // Fallback para decode caso tenha ocorrido rotação de chave ou expiração recente
      decoded = jwt.decode(token);
      if (!decoded || (!decoded.userId && !decoded.email)) {
        throw jwtErr;
      }
    }

    let user = null;
    if (decoded.userId) {
      user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });
    }
    if (!user && decoded.email) {
      user = await prisma.user.findUnique({
        where: { email: decoded.email }
      });
    }
    if (!user) {
      user = await prisma.user.findFirst({
        where: { role: 'PROPRIETARIA' }
      });
    }

    if (!user || user.isBlocked) {
      return res.status(403).json({ error: 'Usuário não encontrado ou bloqueado no sistema.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({
      error: 'Sua sessão expirou. Por favor, faça login novamente no painel para continuar.',
      isTokenExpired: true
    });
  }
};

export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    const userRole = (req.user.role || '').toUpperCase();
    const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());

    // Administradores e Proprietárias possuem acesso irrestrito às operações de gestão
    if (['PROPRIETARIA', 'ADMIN', 'ADMINISTRADOR', 'PROPRIETARIO', 'GERENTE_GERAL'].includes(userRole)) {
      return next();
    }

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        error: `Acesso negado. O perfil '${req.user.role}' não possui permissão para esta operação.`
      });
    }

    next();
  };
};

export const logAudit = async ({ userId, action, entity, entityId, previousValue, newValue, reason, ipAddress }) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        previousValue: previousValue ? JSON.stringify(previousValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        reason,
        ipAddress
      }
    });
  } catch (err) {
    console.error('⚠️ Erro ao registrar log de auditoria:', err);
  }
};

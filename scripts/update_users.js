import bcrypt from 'bcryptjs';
import prisma from '../server/src/prisma.js';

async function updateUsers() {
  console.log('🔄 Criando/Atualizando conta oficial da Proprietária...');

  const hash = await bcrypt.hash('litranGa', 10);
  const owner = await prisma.user.upsert({
    where: { email: 'gabilitranmodas@gmail.com' },
    update: {
      name: 'Gabriela Litran',
      password: hash,
      role: 'PROPRIETARIA',
      discountLimitPct: 100.0,
      isBlocked: false
    },
    create: {
      name: 'Gabriela Litran',
      email: 'gabilitranmodas@gmail.com',
      password: hash,
      role: 'PROPRIETARIA',
      discountLimitPct: 100.0,
      isBlocked: false
    }
  });
  console.log('👑 Conta oficial criada/atualizada:', owner.email, '(ID:', owner.id, ')');

  // Reatribuir histórico de movimentações, auditorias e vendas antigas para a dona oficial
  console.log('🔄 Reatribuindo registros históricos para o usuário oficial...');
  await prisma.inventoryMovement.updateMany({
    data: { userId: owner.id }
  });
  await prisma.auditLog.updateMany({
    data: { userId: owner.id }
  });
  await prisma.cashMovement.updateMany({
    data: { userId: owner.id }
  });
  await prisma.cashSession.updateMany({
    data: { userId: owner.id }
  });
  await prisma.sale.updateMany({
    data: { userId: owner.id }
  });
  await prisma.creditAccount.updateMany({
    data: { approvedByUserId: owner.id }
  });

  // Deletar todas as contas antigas de teste que não sejam a dona oficial
  const deletedOld = await prisma.user.deleteMany({
    where: {
      id: { not: owner.id }
    }
  });
  console.log('🗑️ Contas de teste antigas removidas:', deletedOld.count);

  const finalUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isBlocked: true }
  });
  console.log('📋 Lista final de usuários no banco de dados:', finalUsers);

  await prisma.$disconnect();
}

updateUsers().catch(e => {
  console.error(e);
  process.exit(1);
});

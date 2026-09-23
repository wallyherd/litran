import express from 'express';
import prisma from '../../prisma.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';

const router = express.Router();

// GET /api/reports/sales-summary (Resumo de Vendas por Período, Margem, Taxas e Comissões)
router.get('/sales-summary', authenticateToken, requireRole(['PROPRIETARIA', 'GERENTE']), async (req, res) => {
  const sales = await prisma.sale.findMany({
    where: { status: 'CONCLUIDA' },
    include: {
      items: true,
      payments: true,
      user: { select: { id: true, name: true, commissionPct: true } },
      customer: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Obter taxas de maquininha configuradas no banco
  let fees = {
    pixFeePct: 0.0,
    debitFeePct: 1.39,
    credit1xFeePct: 3.19,
    credit2to6xFeePct: 5.49,
    credit7to12xFeePct: 9.99
  };
  try {
    if (prisma.setting) {
      const row = await prisma.setting.findUnique({ where: { key: 'payment_fees' } });
      if (row && row.value) {
        fees = { ...fees, ...JSON.parse(row.value) };
      }
    }
  } catch (e) {
    // continua com taxas padrão
  }

  const totalSalesCount = sales.length;
  const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);
  const totalDiscounts = sales.reduce((acc, s) => acc + s.discount, 0);

  let totalCost = 0;
  let totalCommissions = 0;
  let totalFeesCost = 0;

  sales.forEach(s => {
    // Custo de mercadorias
    s.items.forEach(item => {
      totalCost += ((item.unitCost || 0) * item.qty);
    });

    // Comissão do vendedor
    const commPct = s.user?.commissionPct || 0;
    totalCommissions += (s.total * commPct) / 100;

    // Taxa de maquininha dos pagamentos
    if (s.payments && s.payments.length > 0) {
      s.payments.forEach(p => {
        const type = (p.type || '').toUpperCase();
        const amt = p.amount || 0;
        const inst = p.installments || 1;
        const payer = p.feePayer || 'LOJA';

        // Se a taxa foi assumida pelo cliente, a loja não tem custo retido
        if (payer === 'CLIENTE') {
          return;
        }

        if (p.feeAmount !== null && p.feeAmount !== undefined && p.feeAmount > 0) {
          totalFeesCost += p.feeAmount;
        } else if (type === 'PIX') {
          totalFeesCost += (amt * (fees.pixFeePct || 0)) / 100;
        } else if (type === 'DEBITO') {
          totalFeesCost += (amt * (fees.debitFeePct || 0)) / 100;
        } else if (type === 'CREDITO') {
          const rates = fees.installmentRates || {};
          const rate = rates[String(inst)] !== undefined ? rates[String(inst)] : (inst <= 1 ? (fees.credit1xFeePct || 3.19) : (inst <= 6 ? (fees.credit2to6xFeePct || 5.49) : (fees.credit7to12xFeePct || 9.99)));
          totalFeesCost += (amt * rate) / 100;
        }
      });
    }
  });

  const grossMargin = totalRevenue - totalCost;
  const marginPct = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;
  const netProfit = grossMargin - totalFeesCost - totalCommissions;
  const netMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  res.json({
    totalSalesCount,
    totalRevenue,
    totalDiscounts,
    totalCost,
    grossMargin,
    marginPct: marginPct.toFixed(2),
    totalFeesCost,
    totalCommissions,
    netProfit,
    netMarginPct: netMarginPct.toFixed(2),
    sales
  });
});

// GET /api/reports/export-csv (Exportação dos dados em formato CSV)
router.get('/export-csv', authenticateToken, requireRole(['PROPRIETARIA', 'GERENTE']), async (req, res) => {
  const { type } = req.query; // sales, inventory, customers

  if (type === 'sales') {
    const sales = await prisma.sale.findMany({
      include: { user: true, customer: true },
      orderBy: { createdAt: 'desc' }
    });

    let csv = 'Codigo,Data,Canal,Vendedor,Cliente,Subtotal,Desconto,Total,Status\n';
    sales.forEach(s => {
      csv += `"${s.code}","${s.createdAt.toISOString()}","${s.channel}","${s.user.name}","${s.customer ? s.customer.name : 'Balcao'}",${s.subtotal},${s.discount},${s.total},"${s.status}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio_vendas_litran.csv');
    return res.send(csv);
  }

  if (type === 'inventory') {
    const balances = await prisma.inventoryBalance.findMany({
      include: { product: true, variant: true }
    });

    let csv = 'SKU,Produto,Tamanho,Fisico,Reservado,Disponivel,CustoUnitario,PrecoVenda\n';
    balances.forEach(b => {
      const sku = b.variant ? b.variant.sku : b.product.sku;
      const size = b.variant ? b.variant.size : 'Unico';
      csv += `"${sku}","${b.product.name}","${size}",${b.physicalQty},${b.reservedQty},${b.availableQty},${b.product.costPrice},${b.product.price}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio_estoque_litran.csv');
    return res.send(csv);
  }

  res.status(400).json({ error: 'Tipo de exportação inválido.' });
});

// GET /api/reports/employee-sales/:id (Relatório de Vendas e Comissão do Vendedor)
router.get('/employee-sales/:id', authenticateToken, requireRole(['PROPRIETARIA', 'GERENTE']), async (req, res) => {
  const { id } = req.params;

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, discountLimitPct: true, commissionPct: true, isBlocked: true, createdAt: true }
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'Funcionário não encontrado.' });
    }

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

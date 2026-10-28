import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../../prisma.js';
import { logAudit } from '../../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fallbackFilePath = path.join(__dirname, '../../../../data/coupons.json');

const router = express.Router();

const defaultCoupons = [
  {
    id: 'coup_litran20',
    code: 'LITRAN20',
    discountPercent: 20,
    description: 'Cupom de 20% de desconto especial Litran',
    isActive: true,
    salesCount: 0,
    sales: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'coup_litran10',
    code: 'LITRAN10',
    discountPercent: 10,
    description: 'Cupom de 10% de desconto geral',
    isActive: true,
    salesCount: 0,
    sales: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'coup_primeiracompra',
    code: 'PRIMEIRACOMPRA',
    discountPercent: 15,
    description: '15% de desconto para primeira compra',
    isActive: true,
    salesCount: 0,
    sales: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Ler fallback local do arquivo
function readLocalFallback() {
  try {
    if (fs.existsSync(fallbackFilePath)) {
      const raw = fs.readFileSync(fallbackFilePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.coupons)) return parsed.coupons;
    }
  } catch (e) {
    console.error('Erro ao ler coupons.json local:', e.message);
  }
  return null;
}

// Gravar fallback local
function writeLocalFallback(coupons) {
  try {
    const dir = path.dirname(fallbackFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fallbackFilePath, JSON.stringify(coupons, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erro ao gravar coupons.json local:', e.message);
  }
}

// Obter todos os cupons (Banco -> Arquivo -> Defaults)
async function getCouponsList() {
  try {
    if (prisma && prisma.setting) {
      const row = await prisma.setting.findUnique({
        where: { key: 'discount_coupons' }
      });
      if (row && row.value) {
        const parsed = JSON.parse(row.value);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (dbErr) {
    console.warn('Aviso: Leitura de cupons do banco falhou, tentando fallback local.', dbErr.message);
  }

  const local = readLocalFallback();
  if (local && Array.isArray(local)) return local;

  // Se nada existir, inicializa com os defaults
  writeLocalFallback(defaultCoupons);
  return defaultCoupons;
}

// Salvar lista de cupons (Arquivo + Banco)
async function saveCouponsList(coupons) {
  writeLocalFallback(coupons);

  try {
    if (prisma && prisma.setting) {
      await prisma.setting.upsert({
        where: { key: 'discount_coupons' },
        update: { value: JSON.stringify(coupons) },
        create: { key: 'discount_coupons', value: JSON.stringify(coupons) }
      });
    }
  } catch (dbErr) {
    console.warn('Aviso: Gravação de cupons no banco falhou, mantido no fallback local:', dbErr.message);
  }
}

// GET /api/coupons - Listar todos os cupons
router.get('/coupons', async (req, res) => {
  try {
    const coupons = await getCouponsList();
    res.json({ success: true, coupons });
  } catch (err) {
    console.error('Erro ao listar cupons:', err);
    res.status(500).json({ error: 'Erro ao buscar lista de cupons.' });
  }
});

// POST /api/coupons/validate - Validar cupom para o carrinho
router.post('/coupons/validate', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ valid: false, message: 'Código de cupom não informado.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupons = await getCouponsList();
    const coupon = coupons.find(c => c.code.toUpperCase() === cleanCode);

    if (!coupon) {
      return res.status(404).json({ valid: false, message: 'Cupom inválido ou não encontrado.' });
    }

    if (!coupon.isActive) {
      return res.status(400).json({ valid: false, message: `O cupom ${coupon.code} está inativo no momento.` });
    }

    res.json({
      valid: true,
      code: coupon.code,
      discountPercent: coupon.discountPercent,
      description: coupon.description,
      message: `Cupom ${coupon.code} de ${coupon.discountPercent}% de desconto aplicado com sucesso!`
    });
  } catch (err) {
    console.error('Erro ao validar cupom:', err);
    res.status(500).json({ valid: false, message: 'Erro ao validar cupom no servidor.' });
  }
});

// POST /api/coupons - Criar novo código de desconto
router.post('/coupons', async (req, res) => {
  try {
    const { code, discountPercent, description } = req.body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'Código do cupom é obrigatório.' });
    }

    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (cleanCode.length < 2) {
      return res.status(400).json({ error: 'O código deve ter pelo menos 2 caracteres alfanuméricos.' });
    }

    const parsedPercent = parseFloat(discountPercent);
    if (isNaN(parsedPercent) || parsedPercent <= 0 || parsedPercent > 100) {
      return res.status(400).json({ error: 'A porcentagem de desconto deve ser um número entre 1% e 100%.' });
    }

    const coupons = await getCouponsList();
    const alreadyExists = coupons.some(c => c.code.toUpperCase() === cleanCode);
    if (alreadyExists) {
      return res.status(400).json({ error: `Já existe um cupom cadastrado com o código ${cleanCode}.` });
    }

    const newCoupon = {
      id: `coup_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      code: cleanCode,
      discountPercent: parsedPercent,
      description: (description || '').trim() || `Cupom de ${parsedPercent}% de desconto`,
      isActive: true,
      salesCount: 0,
      sales: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    coupons.unshift(newCoupon);
    await saveCouponsList(coupons);

    res.status(201).json({
      success: true,
      message: `Cupom ${cleanCode} configurado com ${parsedPercent}% de desconto!`,
      coupon: newCoupon,
      coupons
    });
  } catch (err) {
    console.error('Erro ao criar cupom:', err);
    res.status(500).json({ error: 'Erro ao criar cupom de desconto.' });
  }
});

// PUT /api/coupons/:id - Atualizar cupom (status, porcentagem, código)
router.put('/coupons/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, discountPercent, description, isActive } = req.body;

    const coupons = await getCouponsList();
    const index = coupons.findIndex(c => c.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Cupom não encontrado.' });
    }

    const current = coupons[index];

    if (code && typeof code === 'string') {
      const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      const otherExists = coupons.some((c, idx) => idx !== index && c.code.toUpperCase() === cleanCode);
      if (otherExists) {
        return res.status(400).json({ error: `Outro cupom já utiliza o código ${cleanCode}.` });
      }
      current.code = cleanCode;
    }

    if (discountPercent !== undefined) {
      const parsedPercent = parseFloat(discountPercent);
      if (!isNaN(parsedPercent) && parsedPercent > 0 && parsedPercent <= 100) {
        current.discountPercent = parsedPercent;
      }
    }

    if (description !== undefined) {
      current.description = String(description).trim();
    }

    if (isActive !== undefined) {
      current.isActive = Boolean(isActive);
    }

    current.updatedAt = new Date().toISOString();
    coupons[index] = current;

    await saveCouponsList(coupons);

    res.json({
      success: true,
      message: 'Cupom atualizado com sucesso!',
      coupon: current,
      coupons
    });
  } catch (err) {
    console.error('Erro ao atualizar cupom:', err);
    res.status(500).json({ error: 'Erro ao atualizar cupom.' });
  }
});

// DELETE /api/coupons/:id - Remover cupom
router.delete('/coupons/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const coupons = await getCouponsList();
    const filtered = coupons.filter(c => c.id !== id);

    if (filtered.length === coupons.length) {
      return res.status(404).json({ error: 'Cupom não encontrado.' });
    }

    await saveCouponsList(filtered);

    res.json({
      success: true,
      message: 'Cupom excluído com sucesso!',
      coupons: filtered
    });
  } catch (err) {
    console.error('Erro ao excluir cupom:', err);
    res.status(500).json({ error: 'Erro ao excluir cupom.' });
  }
});

// POST /api/coupons/:id/sales - Informar venda realizada com este cupom
router.post('/coupons/:id/sales', async (req, res) => {
  try {
    const { id } = req.params;
    const { saleCode, customerName, amount, discountValue, notes, reportedBy } = req.body;

    const coupons = await getCouponsList();
    const index = coupons.findIndex(c => c.id === id || c.code.toUpperCase() === id.toUpperCase());

    if (index === -1) {
      return res.status(404).json({ error: 'Cupom não encontrado para vincular venda.' });
    }

    const current = coupons[index];
    current.salesCount = (current.salesCount || 0) + 1;

    if (!Array.isArray(current.sales)) {
      current.sales = [];
    }

    const newSaleRecord = {
      id: `csale_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      date: new Date().toISOString(),
      saleCode: (saleCode || '').trim() || `VND-${String(current.salesCount).padStart(3, '0')}`,
      customerName: (customerName || '').trim() || 'Cliente Balcão / WhatsApp',
      amount: parseFloat(amount) || 0,
      discountValue: parseFloat(discountValue) || 0,
      notes: (notes || '').trim(),
      reportedBy: (reportedBy || 'Administrador').trim()
    };

    current.sales.unshift(newSaleRecord);
    current.updatedAt = new Date().toISOString();
    coupons[index] = current;

    await saveCouponsList(coupons);

    res.json({
      success: true,
      message: `Venda ${newSaleRecord.saleCode} registrada com sucesso no cupom ${current.code}! Total de vendas: ${current.salesCount}`,
      sale: newSaleRecord,
      coupon: current,
      coupons
    });
  } catch (err) {
    console.error('Erro ao registrar venda no cupom:', err);
    res.status(500).json({ error: 'Erro ao registrar venda realizada no cupom.' });
  }
});

export default router;

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../../prisma.js';
import { authenticateToken, requireRole, logAudit } from '../../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fallbackFilePath = path.join(__dirname, '../../../data/settings.json');

const router = express.Router();

const defaultBrandRates = {
  VISA_MASTER: {
    name: 'Visa & Mastercard',
    debitFeePct: 1.25,
    installmentRates: {
      '1': 3.15, '2': 4.15, '3': 4.95, '4': 5.75, '5': 6.45, '6': 7.15,
      '7': 8.05, '8': 8.85, '9': 9.65, '10': 10.45, '11': 11.15, '12': 11.85,
      '13': 12.65, '14': 13.35, '15': 14.05, '16': 14.75, '17': 15.45, '18': 16.15
    }
  },
  ELO: {
    name: 'Elo',
    debitFeePct: 1.75,
    installmentRates: {
      '1': 3.49, '2': 4.59, '3': 5.49, '4': 6.29, '5': 7.09, '6': 7.89,
      '7': 8.79, '8': 9.59, '9': 10.39, '10': 11.19, '11': 11.89, '12': 12.59,
      '13': 13.39, '14': 14.09, '15': 14.79, '16': 15.49, '17': 16.19, '18': 16.89
    }
  },
  HIPERCARD: {
    name: 'Hipercard',
    debitFeePct: 1.65,
    installmentRates: {
      '1': 3.39, '2': 4.45, '3': 5.35, '4': 6.15, '5': 6.95, '6': 7.65,
      '7': 8.55, '8': 9.35, '9': 10.15, '10': 10.95, '11': 11.65, '12': 12.35,
      '13': 13.15, '14': 13.85, '15': 14.55, '16': 15.25, '17': 15.95, '18': 16.65
    }
  },
  AMEX: {
    name: 'American Express',
    debitFeePct: 1.90,
    installmentRates: {
      '1': 3.65, '2': 4.79, '3': 5.69, '4': 6.59, '5': 7.39, '6': 8.19,
      '7': 9.09, '8': 9.89, '9': 10.69, '10': 11.49, '11': 12.19, '12': 12.89,
      '13': 13.69, '14': 14.39, '15': 15.09, '16': 15.79, '17': 16.49, '18': 17.19
    }
  },
  OUTRAS: {
    name: 'Outras Bandeiras',
    debitFeePct: 1.99,
    installmentRates: {
      '1': 3.79, '2': 4.95, '3': 5.85, '4': 6.75, '5': 7.55, '6': 8.35,
      '7': 9.25, '8': 10.05, '9': 10.85, '10': 11.65, '11': 12.35, '12': 13.05,
      '13': 13.85, '14': 14.55, '15': 15.25, '16': 15.95, '17': 16.65, '18': 17.35
    }
  }
};

const defaultPaymentFees = {
  operatorName: 'Stone / PagBank',
  pixFeePct: 0.0,
  debitFeePct: 1.25,
  credit1xFeePct: 3.15,
  credit2to6xFeePct: 5.45,
  credit7to12xFeePct: 9.85,
  maxInstallments: 18,
  installmentRates: defaultBrandRates.VISA_MASTER.installmentRates,
  brands: defaultBrandRates,
  payoutDays: 'D+1',
  defaultFeePayer: 'LOJA', // 'LOJA' (empresa assume) ou 'CLIENTE' (taxa repassada)
  passFeeToCustomer: false,
  updatedAt: new Date().toISOString()
};

// Ler fallback local do arquivo
function readLocalFallback() {
  try {
    if (fs.existsSync(fallbackFilePath)) {
      const raw = fs.readFileSync(fallbackFilePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Erro ao ler settings.json local:', e.message);
  }
  return {};
}

// Gravar fallback local
function writeLocalFallback(data) {
  try {
    const dir = path.dirname(fallbackFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const current = readLocalFallback();
    const updated = { ...current, ...data };
    fs.writeFileSync(fallbackFilePath, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erro ao gravar settings.json local:', e.message);
  }
}

// GET /api/settings/payment-fees
router.get('/settings/payment-fees', async (req, res) => {
  try {
    let fees = null;

    // Tentar ler do banco de dados
    try {
      if (prisma.setting) {
        const row = await prisma.setting.findUnique({
          where: { key: 'payment_fees' }
        });
        if (row && row.value) {
          fees = JSON.parse(row.value);
        }
      }
    } catch (dbErr) {
      console.warn('Aviso: leitura do banco de dados para payment_fees falhou, usando fallback local.', dbErr.message);
    }

    if (!fees) {
      const local = readLocalFallback();
      fees = local.payment_fees || defaultPaymentFees;
    }

    // Mesclar marcas
    const mergedBrands = {};
    for (const [brandKey, defaultData] of Object.entries(defaultBrandRates)) {
      const existingBrand = fees.brands?.[brandKey] || {};
      mergedBrands[brandKey] = {
        name: existingBrand.name || defaultData.name,
        debitFeePct: existingBrand.debitFeePct !== undefined ? parseFloat(existingBrand.debitFeePct) : defaultData.debitFeePct,
        installmentRates: { ...defaultData.installmentRates, ...(existingBrand.installmentRates || {}) }
      };
    }

    const mergedRates = mergedBrands.VISA_MASTER?.installmentRates || defaultBrandRates.VISA_MASTER.installmentRates;

    res.json({
      success: true,
      fees: {
        ...defaultPaymentFees,
        ...fees,
        brands: mergedBrands,
        installmentRates: mergedRates
      }
    });
  } catch (err) {
    console.error('Erro ao buscar taxas de pagamento:', err);
    res.json({
      success: true,
      fees: defaultPaymentFees
    });
  }
});

// PUT /api/settings/payment-fees (Apenas PROPRIETARIA e GERENTE)
router.put('/settings/payment-fees', authenticateToken, requireRole(['PROPRIETARIA', 'GERENTE']), async (req, res) => {
  try {
    const {
      operatorName,
      pixFeePct,
      debitFeePct,
      maxInstallments,
      installmentRates,
      brands,
      payoutDays,
      defaultFeePayer,
      passFeeToCustomer
    } = req.body;

    // Normalizar marcas (brands)
    const normalizedBrands = {};
    const inputBrands = brands || {};

    for (const [brandKey, defaultData] of Object.entries(defaultBrandRates)) {
      const incoming = inputBrands[brandKey] || {};
      const brandRates = {};
      const incomingRates = incoming.installmentRates || (brandKey === 'VISA_MASTER' ? installmentRates : {}) || {};

      for (let i = 1; i <= 18; i++) {
        const k = String(i);
        if (incomingRates[k] !== undefined) {
          brandRates[k] = Math.max(0, parseFloat(incomingRates[k]) || 0);
        } else if (defaultData.installmentRates[k] !== undefined) {
          brandRates[k] = defaultData.installmentRates[k];
        } else {
          brandRates[k] = 0;
        }
      }

      normalizedBrands[brandKey] = {
        name: incoming.name || defaultData.name,
        debitFeePct: incoming.debitFeePct !== undefined ? Math.max(0, parseFloat(incoming.debitFeePct) || 0) : defaultData.debitFeePct,
        installmentRates: brandRates
      };
    }

    const primaryRates = normalizedBrands.VISA_MASTER?.installmentRates || defaultBrandRates.VISA_MASTER.installmentRates;

    const newFees = {
      operatorName: String(operatorName || 'Personalizada').trim(),
      pixFeePct: parseFloat(pixFeePct ?? 0),
      debitFeePct: normalizedBrands.VISA_MASTER?.debitFeePct ?? parseFloat(debitFeePct ?? 1.25),
      credit1xFeePct: primaryRates['1'] || 3.15,
      credit2to6xFeePct: primaryRates['6'] || 5.45,
      credit7to12xFeePct: primaryRates['12'] || 9.85,
      maxInstallments: Math.min(18, Math.max(1, parseInt(maxInstallments || 18))),
      installmentRates: primaryRates,
      brands: normalizedBrands,
      payoutDays: String(payoutDays || 'D+1'),
      defaultFeePayer: defaultFeePayer === 'CLIENTE' ? 'CLIENTE' : 'LOJA',
      passFeeToCustomer: Boolean(passFeeToCustomer || defaultFeePayer === 'CLIENTE'),
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.name
    };

    // Salvar no fallback de arquivo local primeiro para garantir persistência imediata
    writeLocalFallback({ payment_fees: newFees });

    // Salvar no banco PostgreSQL se disponível
    try {
      if (prisma.setting) {
        await prisma.setting.upsert({
          where: { key: 'payment_fees' },
          update: { value: JSON.stringify(newFees) },
          create: { key: 'payment_fees', value: JSON.stringify(newFees) }
        });
      }
    } catch (dbErr) {
      console.warn('Aviso: Upsert no banco falhou, salvo no fallback local:', dbErr.message);
    }

    // Gravar log de auditoria
    try {
      await logAudit(
        req.user.id,
        'ATUALIZAR_TAXAS_MAQUININHA',
        'CONFIGURACOES',
        'payment_fees',
        null,
        JSON.stringify(newFees),
        `Taxas da maquininha atualizadas por ${req.user.name}`,
        req.ip
      );
    } catch (auditErr) {
      console.warn('Aviso ao registrar auditoria:', auditErr.message);
    }

    res.json({
      success: true,
      message: 'Taxas da maquininha e operadora salvas com sucesso!',
      fees: newFees
    });
  } catch (err) {
    console.error('Erro ao atualizar taxas da maquininha:', err);
    res.status(500).json({ error: 'Erro ao salvar configurações de taxas.' });
  }
});

export default router;

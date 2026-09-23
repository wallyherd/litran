import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PRODUCTS, CATEGORIES } from '../../src/data/catalogData.js';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Iniciando migração e seed do banco de dados no Supabase / PostgreSQL (Litran - HDSoluções)...');

  // 1. Limpar banco para semente limpa
  try {
    await prisma.auditLog.deleteMany();
    await prisma.installmentPayment.deleteMany();
    await prisma.creditInstallment.deleteMany();
    await prisma.creditAccount.deleteMany();
    await prisma.storeCredit.deleteMany();
    await prisma.exchangeItem.deleteMany();
    await prisma.exchange.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.saleItem.deleteMany();
    await prisma.sale.deleteMany();
    await prisma.cashMovement.deleteMany();
    await prisma.cashSession.deleteMany();
    await prisma.cashRegister.deleteMany();
    await prisma.inventoryMovement.deleteMany();
    await prisma.inventoryBalance.deleteMany();
    await prisma.inventoryLocation.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.user.deleteMany();
  } catch (err) {
    console.log('Aviso ao limpar tabelas existentes:', err.message);
  }

  // 2. Criar Usuário Oficial da Proprietária
  const ownerPasswordHash = await bcrypt.hash('litranGa', 10);

  const proprietaria = await prisma.user.create({
    data: {
      name: 'Gabriela Litran',
      email: 'gabilitranmodas@gmail.com',
      password: ownerPasswordHash,
      role: 'PROPRIETARIA',
      discountLimitPct: 100.0,
      isBlocked: false
    }
  });

  console.log('✅ Usuário oficial criado: Gabriela Litran (gabilitranmodas@gmail.com)');

  // 3. Localização de Estoque & Caixa
  const location = await prisma.inventoryLocation.create({
    data: {
      id: 'main',
      name: 'Estoque Central - Balcão Litran',
      isMain: true,
    }
  });

  await prisma.cashRegister.create({
    data: {
      id: 'cx01',
      name: 'Caixa Balcão 01',
      code: 'CX01'
    }
  });

  // 4. Categorias
  const createdCategories = {};
  for (const cat of CATEGORIES) {
    if (cat.id === 'inicio' || cat.id === 'mais-categorias') continue;
    const categoryRecord = await prisma.category.create({
      data: {
        id: `cat-${cat.id}`,
        name: cat.name,
        icon: cat.icon
      }
    });
    createdCategories[cat.id] = categoryRecord.id;
  }

  // Categoria padrão para itens diversos
  const defaultCategory = await prisma.category.create({
    data: {
      id: 'cat-[#942620]',
      name: 'OUTROS',
      icon: 'Grid'
    }
  });

  // 5. Clientes Iniciais
  const clienteExemplo = await prisma.customer.create({
    data: {
      name: 'Maria Silva Exemplo',
      cpf: '123.456.789-00',
      phone: '(66) 99988-7766',
      email: 'maria.silva@gmail.com',
      address: 'Rua das Palmeiras, Nº 120, Várzea Grande - MT',
      creditLimit: 1000.00,
    }
  });

  await prisma.creditAccount.create({
    data: {
      customerId: clienteExemplo.id,
      creditLimit: 1000.00,
      usedCredit: 0.0,
      approvedByUserId: proprietaria.id
    }
  });

  // 6. Cadastrar os 44 Produtos Reais da Litran com Variações e Estoque Inicial
  console.log(`📦 Cadastrando ${PRODUCTS.length} produtos reais no banco de dados...`);

  for (const p of PRODUCTS) {
    const targetCatId = createdCategories[p.category] || defaultCategory.id;
    const prodId = `prod-${p.id}`;

    const product = await prisma.product.create({
      data: {
        id: prodId,
        name: p.name,
        categoryId: targetCatId,
        sku: p.refCode ? p.refCode.replace('Ref: ', '').trim() : `SKU-${p.id}`,
        barcode: `789${String(p.id).padStart(10, '0')}`,
        price: p.price,
        promoPrice: p.originalPrice ? p.price : null,
        costPrice: Math.round(p.price * 0.45 * 100) / 100,
        description: p.description,
        videoUrl: p.video || null,
        images: {
          create: (p.images || []).map((url, idx) => ({
            url: url,
            isPrimary: idx === 0
          }))
        }
      }
    });

    const variations = p.variations && p.variations.length > 0
      ? p.variations
      : [{ id: 'v1', name: 'TAMANHO ÚNICO', price: p.price, sku: `${p.id}-1` }];

    for (let vIdx = 0; vIdx < variations.length; vIdx++) {
      const v = variations[vIdx];
      const variantSku = v.sku || `${product.sku}-${v.name.replace(/\s+/g, '-')}`;
      const variantBarcode = `789${String(p.id).padStart(6, '0')}${String(vIdx + 1).padStart(3, '0')}`;

      const variant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: variantSku,
          barcode: variantBarcode,
          size: v.name,
          color: v.name.includes(' ') ? v.name.split(' ')[0] : 'Padrão',
          price: v.price || p.price,
          costPrice: Math.round((v.price || p.price) * 0.45 * 100) / 100
        }
      });

      // Saldo inicial de estoque no Supabase (15 unidades por variação)
      const initQty = 15;
      await prisma.inventoryBalance.create({
        data: {
          locationId: location.id,
          productId: product.id,
          variantId: variant.id,
          physicalQty: initQty,
          reservedQty: 0,
          availableQty: initQty
        }
      });

      await prisma.inventoryMovement.create({
        data: {
          productId: product.id,
          variantId: variant.id,
          locationId: location.id,
          type: 'ENTRADA_MERCADORIA',
          qty: initQty,
          previousBalance: 0,
          newBalance: initQty,
          reason: 'Carga Inicial de Estoque no Supabase',
          userId: proprietaria.id
        }
      });
    }
  }

  // Audit Log
  await prisma.auditLog.create({
    data: {
      userId: proprietaria.id,
      action: 'SYSTEM_SUPABASE_SEED',
      entity: 'SYSTEM',
      reason: 'Sincronização completa de produtos reais e estoque inicial no Supabase'
    }
  });

  console.log('🎉 Migração e Carga (Seed) concluídas com sucesso no Supabase!');
}

seed()
  .catch((e) => {
    console.error('❌ Erro durante o seed do Supabase:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

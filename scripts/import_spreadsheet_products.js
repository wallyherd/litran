import dotenv from 'dotenv';
dotenv.config();

// Se houver DIRECT_URL no ambiente, garante uso direto ou pooler
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

import prisma from '../server/src/prisma.js';
import XLSX from 'xlsx';

async function importStockSpreadsheet() {
  console.log('📦 Iniciando importação oficial das peças da Planilha_Estoque.xlsx no banco Supabase...');

  const filePath = 'Planilha_Estoque.xlsx';
  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('estoque')) || wb.SheetNames[0];
  const worksheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet);

  if (!rows || rows.length === 0) {
    throw new Error('A planilha está vazia.');
  }

  const defaultMarginMultiplier = 2.2;
  const productsMap = {};

  rows.forEach((row) => {
    const pName = row['Produto'] || row['PRODUTO'] || row['Nome'] || row['NOME'] || row['Item'] || row['Descrição'] || row['Descricao'];
    if (!pName || typeof pName !== 'string' || !pName.trim()) return;

    const cleanName = pName.trim();
    const rawCor = (row['Cor'] || row['COR'] || row['Color'] || '').toString().trim();
    const cor = (rawCor.toLowerCase() === 'não informado' || rawCor.toLowerCase() === 'sem cor') ? '' : rawCor;
    
    const rawTam = (row['Tamanho'] || row['TAMANHO'] || row['Grade'] || row['GRADE'] || row['Tam'] || '').toString().trim();
    const tam = (rawTam.toLowerCase() === 'não informado' || !rawTam) ? 'ÚNICO' : rawTam.toUpperCase();

    const qtd = Math.max(0, parseInt(row['Quantidade'] || row['QUANTIDADE'] || row['Qtd'] || row['QTD'] || row['Estoque'] || 0) || 0);
    
    let custo = 0;
    const rawCusto = row['Custo Unitário (R$)'] || row['Custo Unitário'] || row['Custo'] || row['CUSTO'] || row['Preço Custo'] || row['Preco Custo'];
    if (typeof rawCusto === 'number') {
      custo = rawCusto;
    } else if (typeof rawCusto === 'string') {
      custo = parseFloat(rawCusto.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    }

    let preco = 0;
    const rawPreco = row['Preço de Venda (R$)'] || row['Preço de Venda'] || row['Preco de Venda'] || row['Preço'] || row['PREÇO'] || row['Valor Final'];
    if (typeof rawPreco === 'number' && rawPreco > 0) {
      preco = rawPreco;
    } else if (typeof rawPreco === 'string' && rawPreco.trim()) {
      preco = parseFloat(rawPreco.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    }
    if (preco <= 0 && custo > 0) {
      preco = parseFloat((custo * defaultMarginMultiplier).toFixed(2));
    }

    const brand = (row['Compra'] || row['Fornecedor'] || row['Marca'] || 'Litran').toString().trim();

    if (!productsMap[cleanName]) {
      productsMap[cleanName] = {
        name: cleanName,
        brand: brand || 'Litran',
        categoryName: 'MODA FITNESS',
        costPrice: custo,
        price: preco > 0 ? preco : 49.90,
        variants: [],
        totalQty: 0
      };
    }

    productsMap[cleanName].variants.push({
      color: cor,
      size: tam,
      stockQty: qtd,
      costPrice: custo,
      price: preco > 0 ? preco : productsMap[cleanName].price
    });

    productsMap[cleanName].totalQty += qtd;
  });

  const importList = Object.values(productsMap);
  console.log(`📋 ${importList.length} modelos de produtos e ${rows.length} itens prontos para lançamento.`);

  let location = await prisma.inventoryLocation.findFirst({ where: { isMain: true } });
  if (!location) {
    location = await prisma.inventoryLocation.findFirst();
  }
  if (!location) {
    location = await prisma.inventoryLocation.create({
      data: { name: 'Estoque Central - Balcão Litran', isMain: true }
    });
  }

  const existingCategories = await prisma.category.findMany();
  const catMap = new Map(existingCategories.map(c => [c.name.toUpperCase(), c.id]));
  const ownerUser = await prisma.user.findFirst();
  const currentUserId = ownerUser?.id;

  const existingProductSkus = new Set((await prisma.product.findMany({ select: { sku: true } })).map(p => p.sku));
  const existingVariantSkus = new Set((await prisma.productVariant.findMany({ select: { sku: true } })).map(v => v.sku));

  // Assegurar categorias
  for (const item of importList) {
    const catName = (item.categoryName || 'MODA FITNESS').trim();
    if (!catMap.get(catName.toUpperCase())) {
      const newCat = await prisma.category.create({ data: { name: catName } });
      catMap.set(catName.toUpperCase(), newCat.id);
    }
  }

  const t0 = Date.now();

  const results = await prisma.$transaction(async (tx) => {
    const preparedList = [];

    for (let i = 0; i < importList.length; i++) {
      const item = importList[i];
      const cleanName = item.name.trim();
      const catName = (item.categoryName || 'MODA FITNESS').trim();
      const categoryId = catMap.get(catName.toUpperCase());

      const cleanSlug = cleanName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 6)
        .toUpperCase();

      const timestamp = Date.now().toString().slice(-4);
      const randomCode = Math.floor(100 + Math.random() * 900);
      let prodSku = `LIT-${cleanSlug || 'PROD'}-${timestamp}${randomCode}-${i + 1}`;
      let skuCounter = 1;
      while (existingProductSkus.has(prodSku)) {
        prodSku = `LIT-${cleanSlug || 'PROD'}-${timestamp}${randomCode}-${i + 1}-V${skuCounter}`;
        skuCounter++;
      }
      existingProductSkus.add(prodSku);

      const variantsData = (item.variants || []).map((v, vi) => {
        const vSize = (v.size || 'ÚNICO').toString().trim().toUpperCase();
        const vColor = v.color ? v.color.toString().trim() : null;
        const colorCode = vColor ? `-${vColor.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 4)}` : '';
        const sizePart = vSize.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'U';
        let safeSku = `${prodSku}${colorCode}-${sizePart}-${vi + 1}`;
        let vCounter = 1;
        while (existingVariantSkus.has(safeSku)) {
          safeSku = `${prodSku}${colorCode}-${sizePart}-${vi + 1}-${vCounter}`;
          vCounter++;
        }
        existingVariantSkus.add(safeSku);

        return {
          sku: safeSku,
          size: vSize,
          color: vColor,
          price: v.price ? parseFloat(v.price) : item.price,
          costPrice: v.costPrice ? parseFloat(v.costPrice) : item.costPrice,
          stockQty: Math.max(0, parseInt(v.stockQty || 0))
        };
      });

      preparedList.push({
        cleanName,
        item,
        categoryId,
        prodSku,
        variantsData
      });
    }

    // Criar os produtos e variações em lotes
    const createdProds = [];
    const batchChunkSize = 5;
    for (let i = 0; i < preparedList.length; i += batchChunkSize) {
      const chunk = preparedList.slice(i, i + batchChunkSize);
      const chunkResults = await Promise.all(chunk.map(p => tx.product.create({
        data: {
          name: p.cleanName,
          description: `Produto confeccionado para máxima durabilidade e conforto. Fornecedor: ${p.item.brand}.`,
          categoryId: p.categoryId,
          brand: p.item.brand?.trim() || 'Litran',
          sku: p.prodSku,
          price: parseFloat(p.item.price || 49.90),
          costPrice: parseFloat(p.item.costPrice || 0),
          minStock: 2,
          isActive: true,
          variants: p.variantsData.length > 0 ? {
            create: p.variantsData.map(v => ({
              sku: v.sku,
              size: v.size,
              color: v.color,
              price: v.price,
              costPrice: v.costPrice
            }))
          } : undefined
        },
        include: { variants: true }
      })));
      createdProds.push(...chunkResults);
    }

    const allBalances = [];
    const allMovements = [];

    for (let i = 0; i < createdProds.length; i++) {
      const prod = createdProds[i];
      const prep = preparedList[i];

      if (prod.variants && prod.variants.length > 0) {
        prod.variants.forEach((dbVariant) => {
          const originalV = prep.variantsData.find(v => v.sku === dbVariant.sku);
          const vQty = originalV ? originalV.stockQty : 0;

          allBalances.push({
            locationId: location.id,
            productId: prod.id,
            variantId: dbVariant.id,
            physicalQty: vQty,
            reservedQty: 0,
            availableQty: vQty
          });

          if (vQty > 0 && currentUserId) {
            allMovements.push({
              productId: prod.id,
              variantId: dbVariant.id,
              locationId: location.id,
              type: 'ENTRADA_MERCADORIA',
              qty: vQty,
              previousBalance: 0,
              newBalance: vQty,
              reason: `Carga Inicial da Planilha: ${dbVariant.size} ${dbVariant.color || ''}`.trim(),
              userId: currentUserId
            });
          }
        });
      }
    }

    if (allBalances.length > 0) {
      await tx.inventoryBalance.createMany({ data: allBalances });
    }
    if (allMovements.length > 0) {
      await tx.inventoryMovement.createMany({ data: allMovements });
    }

    return { createdProds, allBalances };
  }, {
    maxWait: 10000,
    timeout: 60000
  });

  console.log(`✅ SUCESSO ABSOLUTO! ${results.createdProds.length} modelos e ${results.allBalances.length} variações gravados em ${Date.now() - t0} ms!`);

  // Log de auditoria
  if (currentUserId) {
    await prisma.auditLog.create({
      data: {
        userId: currentUserId,
        action: 'BATCH_PRODUCTS_IMPORTED',
        entity: 'PRODUCT',
        newValue: JSON.stringify({ count: results.createdProds.length, variants: results.allBalances.length }),
        reason: `Carga oficial da planilha Planilha_Estoque.xlsx pelo sistema`,
        ipAddress: '127.0.0.1'
      }
    });
  }

  return results;
}

importStockSpreadsheet()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Erro na importação:', err);
    process.exit(1);
  });

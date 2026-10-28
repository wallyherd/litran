import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../../prisma.js';
import { authenticateToken, requireRole, logAudit } from '../../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const colorImagesFilePath = path.join(__dirname, '../../../../data/product_colors.json');

function readColorImagesFallback() {
  try {
    if (fs.existsSync(colorImagesFilePath)) {
      const raw = fs.readFileSync(colorImagesFilePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Erro ao ler product_colors.json:', e.message);
  }
  return {};
}

function writeColorImagesFallback(data) {
  try {
    const dir = path.dirname(colorImagesFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(colorImagesFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erro ao gravar product_colors.json:', e.message);
  }
}

async function getColorImagesMap() {
  const map = readColorImagesFallback();
  try {
    if (prisma && prisma.setting) {
      const rows = await prisma.setting.findMany({
        where: { key: { startsWith: 'color_imgs_' } }
      });
      rows.forEach(r => {
        const prodId = r.key.replace('color_imgs_', '');
        try {
          map[prodId] = { ...(map[prodId] || {}), ...JSON.parse(r.value) };
        } catch (_) {}
      });
    }
  } catch (dbErr) {
    console.warn('Aviso ao ler color_imgs do banco:', dbErr.message);
  }
  return map;
}

async function saveProductColorImages(productId, colorImages) {
  if (!productId || typeof colorImages !== 'object') return;
  const currentMap = readColorImagesFallback();
  const cleaned = {};
  for (const [k, v] of Object.entries(colorImages || {})) {
    if (k && v && typeof v === 'string' && v.trim()) {
      cleaned[k.trim()] = v.trim();
    }
  }
  currentMap[productId] = cleaned;
  writeColorImagesFallback(currentMap);

  try {
    if (prisma && prisma.setting) {
      await prisma.setting.upsert({
        where: { key: `color_imgs_${productId}` },
        update: { value: JSON.stringify(cleaned) },
        create: { key: `color_imgs_${productId}`, value: JSON.stringify(cleaned) }
      });
    }
  } catch (dbErr) {
    console.warn('Aviso ao salvar color_imgs no banco:', dbErr.message);
  }
}

const router = express.Router();

// GET /api/products (Público & PDV - Lista produtos com saldo disponível do Estoque Central)
router.get('/products', async (req, res) => {
  const { search, category, activeOnly } = req.query;

  const where = {};
  if (activeOnly !== 'false') {
    where.isActive = true;
  }
  if (category && category !== 'todos' && category !== 'inicio') {
    where.category = { id: category };
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search, mode: 'insensitive' } }
    ];
  }

  const products = await prisma.product.findMany({
    where,
    include: {
      category: true,
      images: { orderBy: { isPrimary: 'desc' } },
      variants: {
        include: {
          balances: true
        },
        orderBy: [{ color: 'asc' }, { size: 'asc' }]
      },
      balances: {
        include: { location: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  const colorImagesMap = await getColorImagesMap();

  // Mapeia produto com a soma dos saldos do Estoque Central e saldos de variantes
  const formatted = products.map(p => {
    const rawDirectPhysical = p.balances.reduce((acc, b) => acc + b.physicalQty, 0);
    const rawDirectReserved = p.balances.reduce((acc, b) => acc + b.reservedQty, 0);
    const rawDirectAvailable = Math.max(0, rawDirectPhysical - rawDirectReserved);
    const prodColorImages = colorImagesMap[p.id] || {};

    const formattedVariants = (p.variants || []).map(v => {
      const vPhysical = (v.balances || []).reduce((acc, b) => acc + b.physicalQty, 0);
      const vReserved = (v.balances || []).reduce((acc, b) => acc + b.reservedQty, 0);
      const colorImg = v.imageUrl || prodColorImages[v.color] || null;
      return {
        ...v,
        imageUrl: colorImg,
        stockPhysical: vPhysical,
        stockReserved: vReserved,
        stockAvailable: Math.max(0, vPhysical - vReserved),
        stockQty: Math.max(0, vPhysical - vReserved)
      };
    });

    const variantsPhysical = formattedVariants.reduce((acc, v) => acc + v.stockPhysical, 0);
    const variantsReserved = formattedVariants.reduce((acc, v) => acc + v.stockReserved, 0);
    const variantsAvailable = formattedVariants.reduce((acc, v) => acc + v.stockAvailable, 0);

    const totalPhysical = formattedVariants.length > 0 ? variantsPhysical : rawDirectPhysical;
    const totalReserved = formattedVariants.length > 0 ? variantsReserved : rawDirectReserved;
    const totalAvailable = formattedVariants.length > 0 ? variantsAvailable : rawDirectAvailable;

    return {
      ...p,
      colorImages: prodColorImages,
      variants: formattedVariants,
      stockAvailable: totalAvailable,
      stockPhysical: totalPhysical,
      stockReserved: totalReserved,
      stockQty: totalAvailable
    };
  });

  res.json(formatted);
});

// GET /api/categories
router.get('/categories', async (req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  res.json(categories);
});

// POST /api/products (Criação de Produto + Variações + Estoque Inicial + Imagem)
router.post('/products', authenticateToken, requireRole(['PROPRIETARIA', 'GERENTE']), async (req, res) => {
  const { name, description, categoryId, brand, sku, barcode, price, promoPrice, costPrice, minStock, variants, image, colorImages } = req.body;

  if (!name || !sku || !price) {
    return res.status(400).json({ error: 'Nome, SKU e Preço são obrigatórios.' });
  }

  // Mapeia fotos por cor recebidas explicitamente ou através das variações
  const mergedColorImages = { ...(colorImages || {}) };
  if (variants && Array.isArray(variants)) {
    variants.forEach(v => {
      if (v && v.color && v.imageUrl && typeof v.imageUrl === 'string' && v.imageUrl.trim()) {
        mergedColorImages[v.color.trim()] = v.imageUrl.trim();
      }
    });
  }

  try {
    let location = await prisma.inventoryLocation.findFirst({ where: { isMain: true } });
    if (!location) {
      location = await prisma.inventoryLocation.findFirst();
    }
    if (!location) {
      location = await prisma.inventoryLocation.create({
        data: { name: 'Estoque Central - Balcão Litran', isMain: true }
      });
    }

    let finalCategoryId = categoryId;
    if (finalCategoryId) {
      const cat = await prisma.category.findUnique({ where: { id: finalCategoryId } });
      if (!cat) finalCategoryId = null;
    }
    if (!finalCategoryId) {
      let firstCat = await prisma.category.findFirst();
      if (!firstCat) {
        firstCat = await prisma.category.create({
          data: { name: 'Moda Feminina', slug: 'moda-feminina' }
        });
      }
      finalCategoryId = firstCat.id;
    }

    const newProduct = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.create({
        data: {
          name: name.trim(),
          description: description ? description.trim() : null,
          categoryId: finalCategoryId,
          brand: brand ? brand.trim() : 'Litran',
          sku: sku.trim(),
          barcode: barcode ? barcode.trim() : null,
          price: parseFloat(price),
          promoPrice: promoPrice ? parseFloat(promoPrice) : null,
          costPrice: costPrice ? parseFloat(costPrice) : 0.0,
          minStock: minStock ? parseInt(minStock) : 2
        }
      });

      if (image && typeof image === 'string' && image.trim().length > 0) {
        await tx.productImage.create({
          data: {
            productId: prod.id,
            url: image.trim(),
            isPrimary: true
          }
        });
      }

      // Adiciona também fotos cadastradas para cada variação de cor na galeria de imagens
      for (const [colName, colUrl] of Object.entries(mergedColorImages)) {
        if (colUrl && typeof colUrl === 'string' && colUrl.trim() && colUrl.trim() !== (image || '').trim()) {
          await tx.productImage.create({
            data: {
              productId: prod.id,
              url: colUrl.trim(),
              isPrimary: false
            }
          });
        }
      }

      if (variants && Array.isArray(variants) && variants.length > 0) {
        for (let i = 0; i < variants.length; i++) {
          const v = variants[i];
          if (!v || !v.size) continue;
          const cleanSize = (v.size || 'M').trim();
          const cleanColor = (v.color || '').trim();
          const colorSuffix = cleanColor ? `-${cleanColor.replace(/\s+/g, '').toUpperCase().substring(0, 4)}` : '';
          const sizePart = cleanSize.replace(/\s+/g, '').toUpperCase();
          const autoSku = `${prod.sku}${colorSuffix}-${sizePart}-${i + 1}`;
          let vSku = v.sku?.trim() || autoSku;

          let safeSku = vSku;
          let collision = await tx.productVariant.findUnique({ where: { sku: safeSku } });
          let counter = 1;
          while (collision) {
            safeSku = `${prod.sku}${colorSuffix}-${sizePart}-${i + 1}-${counter}`;
            collision = await tx.productVariant.findUnique({ where: { sku: safeSku } });
            counter++;
          }

          const variant = await tx.productVariant.create({
            data: {
              productId: prod.id,
              sku: safeSku,
              size: cleanSize,
              color: cleanColor || null,
              price: v.price ? parseFloat(v.price) : prod.price,
              costPrice: v.costPrice ? parseFloat(v.costPrice) : prod.costPrice
            }
          });

          const initQty = Math.max(0, parseInt(v.stockQty || 0));
          if (location) {
            await tx.inventoryBalance.create({
              data: {
                locationId: location.id,
                productId: prod.id,
                variantId: variant.id,
                physicalQty: initQty,
                reservedQty: 0,
                availableQty: initQty
              }
            });

            if (initQty > 0) {
              await tx.inventoryMovement.create({
                data: {
                  productId: prod.id,
                  variantId: variant.id,
                  locationId: location.id,
                  type: 'ENTRADA_MERCADORIA',
                  qty: initQty,
                  previousBalance: 0,
                  newBalance: initQty,
                  reason: `Criação de Variação ${variant.size}${variant.color ? ' ' + variant.color : ''}`,
                  userId: req.user.id
                }
              });
            }
          }
        }
      } else {
        const initQty = Math.max(0, parseInt(req.body.stockQty || 0));
        if (location) {
          await tx.inventoryBalance.create({
            data: {
              locationId: location.id,
              productId: prod.id,
              physicalQty: initQty,
              reservedQty: 0,
              availableQty: initQty
            }
          });

          if (initQty > 0) {
            await tx.inventoryMovement.create({
              data: {
                productId: prod.id,
                locationId: location.id,
                type: 'ENTRADA_MERCADORIA',
                qty: initQty,
                previousBalance: 0,
                newBalance: initQty,
                reason: 'Criação de Produto (Estoque Inicial)',
                userId: req.user.id
              }
            });
          }
        }
      }

      return tx.product.findUnique({
        where: { id: prod.id },
        include: {
          category: true,
          images: { orderBy: { isPrimary: 'desc' } },
          variants: {
            include: { balances: true },
            orderBy: [{ color: 'asc' }, { size: 'asc' }]
          },
          balances: true
        }
      });
    }, {
      maxWait: 15000,
      timeout: 60000
    });

    // Salva fotos de cada variação de cor
    await saveProductColorImages(newProduct.id, mergedColorImages);

    await logAudit({
      userId: req.user.id,
      action: 'PRODUCT_CREATED',
      entity: 'PRODUCT',
      entityId: newProduct.id,
      newValue: { name, sku, price },
      ipAddress: req.ip
    });

    // Formatar produto para retorno consistente
    const rawDirectPhysical = newProduct.balances.reduce((acc, b) => acc + b.physicalQty, 0);
    const rawDirectReserved = newProduct.balances.reduce((acc, b) => acc + b.reservedQty, 0);
    const rawDirectAvailable = Math.max(0, rawDirectPhysical - rawDirectReserved);

    const formattedVariants = (newProduct.variants || []).map(v => {
      const vPhysical = (v.balances || []).reduce((acc, b) => acc + b.physicalQty, 0);
      const vReserved = (v.balances || []).reduce((acc, b) => acc + b.reservedQty, 0);
      const colorImg = v.imageUrl || mergedColorImages[v.color] || null;
      return {
        ...v,
        imageUrl: colorImg,
        stockPhysical: vPhysical,
        stockReserved: vReserved,
        stockAvailable: Math.max(0, vPhysical - vReserved),
        stockQty: Math.max(0, vPhysical - vReserved)
      };
    });

    const variantsPhysical = formattedVariants.reduce((acc, v) => acc + v.stockPhysical, 0);
    const variantsReserved = formattedVariants.reduce((acc, v) => acc + v.stockReserved, 0);
    const variantsAvailable = formattedVariants.reduce((acc, v) => acc + v.stockAvailable, 0);

    const totalPhysical = formattedVariants.length > 0 ? variantsPhysical : rawDirectPhysical;
    const totalReserved = formattedVariants.length > 0 ? variantsReserved : rawDirectReserved;
    const totalAvailable = formattedVariants.length > 0 ? variantsAvailable : rawDirectAvailable;

    const formatted = {
      ...newProduct,
      colorImages: mergedColorImages,
      variants: formattedVariants,
      stockAvailable: totalAvailable,
      stockPhysical: totalPhysical,
      stockReserved: totalReserved,
      stockQty: totalAvailable
    };

    res.status(201).json(formatted);
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: err.message || 'Erro ao criar produto.' });
  }
});

// PUT /api/products/:id (Editar Produto, Preços, Imagem & Grade de Variações)
router.put('/products/:id', authenticateToken, requireRole(['PROPRIETARIA', 'GERENTE']), async (req, res) => {
  const { id } = req.params;
  const { name, description, categoryId, brand, sku, barcode, price, promoPrice, costPrice, minStock, isActive, image, variants, colorImages } = req.body;

  // Mapeia fotos por cor recebidas explicitamente ou através das variações
  let mergedColorImages = colorImages !== undefined ? { ...(colorImages || {}) } : undefined;
  if (variants && Array.isArray(variants)) {
    variants.forEach(v => {
      if (v && v.color && v.imageUrl && typeof v.imageUrl === 'string' && v.imageUrl.trim()) {
        if (!mergedColorImages) mergedColorImages = {};
        mergedColorImages[v.color.trim()] = v.imageUrl.trim();
      }
    });
  }

  try {
    let location = await prisma.inventoryLocation.findFirst({ where: { isMain: true } });
    if (!location) {
      location = await prisma.inventoryLocation.findFirst();
    }
    if (!location) {
      location = await prisma.inventoryLocation.create({
        data: { name: 'Estoque Central - Balcão Litran', isMain: true }
      });
    }

    let finalCategoryId = undefined;
    if (categoryId) {
      const cat = await prisma.category.findUnique({ where: { id: categoryId } });
      if (cat) finalCategoryId = cat.id;
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Atualiza dados principais do produto
      const prod = await tx.product.update({
        where: { id },
        data: {
          name: name !== undefined ? name.trim() : undefined,
          description: description !== undefined ? (description?.trim() || null) : undefined,
          categoryId: finalCategoryId,
          brand: brand !== undefined ? brand.trim() : undefined,
          sku: sku !== undefined ? sku.trim() : undefined,
          barcode: barcode !== undefined ? (barcode?.trim() || null) : undefined,
          price: price !== undefined && !isNaN(parseFloat(price)) ? parseFloat(price) : undefined,
          promoPrice: promoPrice !== undefined ? (promoPrice && !isNaN(parseFloat(promoPrice)) ? parseFloat(promoPrice) : null) : undefined,
          costPrice: costPrice !== undefined && !isNaN(parseFloat(costPrice)) ? parseFloat(costPrice) : undefined,
          minStock: minStock !== undefined && !isNaN(parseInt(minStock)) ? parseInt(minStock) : undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined
        }
      });

      // 2. Atualizar imagem se fornecida
      if (image && typeof image === 'string' && image.trim().length > 0) {
        const existingPrimary = await tx.productImage.findFirst({
          where: { productId: id, isPrimary: true }
        });

        if (existingPrimary) {
          if (existingPrimary.url !== image.trim()) {
            await tx.productImage.update({
              where: { id: existingPrimary.id },
              data: { url: image.trim() }
            });
          }
        } else {
          await tx.productImage.create({
            data: {
              productId: id,
              url: image.trim(),
              isPrimary: true
            }
          });
        }
      }

      // Adiciona fotos das variações de cor se não existirem ainda
      if (mergedColorImages) {
        for (const [colName, colUrl] of Object.entries(mergedColorImages)) {
          if (colUrl && typeof colUrl === 'string' && colUrl.trim() && colUrl.trim() !== (image || '').trim()) {
            const exists = await tx.productImage.findFirst({
              where: { productId: id, url: colUrl.trim() }
            });
            if (!exists) {
              await tx.productImage.create({
                data: {
                  productId: id,
                  url: colUrl.trim(),
                  isPrimary: false
                }
              });
            }
          }
        }
      }

      // 3. Sincronizar Grade de Variações
      if (variants && Array.isArray(variants)) {
        const keptVariantIds = [];

        for (let i = 0; i < variants.length; i++) {
          const v = variants[i];
          if (!v || !v.size) continue;
          
          const cleanSize = (v.size || 'M').trim();
          const cleanColor = (v.color || '').trim();
          const colorPart = cleanColor ? `-${cleanColor.replace(/\s+/g, '').toUpperCase().substring(0, 4)}` : '';
          const sizePart = cleanSize.replace(/\s+/g, '').toUpperCase();
          const generatedSku = `${prod.sku}${colorPart}-${sizePart}-${i + 1}`;
          let vSku = v.sku?.trim() || generatedSku;

          const isValidUuid = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());

          let variantRecord = null;
          if (v.id && isValidUuid(v.id)) {
            variantRecord = await tx.productVariant.findUnique({ where: { id: v.id } });
          }
          if (!variantRecord) {
            // Tenta buscar por sku pertencente a este produto
            const existingWithSku = await tx.productVariant.findUnique({ where: { sku: vSku } });
            if (existingWithSku && existingWithSku.productId === id) {
              variantRecord = existingWithSku;
            }
          }

          if (variantRecord) {
            // Atualiza tamanho, cor e preços da variação existente
            variantRecord = await tx.productVariant.update({
              where: { id: variantRecord.id },
              data: {
                size: cleanSize,
                color: cleanColor || null,
                price: v.price !== undefined && !isNaN(parseFloat(v.price)) ? parseFloat(v.price) : prod.price,
                costPrice: v.costPrice !== undefined && !isNaN(parseFloat(v.costPrice)) ? parseFloat(v.costPrice) : prod.costPrice
              }
            });
          } else {
            // Gera SKU garantido único sem colisão
            let safeSku = vSku;
            let collision = await tx.productVariant.findUnique({ where: { sku: safeSku } });
            let counter = 1;
            while (collision) {
              safeSku = `${prod.sku}${colorPart}-${sizePart}-${i + 1}-${counter}`;
              collision = await tx.productVariant.findUnique({ where: { sku: safeSku } });
              counter++;
            }

            variantRecord = await tx.productVariant.create({
              data: {
                productId: id,
                sku: safeSku,
                size: cleanSize,
                color: cleanColor || null,
                price: v.price !== undefined && !isNaN(parseFloat(v.price)) ? parseFloat(v.price) : prod.price,
                costPrice: v.costPrice !== undefined && !isNaN(parseFloat(v.costPrice)) ? parseFloat(v.costPrice) : prod.costPrice
              }
            });
          }

          keptVariantIds.push(variantRecord.id);

          // Atualizar saldo de estoque da variação
          if (v.stockQty !== undefined && location) {
            const targetQty = Math.max(0, parseInt(v.stockQty || 0) || 0);
            const balance = await tx.inventoryBalance.findUnique({
              where: {
                locationId_productId_variantId: {
                  locationId: location.id,
                  productId: id,
                  variantId: variantRecord.id
                }
              }
            });

            if (balance) {
              const diff = targetQty - balance.physicalQty;
              if (diff !== 0) {
                await tx.inventoryBalance.update({
                  where: { id: balance.id },
                  data: {
                    physicalQty: targetQty,
                    availableQty: Math.max(0, targetQty - balance.reservedQty)
                  }
                });

                await tx.inventoryMovement.create({
                  data: {
                    productId: id,
                    variantId: variantRecord.id,
                    locationId: location.id,
                    type: diff > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO',
                    qty: Math.abs(diff),
                    previousBalance: balance.physicalQty,
                    newBalance: targetQty,
                    reason: `Ajuste de grade admin: ${variantRecord.size} ${variantRecord.color || ''}`,
                    userId: req.user.id
                  }
                });
              }
            } else {
              await tx.inventoryBalance.create({
                data: {
                  locationId: location.id,
                  productId: id,
                  variantId: variantRecord.id,
                  physicalQty: targetQty,
                  reservedQty: 0,
                  availableQty: targetQty
                }
              });

              if (targetQty > 0) {
                await tx.inventoryMovement.create({
                  data: {
                    productId: id,
                    variantId: variantRecord.id,
                    locationId: location.id,
                    type: 'ENTRADA_MERCADORIA',
                    qty: targetQty,
                    previousBalance: 0,
                    newBalance: targetQty,
                    reason: `Estoque inicial variação: ${variantRecord.size} ${variantRecord.color || ''}`,
                    userId: req.user.id
                  }
                });
              }
            }
          }
        }

        // Remover da base variações que foram excluídas da grade pelo usuário
        const removedVariants = await tx.productVariant.findMany({
          where: {
            productId: id,
            id: { notIn: keptVariantIds }
          }
        });

        for (const oldVar of removedVariants) {
          const saleCount = await tx.saleItem.count({ where: { variantId: oldVar.id } });
          const exchangeCount = await tx.exchangeItem.count({ where: { variantId: oldVar.id } });

          if (saleCount === 0 && exchangeCount === 0) {
            await tx.inventoryMovement.deleteMany({ where: { variantId: oldVar.id } });
            await tx.inventoryBalance.deleteMany({ where: { variantId: oldVar.id } });
            await tx.productVariant.delete({ where: { id: oldVar.id } });
          } else {
            // Se houver histórico imutável de vendas que impede deleção, zera o saldo
            await tx.inventoryBalance.updateMany({
              where: { variantId: oldVar.id },
              data: { physicalQty: 0, availableQty: 0 }
            });
          }
        }
      } else if (req.body.stockQty !== undefined && location) {
        // Produto sem variações: atualiza saldo global de peça única
        const targetQty = Math.max(0, parseInt(req.body.stockQty || 0) || 0);
        const balance = await tx.inventoryBalance.findFirst({
          where: {
            locationId: location.id,
            productId: id,
            variantId: null
          }
        });

        if (balance) {
          const diff = targetQty - balance.physicalQty;
          if (diff !== 0) {
            await tx.inventoryBalance.update({
              where: { id: balance.id },
              data: {
                physicalQty: targetQty,
                availableQty: Math.max(0, targetQty - balance.reservedQty)
              }
            });

            await tx.inventoryMovement.create({
              data: {
                productId: id,
                locationId: location.id,
                type: diff > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO',
                qty: Math.abs(diff),
                previousBalance: balance.physicalQty,
                newBalance: targetQty,
                reason: 'Ajuste de estoque direto admin',
                userId: req.user.id
              }
            });
          }
        } else {
          await tx.inventoryBalance.create({
            data: {
              locationId: location.id,
              productId: id,
              physicalQty: targetQty,
              reservedQty: 0,
              availableQty: targetQty
            }
          });

          if (targetQty > 0) {
            await tx.inventoryMovement.create({
              data: {
                productId: id,
                locationId: location.id,
                type: 'ENTRADA_MERCADORIA',
                qty: targetQty,
                previousBalance: 0,
                newBalance: targetQty,
                reason: 'Estoque inicial de produto',
                userId: req.user.id
              }
            });
          }
        }
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          category: true,
          images: { orderBy: { isPrimary: 'desc' } },
          variants: {
            include: { balances: true },
            orderBy: [{ color: 'asc' }, { size: 'asc' }]
          },
          balances: true
        }
      });
    }, {
      maxWait: 15000,
      timeout: 60000
    });

    if (mergedColorImages !== undefined) {
      await saveProductColorImages(id, mergedColorImages);
    }
    const colorImagesMap = await getColorImagesMap();
    const finalColorImages = mergedColorImages !== undefined ? mergedColorImages : (colorImagesMap[id] || {});

    await logAudit({
      userId: req.user.id,
      action: 'PRODUCT_UPDATED',
      entity: 'PRODUCT',
      entityId: id,
      newValue: { name, price, promoPrice, isActive },
      ipAddress: req.ip
    });

    // Formatar produto para retorno idêntico a GET /api/products
    const rawDirectPhysical = updated.balances.reduce((acc, b) => acc + b.physicalQty, 0);
    const rawDirectReserved = updated.balances.reduce((acc, b) => acc + b.reservedQty, 0);
    const rawDirectAvailable = Math.max(0, rawDirectPhysical - rawDirectReserved);

    const formattedVariants = (updated.variants || []).map(v => {
      const vPhysical = (v.balances || []).reduce((acc, b) => acc + b.physicalQty, 0);
      const vReserved = (v.balances || []).reduce((acc, b) => acc + b.reservedQty, 0);
      const colorImg = v.imageUrl || finalColorImages[v.color] || null;
      return {
        ...v,
        imageUrl: colorImg,
        stockPhysical: vPhysical,
        stockReserved: vReserved,
        stockAvailable: Math.max(0, vPhysical - vReserved),
        stockQty: Math.max(0, vPhysical - vReserved)
      };
    });

    const variantsPhysical = formattedVariants.reduce((acc, v) => acc + v.stockPhysical, 0);
    const variantsReserved = formattedVariants.reduce((acc, v) => acc + v.stockReserved, 0);
    const variantsAvailable = formattedVariants.reduce((acc, v) => acc + v.stockAvailable, 0);

    const totalPhysical = formattedVariants.length > 0 ? variantsPhysical : rawDirectPhysical;
    const totalReserved = formattedVariants.length > 0 ? variantsReserved : rawDirectReserved;
    const totalAvailable = formattedVariants.length > 0 ? variantsAvailable : rawDirectAvailable;

    const formattedProduct = {
      ...updated,
      colorImages: finalColorImages,
      variants: formattedVariants,
      stockAvailable: totalAvailable,
      stockPhysical: totalPhysical,
      stockReserved: totalReserved,
      stockQty: totalAvailable
    };

    res.json(formattedProduct);
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: err.message || 'Erro ao atualizar produto.' });
  }
});

// POST /api/products/batch-import (Importação de Planilha em Lote)
router.post('/products/batch-import', authenticateToken, requireRole(['PROPRIETARIA', 'GERENTE']), async (req, res) => {
  const { products: importList } = req.body;

  if (!importList || !Array.isArray(importList) || importList.length === 0) {
    return res.status(400).json({ error: 'Nenhum produto enviado para importação.' });
  }

  try {
    let location = await prisma.inventoryLocation.findFirst({ where: { isMain: true } });
    if (!location) {
      location = await prisma.inventoryLocation.create({
        data: { name: 'Estoque Central - Balcão Litran', isMain: true }
      });
    }

    // Categorias em cache
    const existingCategories = await prisma.category.findMany();
    const catMap = new Map(existingCategories.map(c => [c.name.toUpperCase(), c.id]));

    const currentUserId = req.user?.id || (await prisma.user.findFirst())?.id;

    const results = await prisma.$transaction(async (tx) => {
      const createdProducts = [];

      for (let i = 0; i < importList.length; i++) {
        const item = importList[i];
        if (!item.name || !item.name.trim()) continue;

        const cleanName = item.name.trim();
        const catName = (item.categoryName || 'MODA FITNESS').trim();
        
        let categoryId = catMap.get(catName.toUpperCase());
        if (!categoryId) {
          const newCat = await tx.category.create({
            data: { name: catName }
          });
          categoryId = newCat.id;
          catMap.set(catName.toUpperCase(), categoryId);
        }

        // Gera SKU único
        const cleanSlug = cleanName
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9]/g, '')
          .substring(0, 6)
          .toUpperCase();
        
        const timestamp = Date.now().toString().slice(-4);
        const randomCode = Math.floor(100 + Math.random() * 900);
        let sku = item.sku?.trim() || `LIT-${cleanSlug || 'PROD'}-${timestamp}${randomCode}-${i + 1}`;

        // Checa colisão de SKU de produto
        let skuExists = await tx.product.findUnique({ where: { sku } });
        let skuCounter = 1;
        while (skuExists) {
          sku = `LIT-${cleanSlug || 'PROD'}-${timestamp}${randomCode}-${i + 1}-V${skuCounter}`;
          skuExists = await tx.product.findUnique({ where: { sku } });
          skuCounter++;
        }

        const costPrice = parseFloat(item.costPrice || 0);
        const price = parseFloat(item.price || (costPrice > 0 ? costPrice * 2.2 : 49.90));
        const promoPrice = item.promoPrice ? parseFloat(item.promoPrice) : null;
        const brand = item.brand?.trim() || 'Litran';
        const description = item.description?.trim() || `Produto confeccionado para máxima durabilidade e conforto. Marca: ${brand}.`;

        const prod = await tx.product.create({
          data: {
            name: cleanName,
            description,
            categoryId,
            brand,
            sku,
            price,
            promoPrice,
            costPrice,
            minStock: 2,
            isActive: true,
            images: item.image ? { create: [{ url: item.image, isPrimary: true }] } : undefined
          }
        });

        if (item.variants && Array.isArray(item.variants) && item.variants.length > 0) {
          for (let vi = 0; vi < item.variants.length; vi++) {
            const v = item.variants[vi];
            const vSize = (v.size || 'ÚNICO').toString().trim().toUpperCase();
            const vColor = v.color ? v.color.toString().trim() : null;
            const colorCode = vColor ? `-${vColor.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 4)}` : '';
            const sizePart = vSize.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'U';
            let vSku = v.sku?.trim() || `${prod.sku}${colorCode}-${sizePart}-${vi + 1}`;

            let safeSku = vSku;
            let collision = await tx.productVariant.findUnique({ where: { sku: safeSku } });
            let counter = 1;
            while (collision) {
              safeSku = `${prod.sku}${colorCode}-${sizePart}-${vi + 1}-${counter}`;
              collision = await tx.productVariant.findUnique({ where: { sku: safeSku } });
              counter++;
            }

            const vQty = Math.max(0, parseInt(v.stockQty || 0));

            const variant = await tx.productVariant.create({
              data: {
                productId: prod.id,
                sku: safeSku,
                size: vSize,
                color: vColor,
                price: v.price ? parseFloat(v.price) : prod.price,
                costPrice: v.costPrice ? parseFloat(v.costPrice) : prod.costPrice
              }
            });

            await tx.inventoryBalance.create({
              data: {
                locationId: location.id,
                productId: prod.id,
                variantId: variant.id,
                physicalQty: vQty,
                reservedQty: 0,
                availableQty: vQty
              }
            });

            if (vQty > 0 && currentUserId) {
              await tx.inventoryMovement.create({
                data: {
                  productId: prod.id,
                  variantId: variant.id,
                  locationId: location.id,
                  type: 'ENTRADA_MERCADORIA',
                  qty: vQty,
                  previousBalance: 0,
                  newBalance: vQty,
                  reason: `Importação de planilha: ${vSize} ${vColor || ''}`.trim(),
                  userId: currentUserId
                }
              });
            }
          }
        } else {
          // Produto de peça única
          const initQty = Math.max(0, parseInt(item.stockQty || 0));
          await tx.inventoryBalance.create({
            data: {
              locationId: location.id,
              productId: prod.id,
              physicalQty: initQty,
              reservedQty: 0,
              availableQty: initQty
            }
          });

          if (initQty > 0 && currentUserId) {
            await tx.inventoryMovement.create({
              data: {
                productId: prod.id,
                locationId: location.id,
                type: 'ENTRADA_MERCADORIA',
                qty: initQty,
                previousBalance: 0,
                newBalance: initQty,
                reason: 'Importação de planilha em lote',
                userId: currentUserId
              }
            });
          }
        }

        createdProducts.push(prod);
      }

      return createdProducts;
    }, {
      maxWait: 20000,
      timeout: 180000 // 3 minutos para permitir inserção de lotes grandes sem fechar a transação
    });

    await logAudit({
      userId: req.user.id,
      action: 'BATCH_PRODUCTS_IMPORTED',
      entity: 'PRODUCT',
      newValue: { count: results.length },
      reason: `Importação em lote de ${results.length} produtos via planilha Excel`,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      count: results.length,
      message: `${results.length} produtos e todas as suas variações foram importados e lançados no estoque com sucesso!`
    });
  } catch (err) {
    console.error('Error in batch import:', err);
    res.status(500).json({ error: err.message || 'Erro ao importar lote de produtos.' });
  }
});

// DELETE /api/products/:id (Desativar produto)
router.delete('/products/:id', authenticateToken, requireRole(['PROPRIETARIA']), async (req, res) => {
  const { id } = req.params;

  try {
    const updated = await prisma.product.update({
      where: { id },
      data: { isActive: false }
    });

    await logAudit({
      userId: req.user.id,
      action: 'PRODUCT_DEACTIVATED',
      entity: 'PRODUCT',
      entityId: id,
      ipAddress: req.ip
    });

    res.json({ message: 'Produto desativado com sucesso.', product: updated });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erro ao desativar produto.' });
  }
});

export default router;

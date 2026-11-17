import dotenv from 'dotenv';
dotenv.config();

if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

import fs from 'fs';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const newImagesMap = JSON.parse(fs.readFileSync('./scripts/new_product_images.json', 'utf-8'));

// Definição dos 19 produtos solicitados
const PRODUCTS_DEFINITION = [
  {
    name: "Regata Aberto Costas Active",
    existingSku: "LIT-REGATA-3708240-1",
    folderKey: "REGATA ABERTO COSTAS ACTIVE",
    price: 89.00,
    promoPrice: 79.00,
    variants: [
      { color: "Vermelho", sizes: { P: 3, M: 3, G: 3, GG: 3 } },
      { color: "Expresso", sizes: { P: 3, M: 3, G: 3, GG: 3 } },
      { color: "Preto", sizes: { P: 3, M: 3, G: 3, GG: 3 } }
    ]
  },
  {
    name: "Camiseta Manga Longa UV Active",
    existingSku: "LIT-CAMISE-3708353-2",
    folderKey: "CAMISETA MANGA LONGA UV ACTIVE",
    price: 99.00,
    promoPrice: 84.00,
    variants: [
      { color: "Algodão Doce", sizes: { P: 3, M: 3, G: 3, GG: 3 } },
      { color: "Preto", sizes: { P: 3, M: 3, G: 3, GG: 3 } }
    ]
  },
  {
    name: "Macacão Levanta Bumbum Forrado Canelado",
    existingSku: "LIT-MACACA-3709152-7",
    folderKey: "MACACAO LEVANTA BUMBUM FORRADO CANELADO",
    price: 199.00,
    promoPrice: 179.00,
    variants: [
      { color: "Estelar", sizes: { P: 3, M: 3, G: 3, GG: 3 } },
      { color: "Preto", sizes: { P: 3, M: 3, G: 3, GG: 3 } },
      { color: "Marsala", sizes: { P: 3, M: 3, G: 3, GG: 3 } }
    ]
  },
  {
    name: "Macaquinho Levanta Bumbum Forrado Canelado",
    folderKey: "MACAQUINHO LEVANTA BUMBUM FORRADO CANELADO",
    price: 189.00,
    promoPrice: 159.00,
    variants: [
      { color: "Preto", sizes: { P: 3, M: 3, G: 3, GG: 3 } },
      { color: "Marsala", sizes: { P: 3, M: 3, G: 3, GG: 3 } },
      { color: "Oliva", sizes: { P: 3, M: 3, G: 3, GG: 3 } }
    ]
  },
  {
    name: "Bermuda com Forro e Bolso Laterais Canelado",
    folderKey: "BERMUDA COM FORRO E BOLSO LATERAIS CANELADO",
    price: 159.00,
    promoPrice: 139.00,
    variants: [
      { color: "Estelar", sizes: { P: 3, M: 3, G: 3, GG: 3 } },
      { color: "Preto", sizes: { P: 3, M: 3, G: 3, GG: 3 } }
    ]
  },
  {
    name: "Top Costas Y Canelado",
    folderKey: "TOP COSTAS Y CANELADO",
    price: 119.00,
    promoPrice: 99.00,
    variants: [
      { color: "Estelar", sizes: { P: 3, M: 3, G: 3, GG: 3 } },
      { color: "Preto", sizes: { P: 3, M: 3, G: 3, GG: 3 } }
    ]
  },
  {
    name: "Top Aruba Canelado",
    folderKey: "TOP ARUBA CANELADO",
    price: 94.00,
    promoPrice: 79.00,
    variants: [
      { color: "Marsala", sizes: { P: 3, M: 6, G: 3 } }
    ]
  },
  {
    name: "Calça Levanta Bumbum com Forro Canelado",
    folderKey: "CALÇA LEVANTA BUMBUM COM FORRO CANELADO",
    price: 199.00,
    promoPrice: 169.00,
    variants: [
      { color: "Marsala", sizes: { P: 3, M: 6, G: 3 } }
    ]
  },
  {
    name: "Calça com Forro e Bolsos Laterais Canelado",
    existingSku: "LIT-CALCAC-3709780-4",
    folderKey: "CALÇA COM FORRO E BOLSOS LATERAIS CANELADO",
    price: 199.00,
    promoPrice: 169.00,
    variants: [
      { color: "Estelar", sizes: { P: 3, M: 3, G: 3, GG: 3 } },
      { color: "Preto", sizes: { P: 3, M: 3, G: 3, GG: 3 } }
    ]
  },
  {
    name: "Calça Legging Flare Elastra",
    folderKey: "CALÇA LEGGING FLARE ELASTRA",
    price: 159.00,
    promoPrice: 129.00,
    variants: [
      { color: "Marrom", sizes: { P: 3, M: 3, G: 3, GG: 3 } },
      { color: "Preto", sizes: { P: 3, M: 3, G: 3, GG: 3 } }
    ]
  },
  {
    name: "Top Alça Dupla Franzido Elastra",
    folderKey: "TOP ALÇA DUPLA FRANZIDO ELASTRA",
    price: 94.00,
    promoPrice: 79.00,
    variants: [
      { color: "Marrom", sizes: { P: 3, M: 3, G: 3, GG: 3 } },
      { color: "Preto", sizes: { P: 3, M: 3, G: 3, GG: 3 } }
    ]
  },
  {
    name: "Jaqueta com Bolso Tela Corta-Vento",
    existingSku: "LIT-JAQUET-3708480-3",
    folderKey: "JAQUETA COM BOLSO TELA CORTA VENTO",
    price: 139.00,
    promoPrice: 119.00,
    variants: [
      { color: "Marinho", sizes: { P: 3, M: 3, G: 3, GG: 3 } },
      { color: "Preto", sizes: { P: 3, M: 3, G: 3, GG: 3 } },
      { color: "Branco", sizes: { P: 3, M: 3, G: 3, GG: 3 } }
    ]
  },
  {
    name: "Regata Dry Skin Poliamida",
    folderKey: "REGATA DRY SKIN POLIAMIDA",
    price: 79.00,
    promoPrice: 67.00,
    variants: [
      { color: "Preto", sizes: { P: 1, M: 1, G: 1, GG: 1 } }
    ]
  },
  {
    name: "Short Sport Médio",
    folderKey: "SHORT SPORT MÉDIO",
    price: 109.00,
    promoPrice: 89.00,
    variants: [
      { color: "Grafite", sizes: { P: 1, M: 1, G: 1, GG: 1 } }
    ]
  },
  {
    name: "Calça Legging Bolso Costas Jacquar Geo",
    folderKey: null, // usa foto compartilhada do conjunto Jacquar Geo
    sharedImagesFrom: "TOP PESPONTADO STRAPPY JACQUAR GEO",
    price: 199.00,
    promoPrice: 169.00,
    variants: [
      { color: "Branco", sizes: { P: 1, M: 1, G: 1, GG: 1 } }
    ]
  },
  {
    name: "Top Pespontado Strappy Jacquar Geo",
    folderKey: "TOP PESPONTADO STRAPPY JACQUAR GEO",
    price: 119.00,
    promoPrice: 99.00,
    variants: [
      { color: "Branco", sizes: { P: 1, M: 1, G: 1, GG: 1 } }
    ]
  },
  {
    name: "Calcinha Fio Dental sem Costura",
    existingSku: "LIT-CALCIN-3709200-6",
    folderKey: "CALCINHA FIO DENTAL SEM COSTURA",
    price: 29.00,
    promoPrice: 24.00,
    variants: [
      { color: "Chocolate", sizes: { P: 3, M: 6, G: 6, GG: 3 } }
    ]
  },
  {
    name: "Calcinha Biquíni sem Costura",
    existingSku: "LIT-CALCIN-3709464-5",
    folderKey: "CALCINHA BIQUINI SEM COSTURA",
    price: 32.00,
    promoPrice: 27.00,
    variants: [
      { color: "Chocolate", sizes: { P: 3, M: 6, G: 6, GG: 3 } }
    ]
  },
  {
    name: "Cueca Boxer Dry Poliamida C40",
    folderKey: "CUECA BOXER DRY POLIAMIDA C40",
    price: 49.00,
    promoPrice: 42.00,
    variants: [
      { color: "Marinho", sizes: { P: 3, M: 6, G: 6, GG: 3 } },
      { color: "Preto", sizes: { P: 3, M: 6, G: 6, GG: 3 } }
    ]
  }
];

function generateSku(name, index) {
  const clean = name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 6);
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `LIT-${clean}-${rnd}-${index}`;
}

async function main() {
  console.log('🚀 Iniciando cadastro/atualização oficial dos produtos no Supabase...');

  const category = await prisma.category.findFirst({ where: { name: 'MODA FITNESS' } });
  const categoryId = category.id;
  const location = await prisma.inventoryLocation.findFirst({ where: { isMain: true } });
  const locationId = location.id;
  const user = await prisma.user.findFirst();
  const userId = user.id;

  const existingProds = await prisma.product.findMany({
    include: { variants: true, images: true, balances: true }
  });
  const existingBySku = new Map(existingProds.map(p => [p.sku, p]));

  let updatedCount = 0;
  let createdCount = 0;
  let totalPiecesAdded = 0;

  for (let i = 0; i < PRODUCTS_DEFINITION.length; i++) {
    const pDef = PRODUCTS_DEFINITION[i];
    let images = [];
    if (pDef.folderKey && newImagesMap[pDef.folderKey]) {
      images = newImagesMap[pDef.folderKey];
    } else if (pDef.sharedImagesFrom && newImagesMap[pDef.sharedImagesFrom]) {
      images = newImagesMap[pDef.sharedImagesFrom];
    }

    let productInDb = pDef.existingSku ? existingBySku.get(pDef.existingSku) : null;

    if (productInDb) {
      console.log(`\n🔄 Atualizando produto existente: "${productInDb.name}" (${productInDb.sku})`);
      
      // Atualiza produto
      await prisma.product.update({
        where: { id: productInDb.id },
        data: {
          price: pDef.price,
          promoPrice: pDef.promoPrice,
          visibleOnline: true,
          isActive: true
        }
      });

      // Cadastra fotos se não existirem
      if (images.length > 0) {
        // Remove imagens antigas se houver
        await prisma.productImage.deleteMany({ where: { productId: productInDb.id } });
        await prisma.productImage.createMany({
          data: images.map((url, idx) => ({
            productId: productInDb.id,
            url,
            isPrimary: idx === 0
          }))
        });
        console.log(`   📸 ${images.length} fotos vinculadas ao produto.`);
      }

      updatedCount++;
    } else {
      console.log(`\n✨ Criando NOVO produto: "${pDef.name}"`);
      const newSku = generateSku(pDef.name, i + 1);

      // Prepara variantes
      const variantsToCreate = [];
      let totalProdQty = 0;

      pDef.variants.forEach((vGroup, gIdx) => {
        const colorName = vGroup.color;
        for (const [sizeName, qty] of Object.entries(vGroup.sizes)) {
          const varSku = `${newSku}-${colorName.substring(0, 4).toUpperCase()}-${sizeName}-${gIdx + 1}`;
          variantsToCreate.push({
            sku: varSku,
            size: sizeName,
            color: colorName,
            price: pDef.price,
            stockQty: qty
          });
          totalProdQty += qty;
        }
      });

      // Cria produto com variantes
      const created = await prisma.product.create({
        data: {
          name: pDef.name,
          description: `Peça confeccionada com tecido de alta tecnologia, toque macio, alta compressão e respirabilidade. Marca Litran.`,
          categoryId,
          brand: 'Litran',
          sku: newSku,
          price: pDef.price,
          promoPrice: pDef.promoPrice,
          costPrice: parseFloat((pDef.price * 0.45).toFixed(2)),
          minStock: 2,
          isActive: true,
          visibleOnline: true,
          images: {
            create: images.map((url, idx) => ({
              url,
              isPrimary: idx === 0
            }))
          },
          variants: {
            create: variantsToCreate.map(v => ({
              sku: v.sku,
              size: v.size,
              color: v.color,
              price: v.price
            }))
          }
        },
        include: { variants: true }
      });

      // Cria balances e movements para cada variante
      for (const vDb of created.variants) {
        const orig = variantsToCreate.find(v => v.sku === vDb.sku);
        const qty = orig ? orig.stockQty : 0;

        await prisma.inventoryBalance.create({
          data: {
            locationId,
            productId: created.id,
            variantId: vDb.id,
            physicalQty: qty,
            availableQty: qty,
            reservedQty: 0
          }
        });

        await prisma.inventoryMovement.create({
          data: {
            locationId,
            productId: created.id,
            variantId: vDb.id,
            type: 'ENTRADA_MERCADORIA',
            qty,
            previousBalance: 0,
            newBalance: qty,
            reason: 'Lançamento de novos produtos Litran',
            userId
          }
        });

        totalPiecesAdded += qty;
      }

      console.log(`   ✅ Criado com SKU ${newSku}, ${created.variants.length} variações, ${totalProdQty} unidades em estoque e ${images.length} fotos.`);
      createdCount++;
    }
  }

  console.log(`\n🎉 Operação concluída com sucesso!`);
  console.log(`- Produtos atualizados: ${updatedCount}`);
  console.log(`- Novos produtos criados: ${createdCount}`);
  console.log(`- Total de peças adicionadas: ${totalPiecesAdded}`);
}

main()
  .catch(err => console.error('Erro na execução:', err))
  .finally(() => prisma.$disconnect());

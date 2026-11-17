import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();
if (process.env.DIRECT_URL) process.env.DATABASE_URL = process.env.DIRECT_URL;

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function syncToCatalogData() {
  const targetSkus = [
    'LIT-REGATA-3708240-1',
    'LIT-CAMISE-3708353-2',
    'LIT-MACACA-3709152-7',
    'LIT-MACAQU-1705-4',
    'LIT-BERMUD-5377-5',
    'LIT-TOPCOS-2136-6',
    'LIT-TOPARU-6813-7',
    'LIT-CALCAL-1478-8',
    'LIT-CALCAC-3709780-4',
    'LIT-CALCAL-2530-10',
    'LIT-TOPALC-9360-11',
    'LIT-JAQUET-3708480-3',
    'LIT-REGATA-9247-13',
    'LIT-SHORTS-9117-14',
    'LIT-CALCAL-7079-15',
    'LIT-TOPPES-9883-16',
    'LIT-CALCIN-3709200-6',
    'LIT-CALCIN-3709464-5',
    'LIT-CUECAB-9381-19'
  ];

  const dbProducts = await prisma.product.findMany({
    where: { sku: { in: targetSkus } },
    include: {
      category: true,
      images: { orderBy: { isPrimary: 'desc' } },
      variants: {
        include: { balances: true },
        orderBy: [{ color: 'asc' }, { size: 'asc' }]
      }
    }
  });

  console.log(`Found ${dbProducts.length} products to export to catalogData.js`);

  const formattedItems = dbProducts.map(p => {
    const images = p.images.map(img => img.url);
    const colors = Array.from(new Set(p.variants.map(v => v.color).filter(Boolean)));
    const sizes = Array.from(new Set(p.variants.map(v => v.size).filter(Boolean)));
    
    // Mapeamento de cor para imagem
    const colorImages = {};
    colors.forEach((col, idx) => {
      if (images[idx]) {
        colorImages[col] = images[idx];
      } else if (images[0]) {
        colorImages[col] = images[0];
      }
    });

    const variations = p.variants.map(v => ({
      id: v.sku,
      name: `${v.color ? v.color + ' ' : ''}${v.size}`.trim(),
      price: p.promoPrice || p.price,
      sku: v.sku
    }));

    return {
      id: p.sku,
      name: p.name.toUpperCase(),
      refCode: `Ref: ${p.sku}`,
      sku: p.sku,
      category: 'moda-fitness',
      subcategory: 'MODA FITNESS',
      price: p.promoPrice || p.price,
      originalPrice: p.promoPrice ? p.price : null,
      images: images.length > 0 ? images : ['/products/1774463362_8688399ffcabc6b8495b.webp'],
      colorImages,
      video: null,
      variations,
      sizes: variations.map(v => v.name),
      tag: 'Black Friday',
      rating: 5,
      views: Math.floor(100 + Math.random() * 400),
      description: p.description || 'Produto confeccionado com tecnologia de ponta, alta respirabilidade e conforto térmico. Marca Litran.'
    };
  });

  const catalogFilePath = './src/data/catalogData.js';
  let content = fs.readFileSync(catalogFilePath, 'utf-8');

  // Localiza a lista de produtos existente
  const marker = 'export const PRODUCTS = [';
  const startIndex = content.indexOf(marker);
  if (startIndex === -1) {
    throw new Error('Could not find export const PRODUCTS in catalogData.js');
  }

  // Lê os produtos já existentes em catalogData.js
  const existingProdsStr = content.substring(startIndex + marker.length);
  // Encontra o fechamento ] final
  const lastBracket = content.lastIndexOf('];');
  const innerJsonStr = content.substring(startIndex + marker.length, lastBracket).trim();
  
  // Vamos ler via eval seguro ou regex
  // Como catalogData.js é ES module, vamos ler os existentes importando ou parsed
  const { PRODUCTS: currentStatic } = await import('../src/data/catalogData.js');
  console.log(`Current static products count: ${currentStatic.length}`);

  // Filtra para remover qualquer um que já tenha o mesmo sku
  const updatedList = currentStatic.filter(p => !targetSkus.includes(p.sku) && !targetSkus.includes(p.refCode?.replace('Ref: ', '')));
  updatedList.push(...formattedItems);

  console.log(`New static products count: ${updatedList.length}`);

  const beforeProducts = content.substring(0, startIndex);
  const newContent = `${beforeProducts}export const PRODUCTS = ${JSON.stringify(updatedList, null, 2)};\n`;

  fs.writeFileSync(catalogFilePath, newContent, 'utf-8');
  console.log('✅ src/data/catalogData.js updated successfully!');
}

syncToCatalogData()
  .catch(err => console.error('Error:', err))
  .finally(() => prisma.$disconnect());

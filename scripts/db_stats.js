import dotenv from 'dotenv';
dotenv.config();
if (process.env.DIRECT_URL) process.env.DATABASE_URL = process.env.DIRECT_URL;

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function count() {
  const total = await prisma.product.count();
  const online = await prisma.product.count({ where: { visibleOnline: true } });
  const variants = await prisma.productVariant.count();
  const balances = await prisma.inventoryBalance.aggregate({ _sum: { physicalQty: true } });
  
  console.log(`📊 DB STATS:`);
  console.log(`- Total products: ${total}`);
  console.log(`- Visible online: ${online}`);
  console.log(`- Total variants: ${variants}`);
  console.log(`- Total physical inventory units: ${balances._sum.physicalQty}`);
}

count().finally(() => prisma.$disconnect());

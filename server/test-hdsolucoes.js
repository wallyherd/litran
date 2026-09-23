import { PrismaClient } from '@prisma/client';

const url = 'postgresql://postgres:hdsolucoes2026@db.shlwzwbtvrujicrxxuao.supabase.co:5432/postgres';

async function testHDSolucoes() {
  console.log('Testing connection with hdsolucoes2026...');
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const users = await prisma.user.findMany();
    console.log('🎉🎉🎉 SUCCESS! Connected to Supabase! Users count:', users.length);
  } catch (err) {
    console.error('❌ CONNECTION FAIL:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

testHDSolucoes();

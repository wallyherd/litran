import { PrismaClient } from '@prisma/client';

const directUrl = 'postgresql://postgres:Litran2026Wally@db.shlwzwbtvrujicrxxuao.supabase.co:5432/postgres';

async function testDirect() {
  console.log('Testing direct URL:', directUrl);
  const prisma = new PrismaClient({ datasources: { db: { url: directUrl } } });
  try {
    const users = await prisma.user.findMany();
    console.log('🎉🎉🎉 DIRECT CONNECTION SUCCESS! Users count:', users.length);
  } catch (err) {
    console.error('❌ DIRECT FAIL:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDirect();

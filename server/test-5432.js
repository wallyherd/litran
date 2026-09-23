import { PrismaClient } from '@prisma/client';

const url = 'postgresql://postgres:%40Wallyherd123@db.shlwzwbtvrujicrxxuao.supabase.co:5432/postgres';

async function testPort5432() {
  console.log('Testing port 5432:', url);
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const count = await prisma.user.count();
    console.log('✅✅✅ PORT 5432 SUCCESS! Users count:', count);
  } catch (e) {
    console.error('❌ FAIL:', e);
  } finally {
    await prisma.$disconnect();
  }
}

testPort5432();

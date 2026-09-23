import { PrismaClient } from '@prisma/client';

const url = 'postgresql://postgres:%40Wallyherd123@db.shlwzwbtvrujicrxxuao.supabase.co:6543/postgres?pgbouncer=true';

async function testSingle() {
  console.log('Testing:', url);
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const count = await prisma.user.count();
    console.log('✅✅✅ SUCCESS! Users count:', count);
  } catch (e) {
    console.error('❌ FAIL:', e);
  } finally {
    await prisma.$disconnect();
  }
}

testSingle();

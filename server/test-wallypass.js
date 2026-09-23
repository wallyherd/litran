import { PrismaClient } from '@prisma/client';

const url = 'postgresql://postgres:%40Wallyherd123@db.shlwzwbtvrujicrxxuao.supabase.co:5432/postgres';

async function testWallyPass() {
  console.log('Testing url:', url);
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const users = await prisma.user.findMany();
    console.log('🎉🎉🎉 SUCCESS WITH %40Wallyherd123! Users count:', users.length);
  } catch (err) {
    console.error('❌ FAIL:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

testWallyPass();

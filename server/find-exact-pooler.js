import { PrismaClient } from '@prisma/client';

const candidates = [
  // 1. Pooler SA-East-1 (São Paulo) with user postgres.shlwzwbtvrujicrxxuao
  'postgresql://postgres.shlwzwbtvrujicrxxuao:%40Wallyherd123@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  // 2. Pooler SA-East-1 (São Paulo) Session mode port 5432
  'postgresql://postgres.shlwzwbtvrujicrxxuao:%40Wallyherd123@aws-0-sa-east-1.pooler.supabase.com:5432/postgres',
  // 3. Pooler US-East-1 Session mode port 5432
  'postgresql://postgres.shlwzwbtvrujicrxxuao:%40Wallyherd123@aws-0-us-east-1.pooler.supabase.com:5432/postgres',
  // 4. Direct Host port 5432 with sslmode=require
  'postgresql://postgres:%40Wallyherd123@db.shlwzwbtvrujicrxxuao.supabase.co:5432/postgres?sslmode=require',
  // 5. Direct Host port 5432 default
  'postgresql://postgres:%40Wallyherd123@db.shlwzwbtvrujicrxxuao.supabase.co:5432/postgres'
];

async function runTests() {
  for (const url of candidates) {
    console.log('\n--- TESTING URL:', url);
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    try {
      const users = await prisma.user.findMany();
      console.log('✅✅✅ WORKING URL FOUND! Users count:', users.length);
      console.log('EXACT_URL_TO_USE:', url);
      await prisma.$disconnect();
      return url;
    } catch (err) {
      console.log('❌ FAIL:', err.message.split('\n')[0]);
      await prisma.$disconnect();
    }
  }
}

runTests();

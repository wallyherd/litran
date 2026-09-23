import { PrismaClient } from '@prisma/client';

const poolers = [
  'postgresql://postgres.shlwzwbtvrujicrxxuao:hdsolucoes2026@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  'postgresql://postgres.shlwzwbtvrujicrxxuao:hdsolucoes2026@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  'postgresql://postgres.shlwzwbtvrujicrxxuao:hdsolucoes2026@aws-0-sa-east-1.pooler.supabase.com:5432/postgres',
  'postgresql://postgres.shlwzwbtvrujicrxxuao:hdsolucoes2026@aws-0-us-east-1.pooler.supabase.com:5432/postgres'
];

async function testPoolers() {
  for (const url of poolers) {
    console.log('Testing Pooler URL:', url);
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    try {
      const users = await prisma.user.findMany();
      console.log('🎉🎉🎉 POOLER SUCCESS!', url, 'Users count:', users.length);
      await prisma.$disconnect();
      return;
    } catch (e) {
      console.error('❌ FAIL:', e.message.split('\n')[0]);
      await prisma.$disconnect();
    }
  }
}

testPoolers();

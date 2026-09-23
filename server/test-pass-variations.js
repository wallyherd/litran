import { PrismaClient } from '@prisma/client';

const passes = [
  '%40Wallyherd123',
  'Wallyherd123',
  '%40wallyherd123',
  'wallyherd123',
  'Wallyherd123%40',
  '%40Wallyherd123%40'
];

const hosts = [
  'db.shlwzwbtvrujicrxxuao.supabase.co:5432',
  'aws-0-sa-east-1.pooler.supabase.com:6543',
  'aws-0-us-east-1.pooler.supabase.com:6543'
];

async function testPasses() {
  for (const pass of passes) {
    for (const host of hosts) {
      const user = host.includes('pooler') ? 'postgres.shlwzwbtvrujicrxxuao' : 'postgres';
      const param = host.includes('6543') ? '?pgbouncer=true' : '';
      const url = `postgresql://${user}:${pass}@${host}/postgres${param}`;
      console.log('Testing pass:', pass, 'host:', host);
      const prisma = new PrismaClient({ datasources: { db: { url } } });
      try {
        const c = await prisma.user.count();
        console.log('🎉🎉🎉 SUCCESS WITH PASSWORD!', pass, 'URL:', url);
        await prisma.$disconnect();
        return;
      } catch (e) {
        await prisma.$disconnect();
      }
    }
  }
  console.log('None of the automatic variations worked.');
}

testPasses();

import { PrismaClient } from '@prisma/client';

const projectRef = 'shlwzwbtvrujicrxxuao';
const pass = 'hdsolucoes2026';
const regions = [
  'sa-east-1',
  'us-east-1',
  'us-west-1',
  'eu-central-1',
  'eu-west-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ca-central-1',
  'sa-east-1.pooler',
  'us-east-1.pooler'
];

async function scanPoolers() {
  for (const reg of regions) {
    const host = `aws-0-${reg}.pooler.supabase.com`;
    const user = `postgres.${projectRef}`;
    const url = `postgresql://${user}:${pass}@${host}:6543/postgres?pgbouncer=true`;
    console.log('Scanning pooler host:', host);
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    try {
      const users = await prisma.user.findMany();
      console.log('🎉🎉🎉 WORKING POOLER FOUND!');
      console.log('EXACT_POOLER_URL="' + url + '"');
      await prisma.$disconnect();
      return url;
    } catch (err) {
      const msg = err.message ? err.message.split('\n')[0] : String(err);
      console.log('❌ FAIL:', msg);
      await prisma.$disconnect();
    }
  }
  console.log('Scan finished.');
}

scanPoolers();

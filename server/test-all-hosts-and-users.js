import { PrismaClient } from '@prisma/client';

const projectRef = 'shlwzwbtvrujicrxxuao';
const pass = '%40Wallyherd123';

const hosts = [
  'aws-0-sa-east-1.pooler.supabase.com',
  'aws-0-us-east-1.pooler.supabase.com',
  `db.${projectRef}.supabase.co`
];

const users = [
  `postgres.${projectRef}`,
  'postgres'
];

const ports = [6543, 5432];

const params = [
  '?pgbouncer=true',
  '?sslmode=require',
  ''
];

async function findWorking() {
  for (const host of hosts) {
    for (const user of users) {
      for (const port of ports) {
        for (const param of params) {
          const url = `postgresql://${user}:${pass}@${host}:${port}/postgres${param}`;
          console.log('\n---> Testing:', url);
          const prisma = new PrismaClient({ datasources: { db: { url } } });
          try {
            const count = await prisma.user.count();
            console.log('🎉🎉🎉 SUCCESS! WORKING CONNECTION STRING FOUND:');
            console.log('DATABASE_URL="' + url + '"');
            await prisma.$disconnect();
            return url;
          } catch (err) {
            const msg = err.message ? err.message.split('\n')[0] : String(err);
            console.log('❌ FAIL:', msg);
            await prisma.$disconnect();
          }
        }
      }
    }
  }
}

findWorking();

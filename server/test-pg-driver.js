import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:hdsolucoes2026@db.shlwzwbtvrujicrxxuao.supabase.co:5432/postgres?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('Testing pg driver connection...');
  try {
    await client.connect();
    const res = await client.query('SELECT count(*) FROM "User"');
    console.log('🎉🎉🎉 PG DRIVER SUCCESS! Count:', res.rows[0].count);
  } catch (err) {
    console.error('❌ PG DRIVER FAIL:', err);
  } finally {
    await client.end();
  }
}

main();

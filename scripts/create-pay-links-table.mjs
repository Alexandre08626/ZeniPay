import pkg from 'pg';
const { Pool } = pkg;

import { readFileSync } from 'fs';

const dotenv = readFileSync('.env.local', 'utf8');
const serviceKey = dotenv.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1];
const anonKey = dotenv.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1];
const projectRef = 'elanjzgxyauvirdyvfmn';

async function tryConnect(host, port, user, password, db = 'postgres') {
  const pool = new Pool({
    host,
    port,
    user,
    password,
    database: db,
    max: 1,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });
  try {
    const client = await pool.connect();
    await client.release();
    await pool.end();
    return { host, port, user };
  } catch (err) {
    await pool.end();
    return null;
  }
}

async function run() {
  const attempts = [
    // Direct connection
    { host: `db.${projectRef}.supabase.co`, port: 5432, user: 'postgres', password: serviceKey },
    // Pooler session mode
    { host: `aws-0-us-west-1.pooler.supabase.com`, port: 5432, user: `postgres.${projectRef}`, password: serviceKey },
    { host: `aws-0-us-west-1.pooler.supabase.com`, port: 6543, user: `postgres.${projectRef}`, password: serviceKey },
    // Try with anon key
    { host: `db.${projectRef}.supabase.co`, port: 5432, user: 'postgres', password: anonKey },
    // Try without project prefix
    { host: `aws-0-us-west-1.pooler.supabase.com`, port: 6543, user: 'postgres', password: serviceKey },
  ];

  let connected = null;
  for (const a of attempts) {
    console.log(`Trying ${a.user}@${a.host}:${a.port}...`);
    const result = await tryConnect(a.host, a.port, a.user, a.password);
    if (result) {
      console.log(`✅ Connected via ${result.user}@${result.host}:${result.port}`);
      connected = a;
      break;
    }
  }

  if (!connected) {
    console.log('\n❌ Could not connect to PostgreSQL directly.');
    console.log('Creating table via Supabase REST API workaround...');
    await createViaRestApi();
    return;
  }

  const pool = new Pool({
    host: connected.host,
    port: connected.port,
    user: connected.user,
    password: connected.password,
    database: 'postgres',
    max: 1,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS public.zenipay_pay_links (
        id             TEXT PRIMARY KEY,
        url            TEXT NOT NULL,
        amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
        currency       TEXT NOT NULL DEFAULT 'CAD',
        description    TEXT NOT NULL DEFAULT '',
        merchant_id    TEXT NOT NULL,
        status         TEXT NOT NULL DEFAULT 'active' 
                         CHECK (status IN ('active','paid','expired','cancelled')),
        uses           INTEGER NOT NULL DEFAULT 0,
        expires_at     TIMESTAMPTZ,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_pay_links_merchant ON public.zenipay_pay_links(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_pay_links_status ON public.zenipay_pay_links(status);
      CREATE INDEX IF NOT EXISTS idx_pay_links_created ON public.zenipay_pay_links(created_at DESC);

      ALTER TABLE public.zenipay_merchants 
        ADD COLUMN IF NOT EXISTS merchant_data JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS sandbox_key TEXT,
        ADD COLUMN IF NOT EXISTS live_key TEXT;

      -- Set merchant_data for the existing merchant
      UPDATE public.zenipay_merchants 
      SET merchant_data = jsonb_build_object(
        'email', 'dev@zeniva.ca',
        'businessName', COALESCE(name, 'Zeniva Travel'),
        'ownerName', COALESCE(owner_name, 'Dev User'),
        'plan', 'Premium',
        'status', 'active',
        'sandboxKey', '',
        'liveKey', ''
      )
      WHERE merchant_data IS NULL OR merchant_data = '{}'::jsonb;
    `;

    await client.query(sql);
    console.log('\n✅ zenipay_pay_links table created!');
    console.log('✅ merchant_data, sandbox_key, live_key added to merchants!');
    
    const { rows } = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'zenipay_pay_links' ORDER BY ordinal_position"
    );
    console.log('\n📋 zenipay_pay_links columns:');
    rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));
    
    // Show updated merchant
    const { rows: merchants } = await client.query(
      "SELECT id, email, merchant_data IS NOT NULL as has_merchant_data, sandbox_key IS NOT NULL as has_sandbox_key, live_key IS NOT NULL as has_live_key FROM public.zenipay_merchants LIMIT 5"
    );
    console.log('\n📋 Merchant status:');
    merchants.forEach(m => console.log(`  ${m.email}: merchant_data=${m.has_merchant_data}, sandbox_key=${m.has_sandbox_key}, live_key=${m.has_live_key}`));

  } catch (err) {
    console.error('❌ SQL error:', err.message);
  } finally {
    await client.release();
    await pool.end();
  }
}

async function createViaRestApi() {
  const sql = `
CREATE TABLE IF NOT EXISTS public.zenipay_pay_links (
  id             TEXT PRIMARY KEY,
  url            TEXT NOT NULL,
  amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'CAD',
  description    TEXT NOT NULL DEFAULT '',
  merchant_id    TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'active' 
                   CHECK (status IN ('active','paid','expired','cancelled')),
  uses           INTEGER NOT NULL DEFAULT 0,
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pay_links_merchant ON public.zenipay_pay_links(merchant_id);
CREATE INDEX IF NOT EXISTS idx_pay_links_status ON public.zenipay_pay_links(status);
CREATE INDEX IF NOT EXISTS idx_pay_links_created ON public.zenipay_pay_links(created_at DESC);

ALTER TABLE public.zenipay_merchants 
  ADD COLUMN IF NOT EXISTS merchant_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sandbox_key TEXT,
  ADD COLUMN IF NOT EXISTS live_key TEXT;
`;

  // Use Supabase REST API to execute SQL via a custom function
  // First, let's try creating a temporary function
  console.log('No direct DB access available.');
  console.log('\n⚠️  Please run this SQL in the Supabase Dashboard SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/elanjzgxyauvirdyvfmn/sql/new');
  console.log('\n' + sql);
}

run().catch(console.error);

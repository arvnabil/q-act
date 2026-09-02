import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) env[key.trim()] = value.join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  console.log('--- Test 1: basic select ---');
  const { data: d1, error: e1 } = await supabase.from('sales_orders').select('*').limit(1);
  console.log(e1 ? 'ERROR: ' + JSON.stringify(e1) : 'OK, rows: ' + d1.length);

  console.log('\n--- Test 2: with customer join ---');
  const { data: d2, error: e2 } = await supabase
    .from('sales_orders')
    .select('*, customer:customers(id, name), items:sales_order_items(*), costs:sales_order_costs(*)')
    .limit(1);
  console.log(e2 ? 'ERROR: ' + JSON.stringify(e2) : 'OK, rows: ' + d2.length);

  console.log('\n--- Test 3: RLS check (auth as anon) ---');
  // Try inserting a dummy row to see if policy blocks
  const testRow = { id: '__test__', quotation_id: null, date: '2026-01-01', status: 'Dibuat Sales', total_item_value: 0, total_cost: 0, grand_total: 0 };
  const { error: e3 } = await supabase.from('sales_orders').insert([testRow]);
  console.log(e3 ? 'Insert ERROR: ' + JSON.stringify(e3) : 'Insert OK');
  // Clean up if inserted
  if (!e3) await supabase.from('sales_orders').delete().eq('id', '__test__');

  console.log('\n--- Test 4: users table ---');
  const { data: d4, error: e4 } = await supabase.from('users').select('id, name').limit(1);
  console.log(e4 ? 'ERROR: ' + JSON.stringify(e4) : 'OK, row: ' + JSON.stringify(d4[0]));
}
run();

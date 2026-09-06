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
  const { data, error } = await supabase.from('sales_users').select('id, name, role').order('role');
  if (error) { console.error('sales_users error:', error.message); }
  else {
    const byRole = {};
    data.forEach(u => { if (!byRole[u.role]) byRole[u.role] = []; byRole[u.role].push(u.name); });
    console.log('sales_users roles:', JSON.stringify(byRole, null, 2));
  }
}
run();

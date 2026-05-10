import { execSync } from 'child_process';
import { STORE } from './lib/store.js';

const SCOPES = [
  'read_products',
  'write_products',
  'read_orders',
  'write_orders',
  'read_inventory',
  'write_inventory',
  'read_customers',
].join(',');

console.log(`\nAuthenticating with store: ${STORE}\n`);

try {
  execSync(`shopify store auth --store ${STORE} --scopes ${SCOPES}`, { stdio: 'inherit' });
} catch (err) {
  process.exit(err.status ?? 1);
}

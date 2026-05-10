import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env if present
const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length > 0) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
}

export const STORE = process.env.SHOPIFY_STORE_DOMAIN || 'scubaseekers.myshopify.com';
export const LOW_STOCK_THRESHOLD = parseInt(process.env.LOW_STOCK_THRESHOLD || '5', 10);

/**
 * Execute a Shopify Admin GraphQL query against the store.
 * @param {string} query  - GraphQL query or mutation string
 * @param {object} [variables] - Optional variables object
 * @param {boolean} [allowMutations] - Pass true for mutations
 */
export function executeQuery(query, variables = {}, allowMutations = false) {
  const varFlag = Object.keys(variables).length
    ? `--variables '${JSON.stringify(variables)}'`
    : '';
  const mutationFlag = allowMutations ? '--allow-mutations' : '';
  const cmd = `shopify store execute --store ${STORE} --json --query '${query.replace(/'/g, "'\\''")}' ${varFlag} ${mutationFlag}`.trim();

  try {
    const output = execSync(cmd, { encoding: 'utf8' });
    return JSON.parse(output);
  } catch (err) {
    const msg = err.stderr || err.stdout || err.message || '';
    if (msg.includes('not authenticated') || msg.includes('auth')) {
      console.error(`\nNot authenticated. Run:\n  npm run auth\n`);
    } else {
      console.error('Error executing query:', msg);
    }
    process.exit(1);
  }
}

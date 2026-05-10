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

const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = '2025-04';
const ENDPOINT = `https://${STORE}/admin/api/${API_VERSION}/graphql.json`;

/**
 * Execute a Shopify Admin GraphQL query directly via the API.
 */
export async function executeQuery(query, variables = {}) {
  if (!TOKEN) {
    console.error('\nMissing SHOPIFY_ACCESS_TOKEN. Add it to your .env file.\n');
    process.exit(1);
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    console.error(`API request failed: ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const json = await res.json();

  if (json.errors) {
    console.error('GraphQL errors:', JSON.stringify(json.errors, null, 2));
    process.exit(1);
  }

  return json.data;
}

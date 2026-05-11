const STORE   = process.env.SHOPIFY_STORE_DOMAIN!;
const TOKEN   = process.env.SHOPIFY_ACCESS_TOKEN!;
const VERSION = '2025-04';
const ENDPOINT = `https://${STORE}/admin/api/${VERSION}/graphql.json`;

export async function shopify<T = Record<string, unknown>>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': TOKEN,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`Shopify API ${res.status}: ${res.statusText}`);

  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? 'GraphQL error');
  return json.data as T;
}

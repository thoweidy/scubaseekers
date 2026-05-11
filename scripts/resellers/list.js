import { executeQuery, STORE } from '../lib/store.js';

const query = `
  query ListResellers($first: Int!, $after: String) {
    customers(first: $first, after: $after, query: "tag:reseller") {
      edges {
        node {
          id
          numberOfOrders
          amountSpent { amount currencyCode }
          createdAt
          tags
          metafield(namespace: "reseller", key: "discount_rate") {
            value
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

async function main() {
  console.log(`\nFetching reseller accounts from ${STORE}...\n`);

  let all = [], after = null, hasNext = true;
  while (hasNext) {
    const result = await executeQuery(query, { first: 100, after });
    all = all.concat(result?.customers?.edges ?? []);
    hasNext = result?.customers?.pageInfo?.hasNextPage ?? false;
    after  = result?.customers?.pageInfo?.endCursor ?? null;
  }

  if (!all.length) {
    console.log('No reseller accounts found.');
    return;
  }

  console.log(`${'Customer ID'.padEnd(36)} ${'Discount'.padEnd(10)} ${'Orders'.padEnd(8)} ${'Total Spent'.padEnd(16)} ${'Since'.padEnd(12)} Company`);
  console.log('─'.repeat(100));

  for (const { node: c } of all) {
    const discount = c.metafield ? `${c.metafield.value}%` : '—';
    const spent    = c.amountSpent ? `${c.amountSpent.currencyCode} ${parseFloat(c.amountSpent.amount).toFixed(2)}` : '—';
    const since    = c.createdAt.substring(0, 10);
    const company  = (c.tags || []).find(t => t.startsWith('company:'))?.replace('company:', '') || '';
    const shortId  = c.id.replace('gid://shopify/Customer/', '');

    console.log(
      shortId.padEnd(36),
      discount.padEnd(10),
      String(c.numberOfOrders || 0).padEnd(8),
      spent.padEnd(16),
      since.padEnd(12),
      company,
    );
  }
  console.log('\n⚠  Names/emails hidden — enable Protected customer data in your app settings to show them.');

  console.log(`\nTotal resellers: ${all.length}`);
}

main();

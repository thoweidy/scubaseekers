import { executeQuery, STORE } from '../lib/store.js';

const query = `
  query ListCustomers($first: Int!, $after: String) {
    customers(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          displayName
          email
          phone
          numberOfOrders
          amountSpent { amount currencyCode }
          createdAt
          tags
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

async function main() {
  console.log(`\nFetching recent customers from ${STORE}...\n`);
  const result = await executeQuery(query, { first: 50 });
  const customers = result?.customers?.edges ?? [];

  if (!customers.length) {
    console.log('No customers found.');
    return;
  }

  console.log(`${'Name'.padEnd(28)} ${'Email'.padEnd(32)} ${'Orders'.padEnd(8)} ${'Total Spent'.padEnd(16)} ${'Since'.padEnd(12)} Tags`);
  console.log('-'.repeat(110));

  for (const { node: c } of customers) {
    const spent = c.amountSpent ? `${c.amountSpent.currencyCode} ${parseFloat(c.amountSpent.amount).toFixed(2)}` : '—';
    const since = c.createdAt.substring(0, 10);
    const tags = (c.tags || []).join(', ');

    console.log(
      (c.displayName || '').substring(0, 27).padEnd(28),
      (c.email || '').substring(0, 31).padEnd(32),
      String(c.numberOfOrders || 0).padEnd(8),
      spent.padEnd(16),
      since.padEnd(12),
      tags,
    );
  }

  console.log(`\nTotal shown: ${customers.length}`);
}

main();

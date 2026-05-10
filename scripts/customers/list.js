import { executeQuery, STORE } from '../lib/store.js';

const query = `
  query ListCustomers($first: Int!) {
    customers(first: $first, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          displayName
          email
          phone
          ordersCount
          totalSpentV2 { amount currencyCode }
          createdAt
          tags
        }
      }
    }
  }
`;

async function main() {
  console.log(`\nFetching recent customers from ${STORE}...\n`);
  const result = executeQuery(query, { first: 50 });
  const customers = result?.data?.customers?.edges ?? [];

  if (!customers.length) {
    console.log('No customers found.');
    return;
  }

  console.log(`${'Name'.padEnd(28)} ${'Email'.padEnd(32)} ${'Orders'.padEnd(8)} ${'Total Spent'.padEnd(16)} ${'Since'.padEnd(12)} Tags`);
  console.log('-'.repeat(110));

  for (const { node: c } of customers) {
    const spent = `${c.totalSpentV2.currencyCode} ${parseFloat(c.totalSpentV2.amount).toFixed(2)}`;
    const since = c.createdAt.substring(0, 10);
    const tags = (c.tags || []).join(', ');

    console.log(
      (c.displayName || '').substring(0, 27).padEnd(28),
      (c.email || '').substring(0, 31).padEnd(32),
      String(c.ordersCount || 0).padEnd(8),
      spent.padEnd(16),
      since.padEnd(12),
      tags,
    );
  }

  console.log(`\nTotal shown: ${customers.length}`);
}

main();

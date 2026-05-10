import { executeQuery, STORE } from '../lib/store.js';

const query = `
  query ListOrders($first: Int!, $after: String) {
    orders(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          name
          displayFinancialStatus
          displayFulfillmentStatus
          createdAt
          totalPriceSet { shopMoney { amount currencyCode } }
          customer { displayName email }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

async function main() {
  console.log(`\nFetching recent orders from ${STORE}...\n`);
  const result = await executeQuery(query, { first: 50 });
  const orders = result?.orders?.edges ?? [];

  if (!orders.length) {
    console.log('No orders found.');
    return;
  }

  console.log(`${'Order'.padEnd(10)} ${'Date'.padEnd(12)} ${'Customer'.padEnd(28)} ${'Financial'.padEnd(16)} ${'Fulfillment'.padEnd(16)} Total`);
  console.log('-'.repeat(100));

  for (const { node: o } of orders) {
    const date = o.createdAt.substring(0, 10);
    const customer = o.customer
      ? `${o.customer.displayName} <${o.customer.email}>`.substring(0, 27)
      : 'Guest';
    const total = `${o.totalPriceSet.shopMoney.currencyCode} ${parseFloat(o.totalPriceSet.shopMoney.amount).toFixed(2)}`;

    console.log(
      o.name.padEnd(10),
      date.padEnd(12),
      customer.padEnd(28),
      o.displayFinancialStatus.padEnd(16),
      o.displayFulfillmentStatus.padEnd(16),
      total,
    );
  }

  console.log(`\nTotal shown: ${orders.length}`);
}

main();

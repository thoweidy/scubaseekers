import { executeQuery, STORE } from '../lib/store.js';

const query = `
  query OpenOrders($first: Int!) {
    orders(first: $first, query: "fulfillment_status:unshipped financial_status:paid") {
      edges {
        node {
          id
          name
          createdAt
          displayFulfillmentStatus
          totalPriceSet {
            shopMoney { amount currencyCode }
          }
          customer { displayName email }
          shippingAddress {
            city
            provinceCode
            countryCode
          }
          lineItems(first: 5) {
            edges {
              node {
                title
                quantity
              }
            }
          }
        }
      }
    }
  }
`;

async function main() {
  console.log(`\nFetching open (paid + unshipped) orders from ${STORE}...\n`);
  const result = executeQuery(query, { first: 50 });
  const orders = result?.data?.orders?.edges ?? [];

  if (!orders.length) {
    console.log('No open orders found.');
    return;
  }

  for (const { node: o } of orders) {
    const date = o.createdAt.substring(0, 10);
    const customer = o.customer ? `${o.customer.displayName} <${o.customer.email}>` : 'Guest';
    const addr = o.shippingAddress
      ? `${o.shippingAddress.city}, ${o.shippingAddress.provinceCode} ${o.shippingAddress.countryCode}`
      : 'No address';
    const total = `${o.totalPriceSet.shopMoney.currencyCode} ${parseFloat(o.totalPriceSet.shopMoney.amount).toFixed(2)}`;
    const items = o.lineItems.edges.map(({ node: li }) => `  - ${li.title} x${li.quantity}`).join('\n');

    console.log(`${o.name} | ${date} | ${total}`);
    console.log(`  Customer: ${customer}`);
    console.log(`  Ship to: ${addr}`);
    console.log(`  Items:\n${items}`);
    console.log();
  }

  console.log(`Total open orders: ${orders.length}`);
}

main();

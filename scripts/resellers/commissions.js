/**
 * Commission report — shows how much Scuba Seekers owes each reseller
 * based on paid orders tagged with their reseller ID.
 *
 * Usage: node scripts/resellers/commissions.js
 */
import { executeQuery } from '../lib/store.js';

const ORDERS_QUERY = `
  query ResellerOrders($first: Int!, $after: String) {
    orders(first: $first, after: $after, query: "tag:reseller-order financial_status:paid") {
      edges {
        node {
          id
          name
          createdAt
          totalPriceSet { shopMoney { amount currencyCode } }
          tags
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

async function main() {
  console.log('\nFetching paid reseller orders...\n');

  let all = [], after = null, hasNext = true;
  while (hasNext) {
    const result = await executeQuery(ORDERS_QUERY, { first: 250, after });
    all = all.concat(result?.orders?.edges ?? []);
    hasNext = result?.orders?.pageInfo?.hasNextPage ?? false;
    after  = result?.orders?.pageInfo?.endCursor ?? null;
  }

  if (!all.length) {
    console.log('No paid reseller orders found.');
    return;
  }

  // Group by reseller
  const resellers = new Map();
  for (const { node: order } of all) {
    const resellerTag    = order.tags.find(t => t.startsWith('reseller:'));
    const commissionTag  = order.tags.find(t => t.startsWith('commission:'));
    if (!resellerTag) continue;

    const resellerId     = resellerTag.replace('reseller:', '');
    const commissionRate = parseFloat((commissionTag ?? 'commission:0').replace('commission:', '').replace('pct', ''));
    const orderTotal     = parseFloat(order.totalPriceSet.shopMoney.amount);
    const commission     = (orderTotal * commissionRate) / 100;
    const currency       = order.totalPriceSet.shopMoney.currencyCode;

    if (!resellers.has(resellerId)) {
      resellers.set(resellerId, { resellerId, commissionRate, orders: [], totalRevenue: 0, totalCommission: 0, currency });
    }
    const entry = resellers.get(resellerId);
    entry.orders.push({ name: order.name, date: order.createdAt.substring(0, 10), total: orderTotal, commission });
    entry.totalRevenue    += orderTotal;
    entry.totalCommission += commission;
  }

  console.log('='.repeat(80));
  console.log('RESELLER COMMISSION REPORT');
  console.log('='.repeat(80));

  for (const [, r] of resellers) {
    console.log(`\nReseller ID: ${r.resellerId}  |  Commission Rate: ${r.commissionRate}%`);
    console.log('─'.repeat(60));
    console.log(`  ${'Order'.padEnd(12)} ${'Date'.padEnd(12)} ${'Order Total'.padEnd(14)} Commission`);
    for (const o of r.orders) {
      console.log(`  ${o.name.padEnd(12)} ${o.date.padEnd(12)} ${(r.currency + ' ' + o.total.toFixed(2)).padEnd(14)} ${r.currency} ${o.commission.toFixed(2)}`);
    }
    console.log('─'.repeat(60));
    console.log(`  TOTAL REVENUE: ${r.currency} ${r.totalRevenue.toFixed(2)}`);
    console.log(`  OWED TO RESELLER: ${r.currency} ${r.totalCommission.toFixed(2)}`);
  }

  const grandTotal = Array.from(resellers.values()).reduce((s, r) => s + r.totalCommission, 0);
  const currency   = Array.from(resellers.values())[0]?.currency ?? '';
  console.log('\n' + '='.repeat(80));
  console.log(`TOTAL COMMISSIONS OWED: ${currency} ${grandTotal.toFixed(2)}`);
  console.log('='.repeat(80) + '\n');
}

main();

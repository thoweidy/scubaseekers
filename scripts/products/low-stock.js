import { executeQuery, STORE, LOW_STOCK_THRESHOLD } from '../lib/store.js';

const query = `
  query LowStockProducts($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          status
          variants(first: 100) {
            edges {
              node {
                id
                title
                sku
                inventoryQuantity
              }
            }
          }
        }
      }
      pageInfo { hasNextPage }
    }
  }
`;

async function main() {
  console.log(`\nChecking low-stock products on ${STORE} (threshold: ${LOW_STOCK_THRESHOLD})...\n`);
  const result = executeQuery(query, { first: 250 });
  const products = result?.data?.products?.edges ?? [];

  const lowStock = [];
  for (const { node: product } of products) {
    for (const { node: variant } of product.variants.edges) {
      const qty = variant.inventoryQuantity ?? 0;
      if (qty <= LOW_STOCK_THRESHOLD) {
        lowStock.push({ product: product.title, variant: variant.title, sku: variant.sku, qty });
      }
    }
  }

  if (!lowStock.length) {
    console.log(`All variants have stock above ${LOW_STOCK_THRESHOLD}.`);
    return;
  }

  console.log(`${'Product'.padEnd(40)} ${'Variant'.padEnd(20)} ${'SKU'.padEnd(20)} Qty`);
  console.log('-'.repeat(90));
  for (const item of lowStock) {
    console.log(
      item.product.substring(0, 39).padEnd(40),
      (item.variant || 'Default').substring(0, 19).padEnd(20),
      (item.sku || '—').substring(0, 19).padEnd(20),
      item.qty,
    );
  }
  console.log(`\n${lowStock.length} variant(s) at or below threshold.`);
}

main();

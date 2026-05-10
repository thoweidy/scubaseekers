import { executeQuery, STORE } from '../lib/store.js';

const query = `
  query ListProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          title
          status
          totalInventory
          vendor
          productType
          priceRangeV2 {
            minVariantPrice { amount currencyCode }
            maxVariantPrice { amount currencyCode }
          }
        }
      }
      pageInfo { hasNextPage }
    }
  }
`;

async function main() {
  console.log(`\nFetching products from ${STORE}...\n`);
  const result = executeQuery(query, { first: 50 });
  const products = result?.data?.products?.edges ?? [];

  if (!products.length) {
    console.log('No products found.');
    return;
  }

  console.log(`${'Title'.padEnd(40)} ${'Status'.padEnd(10)} ${'Stock'.padEnd(8)} ${'Vendor'.padEnd(20)} ${'Type'.padEnd(20)} Price`);
  console.log('-'.repeat(120));

  for (const { node: p } of products) {
    const minPrice = p.priceRangeV2.minVariantPrice;
    const maxPrice = p.priceRangeV2.maxVariantPrice;
    const priceStr = minPrice.amount === maxPrice.amount
      ? `${minPrice.currencyCode} ${parseFloat(minPrice.amount).toFixed(2)}`
      : `${minPrice.currencyCode} ${parseFloat(minPrice.amount).toFixed(2)}–${parseFloat(maxPrice.amount).toFixed(2)}`;

    console.log(
      p.title.substring(0, 39).padEnd(40),
      p.status.padEnd(10),
      String(p.totalInventory ?? 0).padEnd(8),
      (p.vendor || '').substring(0, 19).padEnd(20),
      (p.productType || '').substring(0, 19).padEnd(20),
      priceStr,
    );
  }

  const hasNext = result?.data?.products?.pageInfo?.hasNextPage;
  if (hasNext) {
    console.log('\n(More products available — re-run with a larger --first value or implement pagination)');
  }
  console.log(`\nTotal shown: ${products.length}`);
}

main();

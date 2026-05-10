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
      pageInfo { hasNextPage endCursor }
    }
  }
`;

async function main() {
  console.log(`\nFetching products from ${STORE}...\n`);

  let allProducts = [];
  let after = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const result = await executeQuery(query, { first: 250, after });
    const edges = result?.products?.edges ?? [];
    allProducts = allProducts.concat(edges);
    hasNextPage = result?.products?.pageInfo?.hasNextPage ?? false;
    after = result?.products?.pageInfo?.endCursor ?? null;
  }

  if (!allProducts.length) {
    console.log('No products found.');
    return;
  }

  console.log(`${'Title'.padEnd(40)} ${'Status'.padEnd(10)} ${'Stock'.padEnd(8)} ${'Vendor'.padEnd(20)} ${'Type'.padEnd(20)} Price`);
  console.log('-'.repeat(120));

  for (const { node: p } of allProducts) {
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

  console.log(`\nTotal products: ${allProducts.length}`);
}

main();

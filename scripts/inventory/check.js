import { executeQuery, STORE } from '../lib/store.js';

const locationsQuery = `
  query Locations {
    locations(first: 10) {
      edges {
        node {
          id
          name
          isActive
        }
      }
    }
  }
`;

const inventoryQuery = `
  query InventoryByLocation($locationId: ID!, $first: Int!) {
    location(id: $locationId) {
      name
      inventoryLevels(first: $first) {
        edges {
          node {
            quantities(names: ["available", "on_hand", "committed"]) {
              name
              quantity
            }
            item {
              sku
              variant {
                displayName
                product { title }
              }
            }
          }
        }
        pageInfo { hasNextPage }
      }
    }
  }
`;

async function main() {
  console.log(`\nFetching inventory from ${STORE}...\n`);

  const locResult = executeQuery(locationsQuery, {});
  const locations = locResult?.locations?.edges ?? [];

  if (!locations.length) {
    console.log('No locations found.');
    return;
  }

  for (const { node: loc } of locations) {
    if (!loc.isActive) continue;
    console.log(`\n=== ${loc.name} ===`);

    const invResult = executeQuery(inventoryQuery, { locationId: loc.id, first: 250 });
    const levels = invResult?.location?.inventoryLevels?.edges ?? [];

    if (!levels.length) {
      console.log('  (no inventory items)');
      continue;
    }

    console.log(`${'Product / Variant'.padEnd(50)} ${'SKU'.padEnd(20)} ${'Available'.padEnd(12)} ${'On Hand'.padEnd(10)} Committed`);
    console.log('-'.repeat(105));

    for (const { node: level } of levels) {
      const qtys = Object.fromEntries(level.quantities.map(q => [q.name, q.quantity]));
      const variant = level.item?.variant;
      const label = variant
        ? `${variant.product.title} — ${variant.displayName}`.substring(0, 49)
        : '(unknown)';
      const sku = (level.item?.sku || '—').substring(0, 19);

      console.log(
        label.padEnd(50),
        sku.padEnd(20),
        String(qtys.available ?? 0).padEnd(12),
        String(qtys.on_hand ?? 0).padEnd(10),
        String(qtys.committed ?? 0),
      );
    }
  }
}

main();

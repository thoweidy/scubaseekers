import { executeQuery, STORE } from '../lib/store.js';

const locationsQuery = `
  query Locations {
    locations(first: 20, includeInactive: false) {
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
  query InventoryByLocation($locationId: ID!, $first: Int!, $after: String) {
    location(id: $locationId) {
      name
      inventoryLevels(first: $first, after: $after) {
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
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

async function main() {
  console.log(`\nFetching inventory from ${STORE}...\n`);

  const locResult = await executeQuery(locationsQuery);
  const locations = locResult?.locations?.edges ?? [];

  if (!locations.length) {
    console.log('No locations found.');
    return;
  }

  for (const { node: loc } of locations) {
    if (!loc.isActive) continue;
    console.log(`\n=== ${loc.name} ===`);

    let allLevels = [];
    let after = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const invResult = await executeQuery(inventoryQuery, { locationId: loc.id, first: 250, after });
      const edges = invResult?.location?.inventoryLevels?.edges ?? [];
      allLevels = allLevels.concat(edges);
      hasNextPage = invResult?.location?.inventoryLevels?.pageInfo?.hasNextPage ?? false;
      after = invResult?.location?.inventoryLevels?.pageInfo?.endCursor ?? null;
    }

    if (!allLevels.length) {
      console.log('  (no inventory items)');
      continue;
    }

    let totalAvailable = 0;
    console.log(`${'Product / Variant'.padEnd(50)} ${'SKU'.padEnd(20)} ${'Available'.padEnd(12)} ${'On Hand'.padEnd(10)} Committed`);
    console.log('-'.repeat(105));

    for (const { node: level } of allLevels) {
      const qtys = Object.fromEntries(level.quantities.map(q => [q.name, q.quantity]));
      const variant = level.item?.variant;
      const label = variant
        ? `${variant.product.title} — ${variant.displayName}`.substring(0, 49)
        : '(unknown)';
      const sku = (level.item?.sku || '—').substring(0, 19);
      totalAvailable += qtys.available ?? 0;

      console.log(
        label.padEnd(50),
        sku.padEnd(20),
        String(qtys.available ?? 0).padEnd(12),
        String(qtys.on_hand ?? 0).padEnd(10),
        String(qtys.committed ?? 0),
      );
    }

    console.log(`\nTotal available at ${loc.name}: ${totalAvailable} units across ${allLevels.length} variants`);
  }
}

main();

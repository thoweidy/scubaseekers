import { executeQuery } from './lib/store.js';

// Physical inventory to compare - [name, quantity]
const PHYSICAL = [
  ['evolve 40 al backplate', 2],
  ['evolve 40 steel backplate', 1],
  ['evolve jj', 1],
  ['halcyon fin large', 1],
  ['halcyon fin xl', 1],
  ['infinity 30 small al bp full set', 1],
  ['7ft primary reg hose', 10],
  ['pg hose package', 2],
  ['halo 2nd stage old model', 2],
  ['cf bp with straps', 4],
  ['bp pads', 2],
  ['double hose kit', 2],
  ['single hose kit', 2],
  ['repair kit halo', 20],
  ['kit charge', 28],  // 30 - 2 for personal use
  ['repair kit aura', 5],
  ['cf single tank adaptor', 2],
  ['hp75 first stage', 1],  // 2 - 1 selling
  ['3.75 inch double ender', 14],
  ['4 inch double ender', 20],
  ['halo 2nd stage', 2],  // 3 - 1 selling
  ['zero gravity side mount 30', 2],
  ['braided nylon line', 1],
  ['22 inch backup reg hose', 4],
  ['ext knife angled sheath', 2],
  ['stage gauge dual scale', 3],
  ['3/8 bolt snap', 4],
  ['1 inch bolt snap wide eye', 4],
  ['master spg dual scale', 9],
  ['aura 1st stage', 8],
  ['pathfinder 400 reel', 3],
  ['hp50 first stage', 4],
];

const LOCATION_DAHAB = 'gid://shopify/Location/75811356867';
const LOCATION_USA   = 'gid://shopify/Location/75581063363';

async function fetchAllInventory(locationId) {
  const query = `
    query Inventory($locationId: ID!, $first: Int!, $after: String) {
      location(id: $locationId) {
        inventoryLevels(first: $first, after: $after) {
          edges {
            node {
              quantities(names: ["available"]) { quantity }
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

  let all = [], after = null, hasNext = true;
  while (hasNext) {
    const res = await executeQuery(query, { locationId, first: 250, after });
    const edges = res?.location?.inventoryLevels?.edges ?? [];
    all = all.concat(edges);
    hasNext = res?.location?.inventoryLevels?.pageInfo?.hasNextPage ?? false;
    after  = res?.location?.inventoryLevels?.pageInfo?.endCursor ?? null;
  }
  return all;
}

function normalize(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function score(a, b) {
  const wa = a.split(' ');
  const wb = b.split(' ');
  const matches = wa.filter(w => w.length > 2 && wb.includes(w)).length;
  return matches;
}

async function main() {
  console.log('Fetching Dahab inventory...');
  const dahabLevels = await fetchAllInventory(LOCATION_DAHAB);
  console.log('Fetching USA inventory...');
  const usaLevels   = await fetchAllInventory(LOCATION_USA);

  // Build lookup: normalized title -> { dahab, usa, title, sku }
  const shopifyMap = new Map();
  const allIds = new Set([
    ...dahabLevels.map(e => e.node.item?.variant?.product?.title + '|' + e.node.item?.variant?.displayName),
    ...usaLevels.map(e => e.node.item?.variant?.product?.title + '|' + e.node.item?.variant?.displayName),
  ]);

  for (const level of dahabLevels) {
    const v = level.node.item?.variant;
    if (!v) continue;
    const key = normalize(`${v.product.title} ${v.displayName}`);
    const entry = shopifyMap.get(key) || { title: `${v.product.title} — ${v.displayName}`, sku: level.node.item?.sku, dahab: 0, usa: 0 };
    entry.dahab += level.node.quantities[0]?.quantity ?? 0;
    shopifyMap.set(key, entry);
  }
  for (const level of usaLevels) {
    const v = level.node.item?.variant;
    if (!v) continue;
    const key = normalize(`${v.product.title} ${v.displayName}`);
    const entry = shopifyMap.get(key) || { title: `${v.product.title} — ${v.displayName}`, sku: level.node.item?.sku, dahab: 0, usa: 0 };
    entry.usa += level.node.quantities[0]?.quantity ?? 0;
    shopifyMap.set(key, entry);
  }

  const shopifyKeys = Array.from(shopifyMap.keys());

  console.log('\n');
  console.log('='.repeat(130));
  console.log('INVENTORY COMPARISON — Physical (USA) vs Shopify USA location');
  console.log('='.repeat(130));
  console.log(
    'Physical Item'.padEnd(35),
    'Phys Qty'.padEnd(10),
    'Best Shopify Match'.padEnd(55),
    'USA'.padEnd(8),
    'Dahab'.padEnd(8),
    'Diff (USA)',
  );
  console.log('-'.repeat(130));

  let matched = 0, mismatched = 0, notFound = 0;

  for (const [physName, physQty] of PHYSICAL) {
    const normPhys = normalize(physName);

    // Find best matching shopify entry
    let bestKey = null, bestScore = 0;
    for (const key of shopifyKeys) {
      const s = score(normPhys, key);
      if (s > bestScore) { bestScore = s; bestKey = key; }
    }

    if (!bestKey || bestScore < 1) {
      console.log(
        physName.substring(0, 34).padEnd(35),
        String(physQty).padEnd(10),
        '*** NOT FOUND IN SHOPIFY ***'.padEnd(55),
        '—'.padEnd(8), '—'.padEnd(8), '',
      );
      notFound++;
      continue;
    }

    const entry = shopifyMap.get(bestKey);
    const diff = entry.usa - physQty;
    const diffStr = diff === 0 ? '✓ match' : diff > 0 ? `+${diff} Shopify high` : `${diff} Shopify LOW`;
    if (diff === 0) matched++; else mismatched++;

    console.log(
      physName.substring(0, 34).padEnd(35),
      String(physQty).padEnd(10),
      entry.title.substring(0, 54).padEnd(55),
      String(entry.usa).padEnd(8),
      String(entry.dahab).padEnd(8),
      diffStr,
    );
  }

  console.log('-'.repeat(130));
  console.log(`\nSummary: ${matched} matched  |  ${mismatched} discrepant  |  ${notFound} not found in Shopify`);
}

main();

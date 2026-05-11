/**
 * Update a reseller's discount rate and issue a new discount code.
 *
 * Usage:
 *   node scripts/resellers/update.js --email jane@example.com --discount 25
 */
import { executeQuery } from '../lib/store.js';

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : null;
}

const email    = arg('email');
const discount = parseFloat(arg('discount'));

if (!email || isNaN(discount) || discount < 0 || discount > 100) {
  console.error('\nUsage: node scripts/resellers/update.js --email <email> --discount <0-100>\n');
  process.exit(1);
}

function makeCode(first, last, discount) {
  const clean = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `RESELLER-${clean(first)}-${clean(last)}-${Math.round(discount)}`;
}

const FIND_CUSTOMER = `
  query FindCustomer($query: String!) {
    customers(first: 1, query: $query) {
      edges {
        node {
          id
          metafield(namespace: "reseller", key: "discount_rate") { id value }
        }
      }
    }
  }
`;

const SET_METAFIELD = `
  mutation SetMetafield($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id key value }
      userErrors { field message }
    }
  }
`;

const CREATE_DISCOUNT = `
  mutation CreateResellerDiscount($basicCodeDiscount: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
      codeDiscountNode {
        id
        codeDiscount {
          ... on DiscountCodeBasic {
            codes(first: 1) { edges { node { code } } }
          }
        }
      }
      userErrors { field message }
    }
  }
`;

async function main() {
  console.log(`\nUpdating reseller discount for ${email} to ${discount}%...\n`);

  // 1. Find the customer
  const findResult = await executeQuery(FIND_CUSTOMER, { query: `email:${email} tag:reseller` });
  const edges = findResult?.customers?.edges ?? [];

  if (!edges.length) {
    console.error(`No reseller account found for ${email}`);
    process.exit(1);
  }

  const customer = edges[0].node;
  const oldRate  = customer.metafield?.value ?? 'none';
  console.log(`✓ Found reseller (current rate: ${oldRate}%)`);

  // 2. Update the metafield
  const metafieldResult = await executeQuery(SET_METAFIELD, {
    metafields: [{
      ownerId: customer.id,
      namespace: 'reseller',
      key: 'discount_rate',
      type: 'number_decimal',
      value: String(discount),
    }],
  });

  if (metafieldResult.metafieldsSet.userErrors.length) {
    console.error('Failed to update metafield:', metafieldResult.metafieldsSet.userErrors);
    process.exit(1);
  }
  console.log(`✓ Discount rate updated: ${oldRate}% → ${discount}%`);

  // 3. Create a new discount code using the email as identifier
  const emailSlug = email.split('@')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
  const code = `RESELLER-${emailSlug}-${Math.round(discount)}`;
  const discountResult = await executeQuery(CREATE_DISCOUNT, {
    basicCodeDiscount: {
      title: `Reseller – ${email} (${discount}%)`,
      code,
      startsAt: new Date().toISOString(),
      customerSelection: {
        customers: { add: [customer.id] },
      },
      customerGets: {
        value: { percentage: discount / 100 },
        items: { all: true },
      },
      appliesOncePerCustomer: false,
    },
  });

  if (discountResult.discountCodeBasicCreate.userErrors.length) {
    console.error('Failed to create discount code:', discountResult.discountCodeBasicCreate.userErrors);
    process.exit(1);
  }

  console.log(`✓ New discount code: ${code}`);
  console.log('\nShare the new code with the reseller. Their old code is no longer valid.\n');
}

main();

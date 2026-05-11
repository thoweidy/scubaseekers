/**
 * Create a reseller account.
 *
 * Usage:
 *   node scripts/resellers/create.js --email jane@example.com --first Jane --last Doe --discount 20
 *   node scripts/resellers/create.js --email jane@example.com --first Jane --last Doe --discount 20 --company "Dive Shop"
 */
import { executeQuery } from '../lib/store.js';

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : null;
}

const email    = arg('email');
const first    = arg('first');
const last     = arg('last');
const discount = parseFloat(arg('discount'));
const company  = arg('company') || '';

if (!email || !first || !last || isNaN(discount) || discount < 0 || discount > 100) {
  console.error('\nUsage: node scripts/resellers/create.js --email <email> --first <first> --last <last> --discount <0-100> [--company <name>]\n');
  process.exit(1);
}

function makeCode(first, last, discount) {
  const clean = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `RESELLER-${clean(first)}${clean(last)}-${Math.round(discount)}`;
}

const CREATE_CUSTOMER = `
  mutation CreateCustomer($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer { id }
      userErrors { field message }
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
            title
            codes(first: 1) { edges { node { code } } }
          }
        }
      }
      userErrors { field message }
    }
  }
`;

async function main() {
  console.log(`\nCreating reseller account for ${first} ${last} <${email}> at ${discount}% discount...\n`);

  // 1. Create the customer
  const customerResult = await executeQuery(CREATE_CUSTOMER, {
    input: {
      email,
      firstName: first,
      lastName: last,
      tags: company ? ['reseller', `company:${company}`] : ['reseller'],
      emailMarketingConsent: { marketingState: 'NOT_SUBSCRIBED', marketingOptInLevel: 'SINGLE_OPT_IN' },
    },
  });

  if (customerResult.customerCreate.userErrors.length) {
    console.error('Failed to create customer:', customerResult.customerCreate.userErrors);
    process.exit(1);
  }

  const customer = customerResult.customerCreate.customer;
  console.log(`✓ Customer created: ${customer.id}`);

  // 2. Set the discount rate metafield
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
    console.error('Failed to set metafield:', metafieldResult.metafieldsSet.userErrors);
    process.exit(1);
  }

  console.log(`✓ Discount rate set: ${discount}%`);

  // 3. Create a customer-specific discount code
  const code = makeCode(first, last, discount);
  const discountResult = await executeQuery(CREATE_DISCOUNT, {
    basicCodeDiscount: {
      title: `Reseller – ${first} ${last} (${discount}%)`,
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

  console.log(`✓ Discount code created: ${code}`);
  console.log('\n' + '─'.repeat(50));
  console.log('  RESELLER ACCOUNT CREATED');
  console.log('─'.repeat(50));
  console.log(`  Name:          ${first} ${last}`);
  if (company) console.log(`  Company:       ${company} (stored as tag)`);
  console.log(`  Email:         ${email}`);
  console.log(`  Discount:      ${discount}%`);
  console.log(`  Discount Code: ${code}`);
  console.log('─'.repeat(50));
  console.log('\nShare the discount code with the reseller — they use it at every checkout.\n');
}

main();

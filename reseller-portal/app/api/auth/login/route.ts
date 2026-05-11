import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify';
import { getSession } from '@/lib/session';

const FIND_RESELLER = `
  query FindReseller($query: String!) {
    customers(first: 1, query: $query) {
      edges {
        node {
          id
          discountRate: metafield(namespace: "reseller", key: "discount_rate") { value }
          accessCode:   metafield(namespace: "reseller", key: "access_code")   { value }
        }
      }
    }
  }
`;

export async function POST(req: NextRequest) {
  const { email, code } = await req.json();

  if (!email || !code) {
    return NextResponse.json({ error: 'Email and access code are required.' }, { status: 400 });
  }

  let data: {
    customers: { edges: { node: { id: string; discountRate: { value: string } | null; accessCode: { value: string } | null } }[] };
  };

  try {
    data = await shopify(FIND_RESELLER, { query: `email:${email} tag:reseller` });
  } catch {
    return NextResponse.json({ error: 'Unable to verify account. Try again.' }, { status: 500 });
  }

  const customer = data.customers.edges[0]?.node;

  if (!customer || !customer.accessCode) {
    return NextResponse.json({ error: 'No reseller account found for this email.' }, { status: 401 });
  }

  if (customer.accessCode.value.toLowerCase() !== code.trim().toLowerCase()) {
    return NextResponse.json({ error: 'Invalid access code.' }, { status: 401 });
  }

  const session = await getSession();
  session.customerId   = customer.id;
  session.email        = email.toLowerCase();
  session.name         = email.split('@')[0]; // name hidden due to Shopify PII restrictions
  session.discountRate = parseFloat(customer.discountRate?.value ?? '0');
  session.accessCode   = customer.accessCode.value;
  await session.save();

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify';
import { getSession } from '@/lib/session';

const GET_PROFILE = `
  query Profile($id: ID!) {
    customer(id: $id) {
      id
      tags
      discountRate: metafield(namespace: "reseller", key: "discount_rate") { value }
      accessCode:   metafield(namespace: "reseller", key: "access_code")   { value }
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

export async function GET() {
  try {
    const session = await getSession();
    if (!session.customerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await shopify<{
      customer: { id: string; tags: string[]; discountRate: { value: string } | null; accessCode: { value: string } | null };
    }>(GET_PROFILE, { id: session.customerId });

    const company = (data.customer.tags ?? []).find(t => t.startsWith('company:'))?.replace('company:', '') ?? '';

    return NextResponse.json({
      email:        session.email,
      discountRate: parseFloat(data.customer.discountRate?.value ?? '0'),
      accessCode:   data.customer.accessCode?.value ?? '',
      company,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load profile.' },
      { status: 500 },
    );
  }
}

/* Regenerate access code */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.customerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { action } = await req.json();
    if (action !== 'regenerate_code') {
      return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
    }

    const random   = Math.random().toString(36).slice(2, 10).toUpperCase();
    const newCode  = `RESELLER-${random}-${Math.round(session.discountRate)}`;

    const result = await shopify<{
      metafieldsSet: { userErrors: { message: string }[] };
    }>(SET_METAFIELD, {
      metafields: [{
        ownerId: session.customerId,
        namespace: 'reseller',
        key: 'access_code',
        type: 'single_line_text_field',
        value: newCode,
      }],
    });

    if (result.metafieldsSet.userErrors.length) {
      return NextResponse.json({ error: result.metafieldsSet.userErrors[0].message }, { status: 400 });
    }

    session.accessCode = newCode;
    await session.save();

    return NextResponse.json({ ok: true, accessCode: newCode });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update profile.' },
      { status: 500 },
    );
  }
}

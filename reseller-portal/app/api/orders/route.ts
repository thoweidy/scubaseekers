import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify';
import { getSession } from '@/lib/session';

/* ── Create draft order ───────────────────────────────────────── */
const CREATE_DRAFT_ORDER = `
  mutation CreateDraftOrder($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder {
        id
        name
        invoiceUrl
        totalPriceSet { shopMoney { amount currencyCode } }
      }
      userErrors { field message }
    }
  }
`;

const SEND_INVOICE = `
  mutation SendInvoice($id: ID!, $email: DraftOrderInvoiceEmailInput) {
    draftOrderInvoiceSend(id: $id, email: $email) {
      draftOrder { id }
      userErrors { field message }
    }
  }
`;

/* ── List draft orders for this reseller ─────────────────────── */
const LIST_ORDERS = `
  query ResellerOrders($query: String!, $first: Int!) {
    orders(first: $first, query: $query, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          name
          createdAt
          displayFinancialStatus
          displayFulfillmentStatus
          totalPriceSet { shopMoney { amount currencyCode } }
          tags
        }
      }
    }
  }
`;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.customerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { customerName, customerEmail, lineItems, note } = await req.json();

  if (!customerEmail || !lineItems?.length) {
    return NextResponse.json({ error: 'Customer email and at least one item are required.' }, { status: 400 });
  }

  // Build the draft order — full retail price, tagged with reseller
  const resellerId = session.customerId.replace('gid://shopify/Customer/', '');
  const resellerTag = `reseller:${resellerId}`;
  const commissionTag = `commission:${session.discountRate}pct`;

  const draftInput = {
    lineItems: lineItems.map((item: { variantId: string; quantity: number }) => ({
      variantId: item.variantId,
      quantity: item.quantity,
    })),
    shippingAddress: undefined,
    tags: [resellerTag, commissionTag, 'reseller-order'],
    note: note ? `[Reseller: ${session.email}] ${note}` : `[Reseller: ${session.email}]`,
    // Do NOT apply any discount — customer pays full retail price
    // Reseller gets paid commission separately
  };

  const draftData = await shopify<{
    draftOrderCreate: {
      draftOrder: { id: string; name: string; invoiceUrl: string; totalPriceSet: { shopMoney: { amount: string; currencyCode: string } } } | null;
      userErrors: { field: string[]; message: string }[];
    };
  }>(CREATE_DRAFT_ORDER, { input: draftInput });

  if (draftData.draftOrderCreate.userErrors.length) {
    return NextResponse.json({ error: draftData.draftOrderCreate.userErrors[0].message }, { status: 400 });
  }

  const draft = draftData.draftOrderCreate.draftOrder!;

  // Send invoice email to the end customer
  const invoiceData = await shopify<{
    draftOrderInvoiceSend: { userErrors: { message: string }[] };
  }>(SEND_INVOICE, {
    id: draft.id,
    email: {
      to: customerEmail,
      ...(customerName && { subject: `Your order from ${process.env.NEXT_PUBLIC_STORE_NAME ?? 'Scuba Seekers'}` }),
    },
  });

  if (invoiceData.draftOrderInvoiceSend.userErrors.length) {
    // Invoice send failed but order was created — return the URL as fallback
    return NextResponse.json({
      ok: true,
      orderId: draft.id,
      orderName: draft.name,
      invoiceUrl: draft.invoiceUrl,
      total: draft.totalPriceSet.shopMoney,
      invoiceSent: false,
      warning: 'Invoice email could not be sent. Share the link manually.',
    });
  }

  return NextResponse.json({
    ok: true,
    orderId: draft.id,
    orderName: draft.name,
    invoiceUrl: draft.invoiceUrl,
    total: draft.totalPriceSet.shopMoney,
    invoiceSent: true,
    sentTo: customerEmail,
  });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.customerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const resellerId = session.customerId.replace('gid://shopify/Customer/', '');
  const data = await shopify<{ orders: { edges: unknown[] } }>(
    LIST_ORDERS,
    { query: `tag:reseller:${resellerId}`, first: 50 },
  );

  return NextResponse.json({ orders: data.orders.edges });
}

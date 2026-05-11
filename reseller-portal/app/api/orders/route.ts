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
  mutation SendInvoice($id: ID!, $email: EmailInput) {
    draftOrderInvoiceSend(id: $id, email: $email) {
      draftOrder { id }
      userErrors { field message }
    }
  }
`;

/* ── List orders for this reseller ────────────────────────────── */
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

const LIST_DRAFTS = `
  query ResellerDrafts($query: String!, $first: Int!) {
    draftOrders(first: $first, query: $query, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          name
          createdAt
          status
          invoiceUrl
          totalPriceSet { shopMoney { amount currencyCode } }
          tags
        }
      }
    }
  }
`;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.customerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { customerEmail, lineItems, note } = await req.json();

    if (!customerEmail || !lineItems?.length) {
      return NextResponse.json({ error: 'Customer email and at least one item are required.' }, { status: 400 });
    }

    const resellerId    = session.customerId.replace('gid://shopify/Customer/', '');
    const resellerTag   = `reseller:${resellerId}`;
    const commissionTag = `commission:${session.discountRate}pct`;

    const draftInput = {
      lineItems: lineItems.map((item: { variantId: string; quantity: number }) => ({
        variantId: item.variantId,
        quantity: item.quantity,
      })),
      tags: [resellerTag, commissionTag, 'reseller-order'],
      note: note ? `[Reseller: ${session.email}] ${note}` : `[Reseller: ${session.email}]`,
      email: customerEmail,
    };

    const draftData = await shopify<{
      draftOrderCreate: {
        draftOrder: { id: string; name: string; invoiceUrl: string; totalPriceSet: { shopMoney: { amount: string; currencyCode: string } } } | null;
        userErrors: { field: string[]; message: string }[];
      };
    }>(CREATE_DRAFT_ORDER, { input: draftInput });

    if (draftData.draftOrderCreate.userErrors.length) {
      const err = draftData.draftOrderCreate.userErrors[0];
      return NextResponse.json({ error: `${err.field?.join('.') ?? ''}: ${err.message}` }, { status: 400 });
    }

    const draft = draftData.draftOrderCreate.draftOrder!;

    let invoiceSent = true;
    let warning: string | undefined;
    try {
      const invoiceData = await shopify<{
        draftOrderInvoiceSend: { userErrors: { message: string }[] };
      }>(SEND_INVOICE, {
        id: draft.id,
        email: { to: customerEmail },
      });

      if (invoiceData.draftOrderInvoiceSend.userErrors.length) {
        invoiceSent = false;
        warning = `Invoice email failed: ${invoiceData.draftOrderInvoiceSend.userErrors[0].message}. Share the link manually.`;
      }
    } catch (e) {
      invoiceSent = false;
      warning = `Invoice email failed: ${e instanceof Error ? e.message : 'unknown'}. Share the link manually.`;
    }

    return NextResponse.json({
      ok: true,
      orderId:   draft.id,
      orderName: draft.name,
      invoiceUrl: draft.invoiceUrl,
      total:      draft.totalPriceSet.shopMoney,
      invoiceSent,
      sentTo: invoiceSent ? customerEmail : undefined,
      warning,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected server error.' },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session.customerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resellerId = session.customerId.replace('gid://shopify/Customer/', '');
    const tagQuery   = `tag:reseller:${resellerId}`;

    const [ordersData, draftsData] = await Promise.all([
      shopify<{ orders: { edges: { node: Record<string, unknown> }[] } }>(LIST_ORDERS, { query: tagQuery, first: 50 }),
      shopify<{ draftOrders: { edges: { node: Record<string, unknown> }[] } }>(LIST_DRAFTS, { query: tagQuery, first: 50 }),
    ]);

    return NextResponse.json({
      orders: ordersData.orders.edges,
      drafts: draftsData.draftOrders.edges,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load orders.' },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify';
import { getSession } from '@/lib/session';

const SEARCH_PRODUCTS = `
  query SearchProducts($query: String!, $first: Int!) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          title
          status
          featuredImage { url altText }
          variants(first: 50) {
            edges {
              node {
                id
                title
                sku
                price
                inventoryQuantity
                availableForSale
              }
            }
          }
        }
      }
    }
  }
`;

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.customerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (!q) return NextResponse.json({ products: [] });

  const data = await shopify<{ products: { edges: unknown[] } }>(
    SEARCH_PRODUCTS,
    { query: `status:active title:*${q}*`, first: 20 },
  );

  return NextResponse.json({ products: data.products.edges });
}

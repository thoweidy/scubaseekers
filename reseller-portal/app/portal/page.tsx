'use client';

import { useState, useCallback } from 'react';

interface Variant {
  id: string;
  title: string;
  sku: string;
  price: string;
  inventoryQuantity: number;
  availableForSale: boolean;
}

interface Product {
  id: string;
  title: string;
  featuredImage: { url: string; altText: string } | null;
  variants: { edges: { node: Variant }[] };
}

interface CartItem {
  variantId: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  price: number;
  quantity: number;
}

export default function NewOrderPage() {
  const [searchQuery, setSearchQuery]   = useState('');
  const [products, setProducts]         = useState<Product[]>([]);
  const [searching, setSearching]       = useState(false);
  const [cart, setCart]                 = useState<CartItem[]>([]);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName]   = useState('');
  const [note, setNote]                   = useState('');
  const [submitting, setSubmitting]       = useState(false);
  const [result, setResult]               = useState<null | { orderName: string; invoiceUrl: string; total: { amount: string; currencyCode: string }; invoiceSent: boolean; sentTo?: string; warning?: string }>(null);
  const [error, setError]                 = useState('');

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setProducts([]); return; }
    setSearching(true);
    const res = await fetch(`/api/products/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setProducts((data.products ?? []).map((e: { node: Product }) => e.node));
    setSearching(false);
  }, []);

  function addToCart(product: Product, variant: Variant) {
    setCart(prev => {
      const exists = prev.find(i => i.variantId === variant.id);
      if (exists) return prev.map(i => i.variantId === variant.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, {
        variantId: variant.id,
        productTitle: product.title,
        variantTitle: variant.title === 'Default Title' ? '' : variant.title,
        sku: variant.sku,
        price: parseFloat(variant.price),
        quantity: 1,
      }];
    });
  }

  function updateQty(variantId: string, qty: number) {
    if (qty < 1) { removeItem(variantId); return; }
    setCart(prev => prev.map(i => i.variantId === variantId ? { ...i, quantity: qty } : i));
  }

  function removeItem(variantId: string) {
    setCart(prev => prev.filter(i => i.variantId !== variantId));
  }

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!cart.length) { setError('Add at least one product.'); return; }
    setSubmitting(true);

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerEmail,
        customerName,
        note,
        lineItems: cart.map(i => ({ variantId: i.variantId, quantity: i.quantity })),
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) { setError(data.error ?? 'Failed to create order.'); return; }

    setResult(data);
    setCart([]);
    setCustomerEmail('');
    setCustomerName('');
    setNote('');
    setSearchQuery('');
    setProducts([]);
  }

  if (result) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Created!</h2>
        <p className="text-gray-500 mb-1">Order {result.orderName}</p>
        <p className="text-xl font-semibold mb-4">
          {result.total.currencyCode} {parseFloat(result.total.amount).toFixed(2)}
        </p>

        {result.invoiceSent ? (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 mb-6 text-sm">
            Payment link sent to <strong>{result.sentTo}</strong>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4 mb-6 text-sm">
            {result.warning}<br />
            <a href={result.invoiceUrl} target="_blank" rel="noreferrer"
               className="font-medium underline mt-1 inline-block">
              Copy payment link
            </a>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setResult(null)}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Create another order
          </button>
          <a href="/portal/orders"
             className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
            View my orders
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

      {/* LEFT — Product search */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Search Products</h2>
        <div className="relative mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); search(e.target.value); }}
            placeholder="Search by product name…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searching && <span className="absolute right-3 top-3 text-xs text-gray-400">Searching…</span>}
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {products.map(product => (
            <div key={product.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex gap-3 mb-3">
                {product.featuredImage && (
                  <img src={product.featuredImage.url} alt={product.featuredImage.altText ?? product.title}
                       className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                )}
                <div>
                  <p className="font-medium text-sm text-gray-900">{product.title}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                {product.variants.edges.map(({ node: v }) => (
                  <div key={v.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-gray-700">{v.title === 'Default Title' ? 'Standard' : v.title}</span>
                      {v.sku && <span className="text-gray-400 ml-2 text-xs">{v.sku}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">${parseFloat(v.price).toFixed(2)}</span>
                      <span className={`text-xs ${v.inventoryQuantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {v.inventoryQuantity} in stock
                      </span>
                      <button
                        onClick={() => addToCart(product, v)}
                        disabled={!v.availableForSale}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium
                                   hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!searching && searchQuery && products.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No products found for &quot;{searchQuery}&quot;</p>
          )}
        </div>
      </div>

      {/* RIGHT — Order form */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Order Details</h2>

        <form onSubmit={submitOrder} className="space-y-5">
          {/* Customer info */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Customer</h3>
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Customer name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email"
              required
              value={customerEmail}
              onChange={e => setCustomerEmail(e.target.value)}
              placeholder="Customer email (for payment link) *"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Cart */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Items</h3>
            {cart.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No items added yet</p>
            ) : (
              <div className="space-y-2">
                {cart.map(item => (
                  <div key={item.variantId} className="flex items-center gap-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.productTitle}</p>
                      {item.variantTitle && <p className="text-gray-400 text-xs">{item.variantTitle}</p>}
                    </div>
                    <span className="text-gray-500">${item.price.toFixed(2)}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => updateQty(item.variantId, item.quantity - 1)}
                              className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-gray-600">−</button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button type="button" onClick={() => updateQty(item.variantId, item.quantity + 1)}
                              className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50 text-gray-600">+</button>
                    </div>
                    <span className="font-medium w-16 text-right">${(item.price * item.quantity).toFixed(2)}</span>
                    <button type="button" onClick={() => removeItem(item.variantId)}
                            className="text-gray-300 hover:text-red-500 transition-colors">✕</button>
                  </div>
                ))}
                <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Note */}
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Order note (optional)"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !cart.length || !customerEmail}
            className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium
                       hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating order…' : `Send Payment Link — $${total.toFixed(2)}`}
          </button>
        </form>
      </div>
    </div>
  );
}

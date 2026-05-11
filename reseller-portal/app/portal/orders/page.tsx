'use client';

import { useEffect, useState } from 'react';

interface Order {
  id: string;
  name: string;
  createdAt: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  tags: string[];
}

const STATUS_COLORS: Record<string, string> = {
  PAID:         'bg-green-100 text-green-700',
  PENDING:      'bg-yellow-100 text-yellow-700',
  PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700',
  REFUNDED:     'bg-gray-100 text-gray-600',
  VOIDED:       'bg-gray-100 text-gray-500',
  AUTHORIZED:   'bg-blue-100 text-blue-700',
  FULFILLED:    'bg-green-100 text-green-700',
  UNFULFILLED:  'bg-orange-100 text-orange-700',
  IN_PROGRESS:  'bg-blue-100 text-blue-700',
};

export default function OrdersPage() {
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [commissionRate, setCommissionRate] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/orders')
      .then(r => r.json())
      .then(data => {
        const list: Order[] = (data.orders ?? []).map((e: { node: Order }) => e.node);
        setOrders(list);
        // Extract commission rate from the first order's tags
        const tag = list[0]?.tags?.find((t: string) => t.startsWith('commission:'));
        if (tag) setCommissionRate(parseFloat(tag.replace('commission:', '').replace('pct', '')));
        setLoading(false);
      });
  }, []);

  const paidOrders    = orders.filter(o => o.displayFinancialStatus === 'PAID');
  const totalRevenue  = paidOrders.reduce((s, o) => s + parseFloat(o.totalPriceSet.shopMoney.amount), 0);
  const totalCommission = commissionRate != null ? (totalRevenue * commissionRate) / 100 : null;
  const currency = orders[0]?.totalPriceSet.shopMoney.currencyCode ?? 'USD';

  return (
    <div>
      <h2 className="text-lg font-semibold mb-6">My Orders</h2>

      {/* Summary cards */}
      {!loading && orders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Orders',     value: orders.length },
            { label: 'Paid Orders',      value: paidOrders.length },
            { label: 'Revenue Generated', value: `${currency} ${totalRevenue.toFixed(2)}` },
            { label: `My Commission${commissionRate != null ? ` (${commissionRate}%)` : ''}`,
              value: totalCommission != null ? `${currency} ${totalCommission.toFixed(2)}` : '—',
              highlight: true },
          ].map(card => (
            <div key={card.label}
                 className={`bg-white border rounded-xl p-4 ${card.highlight ? 'border-blue-200' : 'border-gray-200'}`}>
              <p className="text-xs text-gray-500 mb-1">{card.label}</p>
              <p className={`text-xl font-bold ${card.highlight ? 'text-blue-600' : 'text-gray-900'}`}>
                {card.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 text-center py-16">Loading orders…</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm mb-4">No orders yet.</p>
          <a href="/portal" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Create your first order
          </a>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Order</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Payment</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fulfillment</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                {commissionRate != null && (
                  <th className="text-right px-4 py-3 font-medium text-blue-600">My Commission</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map(order => {
                const amount    = parseFloat(order.totalPriceSet.shopMoney.amount);
                const commission = commissionRate != null ? (amount * commissionRate) / 100 : null;
                const isPaid    = order.displayFinancialStatus === 'PAID';
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{order.name}</td>
                    <td className="px-4 py-3 text-gray-500">{order.createdAt.substring(0, 10)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                        ${STATUS_COLORS[order.displayFinancialStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                        {order.displayFinancialStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                        ${STATUS_COLORS[order.displayFulfillmentStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                        {order.displayFulfillmentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {order.totalPriceSet.shopMoney.currencyCode} {amount.toFixed(2)}
                    </td>
                    {commission != null && (
                      <td className={`px-4 py-3 text-right font-semibold ${isPaid ? 'text-blue-600' : 'text-gray-400'}`}>
                        {isPaid ? `${order.totalPriceSet.shopMoney.currencyCode} ${commission.toFixed(2)}` : '—'}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

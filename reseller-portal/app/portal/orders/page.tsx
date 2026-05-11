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

interface Draft {
  id: string;
  name: string;
  createdAt: string;
  status: string;
  invoiceUrl: string;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  tags: string[];
}

const STATUS_COLORS: Record<string, string> = {
  PAID:           'bg-green-100 text-green-700',
  PENDING:        'bg-yellow-100 text-yellow-700',
  PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700',
  REFUNDED:       'bg-gray-100 text-gray-600',
  VOIDED:         'bg-gray-100 text-gray-500',
  AUTHORIZED:     'bg-blue-100 text-blue-700',
  FULFILLED:      'bg-green-100 text-green-700',
  UNFULFILLED:    'bg-orange-100 text-orange-700',
  IN_PROGRESS:    'bg-blue-100 text-blue-700',
  OPEN:           'bg-blue-100 text-blue-700',
  INVOICE_SENT:   'bg-blue-100 text-blue-700',
  COMPLETED:      'bg-green-100 text-green-700',
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default function OrdersPage() {
  const [orders, setOrders]   = useState<Order[]>([]);
  const [drafts, setDrafts]   = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [commissionRate, setCommissionRate] = useState<number | null>(null);
  const [tab, setTab] = useState<'pending' | 'paid'>('pending');

  useEffect(() => {
    fetch('/api/orders')
      .then(r => r.json())
      .then(data => {
        const orderList: Order[] = (data.orders ?? []).map((e: { node: Order }) => e.node);
        const draftList: Draft[] = (data.drafts ?? []).map((e: { node: Draft }) => e.node);
        setOrders(orderList);
        setDrafts(draftList);

        const rateTag = [...orderList, ...draftList][0]?.tags?.find((t: string) => t.startsWith('commission:'));
        if (rateTag) setCommissionRate(parseFloat(rateTag.replace('commission:', '').replace('pct', '')));
        setLoading(false);
      });
  }, []);

  const paidOrders   = orders.filter(o => o.displayFinancialStatus === 'PAID');
  const totalRevenue = paidOrders.reduce((s, o) => s + parseFloat(o.totalPriceSet.shopMoney.amount), 0);
  const totalCommission = commissionRate != null ? (totalRevenue * commissionRate) / 100 : null;

  const pendingValue = drafts.reduce((s, d) => s + parseFloat(d.totalPriceSet.shopMoney.amount), 0);
  const pendingCommission = commissionRate != null ? (pendingValue * commissionRate) / 100 : null;

  const currency = (drafts[0]?.totalPriceSet.shopMoney.currencyCode) ?? (orders[0]?.totalPriceSet.shopMoney.currencyCode) ?? 'USD';

  if (loading) {
    return <div className="text-sm text-gray-400 text-center py-16">Loading orders…</div>;
  }

  if (orders.length === 0 && drafts.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-sm mb-4">No orders yet.</p>
        <a href="/portal" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          Create your first order
        </a>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-6">My Orders</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Pending Payment</p>
          <p className="text-xl font-bold text-gray-900">{drafts.length}</p>
          <p className="text-xs text-gray-400 mt-1">{currency} {pendingValue.toFixed(2)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Paid Orders</p>
          <p className="text-xl font-bold text-gray-900">{paidOrders.length}</p>
          <p className="text-xs text-gray-400 mt-1">{currency} {totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Pending Commission</p>
          <p className="text-xl font-bold text-gray-400">
            {pendingCommission != null ? `${currency} ${pendingCommission.toFixed(2)}` : '—'}
          </p>
        </div>
        <div className="bg-white border border-blue-200 rounded-xl p-4">
          <p className="text-xs text-blue-600 mb-1">
            Earned Commission{commissionRate != null ? ` (${commissionRate}%)` : ''}
          </p>
          <p className="text-xl font-bold text-blue-600">
            {totalCommission != null ? `${currency} ${totalCommission.toFixed(2)}` : '—'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'pending'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Pending Payment ({drafts.length})
        </button>
        <button
          onClick={() => setTab('paid')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'paid'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Completed ({orders.length})
        </button>
      </div>

      {/* Pending tab */}
      {tab === 'pending' && (
        drafts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No pending payments. Create a new order to send a payment link.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Order</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-400">Potential Commission</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {drafts.map(d => {
                  const amount     = parseFloat(d.totalPriceSet.shopMoney.amount);
                  const commission = commissionRate != null ? (amount * commissionRate) / 100 : null;
                  return (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{d.name}</td>
                      <td className="px-4 py-3 text-gray-500">{d.createdAt.substring(0, 10)}</td>
                      <td className="px-4 py-3"><StatusPill status={d.status} /></td>
                      <td className="px-4 py-3 text-right font-medium">
                        {d.totalPriceSet.shopMoney.currencyCode} {amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">
                        {commission != null ? `${d.totalPriceSet.shopMoney.currencyCode} ${commission.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a href={d.invoiceUrl} target="_blank" rel="noreferrer"
                           className="text-xs text-blue-600 hover:underline">
                          Copy link
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Paid tab */}
      {tab === 'paid' && (
        orders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No completed orders yet.</p>
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
                  const amount     = parseFloat(order.totalPriceSet.shopMoney.amount);
                  const commission = commissionRate != null ? (amount * commissionRate) / 100 : null;
                  const isPaid     = order.displayFinancialStatus === 'PAID';
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{order.name}</td>
                      <td className="px-4 py-3 text-gray-500">{order.createdAt.substring(0, 10)}</td>
                      <td className="px-4 py-3"><StatusPill status={order.displayFinancialStatus} /></td>
                      <td className="px-4 py-3"><StatusPill status={order.displayFulfillmentStatus} /></td>
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
        )
      )}
    </div>
  );
}

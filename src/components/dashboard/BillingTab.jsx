import React, { useState } from 'react';
import { api } from '../../api';
import {
  Search, RefreshCw, Printer, Check, X, Eye,
  User, AlertCircle, Banknote, CreditCard, QrCode,
  Pencil, Trash2, UtensilsCrossed, Minus, Plus, Tag,
  SlidersHorizontal, ChefHat
} from 'lucide-react';

export default function BillingTab({
  billingOrders, historyOrders, billingSummary, tables,
  orderSearch, setOrderSearch, billingTableFilter, setBillingTableFilter,
  historyTab, setHistoryTab, handleOpenPrintBilling,
  handleSettleBillingOrder, handleUpdatePaymentStatus, fetchTabData, tabLoading,
}) {
  const [settlingOrder, setSettlingOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [viewingOrder, setViewingOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editedItems, setEditedItems] = useState([]);
  const [discountVal, setDiscountVal] = useState(0);
  const [adjustmentVal, setAdjustmentVal] = useState(0);

  const [internalTables, setInternalTables] = useState(() => Array.isArray(tables) ? tables : []);

  React.useEffect(() => {
    if (Array.isArray(tables) && tables.length > 0) {
      setInternalTables(tables);
    } else {
      api.tables.getTables()
        .then(res => { if (Array.isArray(res)) setInternalTables(res); })
        .catch(() => {});
    }
  }, [tables]);

  const allTableOptions = React.useMemo(() => {
    const namesSet = new Set();
    if (Array.isArray(internalTables)) {
      internalTables.forEach(t => { if (t && t.name) namesSet.add(t.name); });
    }
    if (Array.isArray(billingOrders)) {
      billingOrders.forEach(o => { if (o && o.tableName) namesSet.add(o.tableName); });
    }
    return Array.from(namesSet).sort();
  }, [internalTables, billingOrders]);

  React.useEffect(() => {
    if (editingOrder) {
      const sourceOrders = editingOrder.orders?.length ? editingOrder.orders : [editingOrder];
      setEditedItems(sourceOrders.flatMap(sourceOrder => (sourceOrder.items || []).map(item => ({
        ...item,
        sourceOrderId: String(sourceOrder._id),
        sourceOrderNumber: sourceOrder.orderNumber,
        sourceCreatedAt: sourceOrder.createdAt
      }))));
      setDiscountVal(editingOrder.discount || 0);
      setAdjustmentVal(editingOrder.adjustment || 0);
    }
  }, [editingOrder]);

  const filteredActiveOrders = billingOrders.filter(o => {
    const q = orderSearch.toLowerCase();
    const matchesSearch =
      o.tableName.toLowerCase().includes(q) ||
      (o.customerName && o.customerName.toLowerCase().includes(q)) ||
      (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
      (o.customerId?.name && o.customerId.name.toLowerCase().includes(q)) ||
      (o.customerId?.mobile && o.customerId.mobile.includes(q));
    const matchesTable = billingTableFilter ? o.tableName === billingTableFilter : true;
    return matchesSearch && matchesTable;
  });

  const billRequestedCount = filteredActiveOrders.filter(o => o.billRequested).length;

  const handleSettleConfirm = async () => {
    if (!settlingOrder) return;
    try {
      if (handleUpdatePaymentStatus) await handleUpdatePaymentStatus(settlingOrder._id, 'Paid');
      await handleSettleBillingOrder(settlingOrder._id);
      setSettlingOrder(null);
    } catch (err) {
      alert('Error settling: ' + err.message);
    }
  };

  if (tabLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-4 text-left animate-fadeIn">

      {/* ── Toolbar (Single row on mobile & desktop) ── */}
      <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 px-3 py-2.5 rounded-2xl shadow-xs">
        {/* Left: Table filter dropdown & optional search on desktop */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <select
            className="h-9 px-3 border border-slate-200 rounded-xl bg-white text-slate-800 font-bold text-xs outline-none focus:ring-2 focus:ring-[#003b1b]/20 focus:border-[#003b1b] max-w-[180px] sm:max-w-xs shrink-0 cursor-pointer"
            value={billingTableFilter}
            onChange={(e) => setBillingTableFilter(e.target.value)}
          >
            <option value="">All Tables</option>
            {allTableOptions.map(tName => <option key={tName} value={tName}>{tName}</option>)}
          </select>

          {/* Search bar: hidden on mobile, visible on desktop */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl w-60">
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              type="text"
              className="bg-transparent border-none outline-none w-full text-xs font-semibold text-slate-800 placeholder-slate-400"
              placeholder="Search table or order..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Right: Badges & Refresh Icon (No text, No fullscreen toggle) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {billRequestedCount > 0 && (
            <span
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-extrabold shadow-2xs"
              title={`${billRequestedCount} Bill Request(s)`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>{billRequestedCount}</span>
              <span className="hidden sm:inline font-semibold">Req</span>
            </span>
          )}

          {/* Active Count Badge: only number on mobile, text on desktop */}
          <span
            className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-xs font-extrabold"
            title={`${filteredActiveOrders.length} Active Orders`}
          >
            <span>{filteredActiveOrders.length}</span>
            <span className="hidden sm:inline font-semibold"> Active</span>
          </span>

          {/* Refresh Button: Icon only (No text) */}
          <button
            type="button"
            onClick={() => fetchTabData('billing')}
            className="h-9 w-9 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl flex items-center justify-center cursor-pointer transition-colors bg-white shadow-xs shrink-0"
            title="Refresh Orders"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Cards Grid ── */}
      {filteredActiveOrders.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <UtensilsCrossed className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-700 text-base">No active billing orders</p>
          <p className="text-slate-500 font-medium text-xs mt-1">Bill requests will appear here automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredActiveOrders.map((ord) => {
            const itemCount = ord.itemCount ?? (ord.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
            return (
              <article key={ord._id} className={`overflow-hidden rounded-2xl border bg-white shadow-xs transition hover:shadow-md ${ord.billRequested ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200/90'}`}>
                <div className={`flex items-center gap-3 border-b px-4 py-3 ${ord.billRequested ? 'border-amber-200 bg-amber-50/80' : 'border-slate-100 bg-slate-50/70'}`}>
                  <h2 className="truncate text-sm font-extrabold text-slate-900">{ord.tableName}</h2>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-800">{ord.customerName || ord.customerId?.name || 'Guest User'}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{itemCount} item{itemCount === 1 ? '' : 's'}</p>
                  </div>
                  <p className="shrink-0 text-xl font-black tracking-tight text-slate-950">{'\u20B9'}{Number(ord.totalAmount || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="flex gap-2 px-4 pb-4">
                  <button onClick={() => setViewingOrder(ord)} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50">
                    <Eye className="h-3.5 w-3.5" /> View bill
                  </button>
                  <button onClick={() => setSettlingOrder(ord)} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#003b1b] text-xs font-bold text-white shadow-xs transition hover:bg-[#166534]">
                    <Check className="h-3.5 w-3.5" /> Settle
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── SETTLE DIALOG ── */}
      {viewingOrder && (() => {
        const sourceOrders = viewingOrder.orders?.length ? viewingOrder.orders : [viewingOrder];
        return (
          <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Bill details</p>
                  <h2 className="mt-1 truncate text-lg font-extrabold text-slate-900">{viewingOrder.tableName}</h2>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">Customer: {viewingOrder.customerName || viewingOrder.customerId?.name || 'Guest User'}</p>
                  {viewingOrder.customerName !== 'Multiple guests' && (viewingOrder.customerMobile || viewingOrder.customerId?.mobile) && <p className="mt-0.5 text-xs text-slate-500">Phone: {viewingOrder.customerMobile || viewingOrder.customerId?.mobile}</p>}
                </div>
                <button onClick={() => setViewingOrder(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50" aria-label="Close bill details"><X className="h-4 w-4" /></button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4 sm:p-5">
                {sourceOrders.map((sourceOrder) => (
                  <section key={sourceOrder._id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-white px-4 py-3">
                      <div>
                        <p className="text-xs font-extrabold text-slate-800">Order #{sourceOrder.orderNumber || String(sourceOrder._id).slice(-6)}</p>
                      </div>
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{new Date(sourceOrder.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                    </div>
                    <div className="divide-y divide-slate-100 px-4">
                      {(sourceOrder.items || []).map((item, index) => (
                        <div key={`${sourceOrder._id}-${item._id || index}`} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-800">{item.name}{item.variantName ? ` (${item.variantName})` : ''}</p>
                            {item.specialInstructions && <p className="mt-0.5 truncate text-[10px] text-amber-700">{item.specialInstructions}</p>}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-bold text-slate-700">Qty: {item.quantity}</p>
                            <p className="text-[10px] text-slate-500">{'\u20B9'}{item.price} each</p>
                          </div>
                          <p className="w-20 shrink-0 text-right font-extrabold text-slate-900">{'\u20B9'}{item.price * item.quantity}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-2 text-[10px] font-semibold text-slate-500"><span>Order total</span><span className="text-slate-800">{'\u20B9'}{sourceOrder.totalAmount}</span></div>
                    {sourceOrder.specialInstructions && <p className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-[10px] text-amber-800">Note: {sourceOrder.specialInstructions}</p>}
                  </section>
                ))}
              </div>

              <div className="border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
                <div className="mb-4 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{'\u20B9'}{viewingOrder.subtotal}</span></div>
                  {viewingOrder.discount > 0 && <div className="flex justify-between text-rose-600"><span>Discount</span><span>-{'\u20B9'}{viewingOrder.discount}</span></div>}
                  {viewingOrder.adjustment !== 0 && <div className="flex justify-between text-indigo-600"><span>Adjustment</span><span>{viewingOrder.adjustment > 0 ? '+' : ''}{'\u20B9'}{viewingOrder.adjustment}</span></div>}
                  <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-extrabold text-slate-900"><span>Total bill</span><span>{'\u20B9'}{viewingOrder.totalAmount}</span></div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button onClick={() => { handleOpenPrintBilling(viewingOrder); setViewingOrder(null); }} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"><Printer className="h-3.5 w-3.5" /> Print</button>
                  <button onClick={() => { setEditingOrder(viewingOrder); setViewingOrder(null); }} className="inline-flex h-10 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"><Pencil className="h-3.5 w-3.5" /> Edit bill</button>
                  <button onClick={() => { setSettlingOrder(viewingOrder); setViewingOrder(null); }} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#003b1b] px-4 text-xs font-bold text-white transition hover:bg-[#166534]"><Check className="h-3.5 w-3.5" /> Settle</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {settlingOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-2xl p-5 relative text-left flex flex-col">
            <button onClick={() => setSettlingOrder(null)} className="absolute right-4 top-4 w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer">
              <X className="w-4 h-4" />
            </button>

            <div className="mb-4">
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full">Settle Invoice</span>
              <h2 className="text-base font-bold text-slate-800 mt-2">Checkout — {settlingOrder.tableName}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{settlingOrder.orderNumber} · Due: <span className="text-slate-800 font-semibold">₹{settlingOrder.totalAmount}</span></p>
            </div>

            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2">Payment Method</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[{ id: 'Cash', label: 'Cash', icon: Banknote }, { id: 'UPI', label: 'UPI / QR', icon: QrCode }, { id: 'Card', label: 'Card', icon: CreditCard }].map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" onClick={() => setPaymentMethod(id)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${paymentMethod === id ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px] font-medium">{label}</span>
                </button>
              ))}
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5 text-xs mb-4">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>₹{settlingOrder.subtotal ?? settlingOrder.totalAmount}</span></div>
              {settlingOrder.discount > 0 && <div className="flex justify-between text-rose-600"><span>Discount</span><span>-{'\u20B9'}{settlingOrder.discount}</span></div>}
              {settlingOrder.adjustment !== 0 && <div className="flex justify-between text-indigo-600"><span>Adjustment</span><span>{settlingOrder.adjustment > 0 ? '+' : ''}{'\u20B9'}{settlingOrder.adjustment}</span></div>}
              <div className="flex justify-between text-slate-900 font-bold pt-0.5"><span>Total</span><span className="text-base">₹{settlingOrder.totalAmount}</span></div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setSettlingOrder(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs cursor-pointer">Cancel</button>
              <button type="button" onClick={handleSettleConfirm} className="flex-1 py-2.5 bg-[#003b1b] hover:bg-[#166534] text-white font-semibold rounded-xl text-xs cursor-pointer">Confirm Settlement</button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT BILL DIALOG ── */}
      {editingOrder && (() => {
        const subtotal = editedItems.reduce((acc, it) => acc + it.price * it.quantity, 0);
        const afterDiscount = Math.max(0, subtotal - Number(discountVal || 0));
        const afterAdjustment = Math.max(0, afterDiscount + Number(adjustmentVal || 0));
        const totalAmount = afterAdjustment;

        const handleSaveBillEdits = async () => {
          if (editedItems.length === 0) { alert('Bill must have at least 1 item.'); return; }
          try {
            const sourceOrders = editingOrder.orders?.length ? editingOrder.orders : [editingOrder];
            const orderEdits = sourceOrders.map(sourceOrder => ({
              orderId: String(sourceOrder._id),
              items: editedItems
                .filter(item => item.sourceOrderId === String(sourceOrder._id))
                .map(({ sourceOrderId, sourceOrderNumber, sourceCreatedAt, ...item }) => item)
            }));
            await api.counter.updateGroupedOrder({
              tableName: editingOrder.tableName,
              orderIds: editingOrder.orderIds || sourceOrders.map(sourceOrder => sourceOrder._id),
              orders: orderEdits,
              discount: Number(discountVal) || 0,
              adjustment: Number(adjustmentVal) || 0
            });
            await fetchTabData('billing');
            setEditingOrder(null);
            setViewingOrder(null);
          } catch (err) { alert('Failed to save: ' + err.message); }
        };

        const updateQty = (idx, delta) => {
          const next = [...editedItems];
          const newQty = next[idx].quantity + delta;
          if (newQty <= 0) next.splice(idx, 1); else next[idx].quantity = newQty;
          setEditedItems(next);
        };

        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-5 relative text-left flex flex-col max-h-[90vh]">
              <button onClick={() => setEditingOrder(null)} className="absolute right-4 top-4 w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>

              <div className="mb-4">
                <span className="bg-indigo-50 text-indigo-600 border border-indigo-200 text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full">Edit Bill</span>
                <h2 className="text-base font-bold text-slate-800 mt-2">Modify — {editingOrder.tableName}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{editingOrder.orderNumber}</p>
              </div>

              <div className="mb-4 max-h-64 flex-1 space-y-3 overflow-y-auto rounded-xl">
                {(editingOrder.orders?.length ? editingOrder.orders : [editingOrder]).map(sourceOrder => (
                  <section key={sourceOrder._id} className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-[11px] font-bold text-slate-700">Order #{sourceOrder.orderNumber || String(sourceOrder._id).slice(-6)}</p>
                      <p className="mt-0.5 text-[9px] text-slate-500">{new Date(sourceOrder.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                    </div>
                    <div className="divide-y divide-slate-100 bg-white">
                      {editedItems.map((it, idx) => it.sourceOrderId !== String(sourceOrder._id) ? null : (
                        <div key={`${sourceOrder._id}-${it._id || idx}`} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                          <div className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-slate-700">{it.name}</span>
                            {it.variantName && <span className="text-[9px] text-orange-500">{it.variantName}</span>}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <div className="flex items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                              <button type="button" onClick={() => updateQty(idx, -1)} className="px-2 py-1.5 text-slate-500 hover:bg-slate-100"><Minus className="h-3 w-3" /></button>
                              <span className="px-2 text-[11px] font-semibold text-slate-800">{it.quantity}</span>
                              <button type="button" onClick={() => updateQty(idx, 1)} className="px-2 py-1.5 text-slate-500 hover:bg-slate-100"><Plus className="h-3 w-3" /></button>
                            </div>
                            <span className="w-14 text-right font-semibold text-slate-800">{'\u20B9'}{it.price * it.quantity}</span>
                            <button type="button" onClick={() => { const next = [...editedItems]; next.splice(idx, 1); setEditedItems(next); }} className="p-1 text-rose-400 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-[10px] font-medium text-slate-400 flex items-center gap-1 mb-1"><Tag className="w-3 h-3" /> Discount (₹)</label>
                  <input type="number" min="0" value={discountVal} onChange={(e) => setDiscountVal(Math.max(0, Number(e.target.value)))} className="w-full h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 outline-none" placeholder="0" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-400 mb-1 block">Adjustment (₹)</label>
                  <input type="number" value={adjustmentVal} onChange={(e) => setAdjustmentVal(Number(e.target.value))} className="w-full h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 outline-none" placeholder="0" />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5 text-xs mb-4">
                <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>₹{subtotal}</span></div>
                {Number(discountVal) > 0 && <div className="flex justify-between text-rose-500 font-medium"><span>Discount</span><span>-₹{discountVal}</span></div>}
                {Number(adjustmentVal) !== 0 && <div className="flex justify-between text-indigo-500 font-medium"><span>Adjustment</span><span>{Number(adjustmentVal) > 0 ? '+' : ''}₹{adjustmentVal}</span></div>}
                <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1.5"><span>New Total</span><span className="text-base">₹{totalAmount}</span></div>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setEditingOrder(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs cursor-pointer">Cancel</button>
                <button type="button" onClick={handleSaveBillEdits} className="flex-1 py-2.5 bg-[#003b1b] hover:bg-[#166534] text-white font-semibold rounded-xl text-xs cursor-pointer">Save Changes</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

import React, { useState } from 'react';
import { api } from '../../api';
import {
  Search, RefreshCw, Printer, Check, X,
  User, AlertCircle, Banknote, CreditCard, QrCode,
  Pencil, Trash2, UtensilsCrossed, Minus, Plus, Tag,
  SlidersHorizontal, Maximize2, ChefHat
} from 'lucide-react';

export default function BillingTab({
  billingOrders, historyOrders, billingSummary, tables,
  orderSearch, setOrderSearch, billingTableFilter, setBillingTableFilter,
  historyTab, setHistoryTab, handleOpenPrintBilling,
  handleSettleBillingOrder, handleUpdatePaymentStatus, fetchTabData, tabLoading,
}) {
  const [settlingOrder, setSettlingOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [editingOrder, setEditingOrder] = useState(null);
  const [editedItems, setEditedItems] = useState([]);
  const [discountVal, setDiscountVal] = useState(0);
  const [adjustmentVal, setAdjustmentVal] = useState(0);

  React.useEffect(() => {
    if (editingOrder) {
      setEditedItems(editingOrder.items.map(it => ({ ...it })));
      setDiscountVal(editingOrder.discount || 0);
      setAdjustmentVal(editingOrder.adjustment || 0);
    }
  }, [editingOrder]);

  const filteredActiveOrders = billingOrders.filter(o => {
    const q = orderSearch.toLowerCase();
    const matchesSearch =
      o.tableName.toLowerCase().includes(q) ||
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

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap gap-2.5 items-center justify-between bg-white border border-slate-200 px-3.5 py-3 rounded-2xl shadow-sm">
        <div className="flex flex-wrap gap-2 items-center flex-1">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl w-60">
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              type="text"
              className="bg-transparent border-none outline-none w-full text-xs font-semibold text-slate-800 placeholder-slate-400"
              placeholder="Search table or order..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
            />
          </div>
          <select
            className="h-9 px-3 border border-slate-200 rounded-xl bg-white text-slate-800 font-bold text-xs outline-none focus:ring-2 focus:ring-[#003b1b]/20 focus:border-[#003b1b]"
            value={billingTableFilter}
            onChange={(e) => setBillingTableFilter(e.target.value)}
          >
            <option value="">All Tables</option>
            {tables.map(t => <option key={t._id} value={t.name}>{t.name}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {billRequestedCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-bold shadow-xs">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              {billRequestedCount} Bill Req
            </span>
          )}
          <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-xs font-bold">
            {filteredActiveOrders.length} Active
          </span>
          <button
            onClick={() => fetchTabData('billing')}
            className="h-9 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors bg-white shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); }}
            className="h-9 w-9 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl flex items-center justify-center cursor-pointer transition-colors bg-white shadow-xs"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
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
            const billRequested = ord.billRequested;
            const totalItems = ord.items.reduce((s, i) => s + i.quantity, 0);
            return (
              <div
                key={ord._id}
                className={`bg-white rounded-2xl border flex flex-col transition-all shadow-xs hover:shadow-md ${
                  billRequested
                    ? 'border-amber-300 ring-2 ring-amber-200/60'
                    : 'border-slate-200/90'
                }`}
              >
                {/* ── Card Top Bar ── */}
                <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-t-2xl border-b ${
                  billRequested ? 'bg-amber-50/80 border-amber-200' : 'bg-slate-50 border-slate-200/80'
                }`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-extrabold text-slate-900 text-sm truncate">{ord.tableName}</span>
                    {ord.placedBy === 'waiter' && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-black rounded uppercase shrink-0">Waiter</span>
                    )}
                  </div>
                  {billRequested ? (
                    <span className="flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0">
                      <AlertCircle className="w-3 h-3 text-amber-700" /> Bill Req
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">{ord.status}</span>
                  )}
                </div>

                {/* ── Card Body ── */}
                <div className="px-3.5 py-2.5 flex-1 flex flex-col gap-2.5">

                  {/* Order # + Customer inline */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-600 font-extrabold font-mono">{ord.orderNumber}</span>
                    <span className="text-xs text-slate-700 font-semibold truncate max-w-[130px]">
                      {ord.customerId ? `👤 ${ord.customerId.name || 'Guest'}` : '👤 Anonymous'}
                    </span>
                  </div>

                  {/* Items list — compact */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200/80 divide-y divide-slate-100 max-h-32 overflow-y-auto">
                    {ord.items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between px-2.5 py-1.5 text-xs">
                        <span className="text-slate-800 font-bold truncate max-w-[55%]">
                          {it.name}
                          {it.variantName && <span className="text-amber-600 ml-1 text-[10px]">({it.variantName})</span>}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-slate-500 font-bold">×{it.quantity}</span>
                          <span className="font-extrabold text-slate-900">₹{it.price * it.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Special instructions */}
                  {ord.specialInstructions && (
                    <div className="bg-amber-50 border border-amber-200/80 rounded-xl px-2.5 py-1.5 text-xs text-amber-800 italic font-medium">
                      📝 {ord.specialInstructions}
                    </div>
                  )}

                  {/* Total + items count */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                    <span className="text-xs text-slate-500 font-bold">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
                    <span className="font-black text-base text-slate-950">₹{ord.totalAmount}</span>
                  </div>
                </div>

                {/* ── Card Actions ── */}
                <div className="px-3.5 pb-3.5 flex gap-2">
                  <button
                    onClick={() => handleOpenPrintBilling(ord)}
                    className="h-8 flex-1 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print
                  </button>
                  <button
                    onClick={() => setEditingOrder(ord)}
                    className="h-8 flex-1 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => setSettlingOrder(ord)}
                    className="h-8 flex-1 rounded-xl bg-[#003b1b] hover:bg-[#166534] text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" /> Settle
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── SETTLE DIALOG ── */}
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
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>₹{settlingOrder.subtotal || Math.round(settlingOrder.totalAmount / 1.05)}</span></div>
              <div className="flex justify-between text-slate-500 border-b border-slate-200 pb-1.5"><span>Tax (5% GST)</span><span>₹{settlingOrder.taxAmount || Math.round(settlingOrder.totalAmount - settlingOrder.totalAmount / 1.05)}</span></div>
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
        const taxAmount = Math.round(afterAdjustment * 0.05);
        const totalAmount = afterAdjustment + taxAmount;

        const handleSaveBillEdits = async () => {
          if (editedItems.length === 0) { alert('Bill must have at least 1 item.'); return; }
          try {
            await api.orders.updateOrder(editingOrder._id, { items: editedItems, subtotal, taxAmount, totalAmount });
            fetchTabData('billing');
            setEditingOrder(null);
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

              <div className="flex-1 overflow-y-auto mb-4 divide-y divide-slate-100 max-h-52 border border-slate-100 rounded-xl">
                {editedItems.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center px-3 py-2 text-xs">
                    <div className="max-w-[40%]">
                      <span className="font-medium text-slate-700 block truncate">{it.name}</span>
                      {it.variantName && <span className="text-[9px] text-orange-500">{it.variantName}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                        <button type="button" onClick={() => updateQty(idx, -1)} className="px-2 py-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer"><Minus className="w-3 h-3" /></button>
                        <span className="px-2 font-semibold text-slate-800 text-[11px]">{it.quantity}</span>
                        <button type="button" onClick={() => updateQty(idx, 1)} className="px-2 py-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer"><Plus className="w-3 h-3" /></button>
                      </div>
                      <span className="font-semibold text-slate-800 w-14 text-right">₹{it.price * it.quantity}</span>
                      <button type="button" onClick={() => { const n = [...editedItems]; n.splice(idx, 1); setEditedItems(n); }} className="text-rose-400 hover:text-rose-600 cursor-pointer p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
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
                <div className="flex justify-between text-slate-500"><span>Tax (5% GST)</span><span>₹{taxAmount}</span></div>
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

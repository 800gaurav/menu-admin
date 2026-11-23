import React from 'react';
import { X, Printer } from 'lucide-react';

export default function BillPrint({ order, onClose, restaurant }) {
  const handlePrint = () => {
    window.print();
  };

  const sourceOrders = Array.isArray(order.orders) && order.orders.length ? order.orders : [order];
  const receiptItems = sourceOrders.flatMap(sourceOrder => sourceOrder.items || []);
  const itemSubtotal = receiptItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
  const subtotal = Number.isFinite(order.subtotal) ? order.subtotal : itemSubtotal;
  const total = Math.max(0, subtotal - (Number(order.discount) || 0) + (Number(order.adjustment) || 0));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col max-h-[90vh] text-left">
        {/* Actions header (hidden during printing) */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
          <span className="font-extrabold text-xs text-slate-800">Print Preview</span>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center justify-center cursor-pointer shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="flex-grow p-6 overflow-y-auto print-container" id="printable-receipt">
          {/* Thermal Receipt styling */}
          <div className="border border-slate-200 p-6 bg-slate-50/20 rounded-xl space-y-4 font-mono text-xs text-slate-800 shadow-inner select-text">
            {/* Receipt heading and table details */}
            <div className="text-center border-b border-dashed border-slate-300 pb-4">
              <h1 className="text-lg font-black text-slate-900">{restaurant?.name || order.restaurantName || 'Restaurant'}</h1>
              <p className="mt-2 text-[10px] text-slate-500">Customer: <span className="font-bold text-slate-800">{order.customerName || order.customerId?.name || 'Guest Diner'}</span></p>
              <p className="mt-0.5 text-[10px] text-slate-500">Table: <span className="font-bold text-slate-800">{order.tableName}</span></p>
            </div>

            {/* All dishes from the table bill, without internal order metadata */}
            <div className="border-b border-dashed border-slate-300 pb-3 space-y-2.5">
              {receiptItems.map((it, index) => (
                <div key={it._id || index} className="space-y-0.5">
                  <div className="flex justify-between gap-2 font-bold text-slate-800">
                    <span>{it.name}{it.variantName ? ` (${it.variantName})` : ''}</span>
                    <span className="shrink-0">{'\u20B9'}{it.price * it.quantity}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{it.quantity} x {'\u20B9'}{it.price}</span>
                  </div>
                  {it.specialInstructions && <p className="text-[9px] text-amber-600 font-medium italic">* Inst: {it.specialInstructions}</p>}
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3 text-slate-500 font-medium text-[10px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="text-slate-800 font-bold">₹{subtotal}</span>
              </div>
              {order.discount > 0 && <div className="flex justify-between"><span>Discount:</span><span className="text-slate-800 font-bold">-{'\u20B9'}{order.discount}</span></div>}
              {order.adjustment !== 0 && <div className="flex justify-between"><span>Adjustment:</span><span className="text-slate-800 font-bold">{order.adjustment > 0 ? '+' : ''}{'\u20B9'}{order.adjustment}</span></div>}
            </div>

            {/* Grand Total */}
            <div className="flex justify-between font-black text-slate-900 text-sm pt-1">
              <span>GRAND TOTAL:</span>
              <span>₹{total}</span>
            </div>

            {/* Footer */}
            <div className="text-center pt-3 text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
              <p>Thank you for dining with us!</p>
            
            </div>
          </div>
        </div>

        {/* Footer print action (hidden during print) */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 bg-slate-50/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 h-11 border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl bg-white shadow-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow cursor-pointer inline-flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
        </div>
      </div>

      {/* Embedded CSS style for printing only */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            border: none;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

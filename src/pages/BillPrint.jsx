import React from 'react';
import { X, Printer } from 'lucide-react';

export default function BillPrint({ order, onClose }) {
  const handlePrint = () => {
    window.print();
  };

  const subtotal = order.subtotal || Math.round(order.totalAmount / 1.05);
  const taxAmount = order.taxAmount || (order.totalAmount - subtotal);
  const total = order.totalAmount;

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
            {/* Header */}
            <div className="text-center border-b border-dashed border-slate-300 pb-4">
         
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">{order.tableName} CHECK</p>
              <p className="text-[10px] text-slate-400 mt-1">Invoice: {order.orderNumber}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Date: {new Date(order.createdAt).toLocaleString()}</p>
            </div>

            {/* Meta */}
            <div className="text-[10px] space-y-1 text-slate-500 border-b border-dashed border-slate-300 pb-3">
              <div className="flex justify-between">
                <span>Table Target:</span>
                <span className="font-bold text-slate-800">{order.tableName}</span>
              </div>
              <div className="flex justify-between">
                <span>Source:</span>
                <span className="font-bold text-slate-800 capitalize">{order.placedBy || 'customer'}</span>
              </div>

              {order.placedBy === 'waiter' ? (
                <div className="flex justify-between">
                  <span>Server / Waiter:</span>
                  <span className="font-bold text-slate-800">{order.waiterId?.name || 'Staff Waiter'}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span className="font-bold text-slate-800">{order.customerId?.name || 'Guest Diner'}</span>
                  </div>
                  {order.customerId?.mobile && (
                    <div className="flex justify-between">
                      <span>Mobile Contact:</span>
                      <span className="font-bold text-slate-800 font-mono">{order.customerId.mobile}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Items */}
            <div className="border-b border-dashed border-slate-300 pb-3 space-y-2.5">
              {order.items.map((it, index) => (
                <div key={index} className="space-y-0.5">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>{it.name}</span>
                    <span>₹{it.price * it.quantity}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{it.quantity} x ₹{it.price}</span>
                  </div>
                  {it.specialInstructions && (
                    <p className="text-[9px] text-amber-600 font-medium italic">
                      * Inst: {it.specialInstructions}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3 text-slate-500 font-medium text-[10px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="text-slate-800 font-bold">₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>GST Tax (5%):</span>
                <span className="text-slate-800 font-bold">₹{taxAmount}</span>
              </div>
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

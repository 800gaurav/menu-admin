import { useState } from 'react';
import {
  CheckCircle2, ChevronRight, Clock, CreditCard,
  Plus, Receipt, UtensilsCrossed
} from 'lucide-react';

export default function CounterOverviewTab({
  stats = {}, restaurant = {}, billingOrders = [], orders = [],
  onNavigate, onOpenTakeOrder, onOpenMenu
}) {
  const [isOrderModePickerOpen, setIsOrderModePickerOpen] = useState(false);
  const [isChangingOrderMode, setIsChangingOrderMode] = useState(false);
  const orderModeStorageKey = `counter_order_mode_${restaurant?._id || restaurant?.slug || restaurant?.name || 'default'}`;
  const [savedOrderMode, setSavedOrderMode] = useState(() => {
    try {
      const mode = window.localStorage.getItem(orderModeStorageKey);
      return mode === 'direct' || mode === 'kitchen' ? mode : null;
    } catch {
      return null;
    }
  });
  const openNewOrder = () => {
    if (savedOrderMode) {
      onOpenTakeOrder?.(savedOrderMode);
      return;
    }
    setIsChangingOrderMode(false);
    setIsOrderModePickerOpen(true);
  };
  const openOrderModeSettings = () => {
    setIsChangingOrderMode(true);
    setIsOrderModePickerOpen(true);
  };
  const selectOrderMode = (mode) => {
    setSavedOrderMode(mode);
    try {
      window.localStorage.setItem(orderModeStorageKey, mode);
    } catch {
      // Keep the selection for this session if browser storage is unavailable.
    }
    setIsOrderModePickerOpen(false);
    if (!isChangingOrderMode) onOpenTakeOrder?.(mode);
  };
  const liveOrdersCount = orders.filter(order => !['Served', 'Completed', 'Cancelled'].includes(order.status)).length;
  const billRequestedCount = billingOrders.filter(order => order.billRequested).length;
  const activeBillingCount = billingOrders.length;
  const todayRevenue = stats.todayRevenue || 0;
  const todayOrdersCount = stats.todayOrdersCount || 0;

  return (
    <div className="space-y-4 text-left animate-fadeIn sm:space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-700/60 bg-gradient-to-r from-slate-900 via-slate-800 to-[#003b1b] p-4 text-white shadow-md sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-black tracking-tight sm:text-2xl">Counter &amp; Cashier Terminal</h1>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-300">Cashier Mode</span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-300 sm:text-sm">{restaurant?.name || 'Restaurant'} · Take dine-in &amp; takeaway orders, track kitchen tickets, and settle invoices.</p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:gap-2.5">
          <button type="button" onClick={openNewOrder} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-extrabold text-white shadow-lg transition hover:bg-emerald-500 active:scale-[.98] sm:h-11 sm:px-4 sm:text-sm">
            <Plus className="h-4 w-4 stroke-[2.5]" /> New Order
          </button>
          <button type="button" onClick={onOpenMenu} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-extrabold text-white transition hover:bg-white/20 active:scale-[.98] sm:h-11 sm:px-4 sm:text-sm">
            <UtensilsCrossed className="h-4 w-4" /> Manage Menu
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Default order flow</p>
          <p className="mt-0.5 text-xs font-bold text-slate-800">
            {savedOrderMode === 'direct' ? 'Direct to Settle · skips kitchen' : savedOrderMode === 'kitchen' ? 'Kitchen + Live Orders · sends to kitchen' : 'Choose once before taking your first order'}
          </p>
        </div>
        <button type="button" onClick={openOrderModeSettings} className="h-9 shrink-0 rounded-lg border border-slate-200 px-3 text-xs font-extrabold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800">
          {savedOrderMode ? 'Change order flow' : 'Choose order flow'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <button type="button" onClick={openNewOrder} className="group flex min-h-[112px] cursor-pointer flex-col justify-between rounded-2xl border-2 border-emerald-600/30 bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-600 hover:shadow-md sm:p-4">
          <span className="flex w-full items-start justify-between gap-2"><span><span className="block text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 sm:text-[11px]">Counter POS</span><span className="mt-1 block text-base font-black text-slate-900 sm:text-xl">+ New Order</span></span><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition group-hover:bg-[#003b1b] group-hover:text-white sm:h-9 sm:w-9"><Plus className="h-4 w-4 sm:h-5 sm:w-5" /></span></span>
          <span className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-700 sm:text-[11px]">Tap to start order <ChevronRight className="h-3 w-3" /></span>
        </button>

        <button type="button" onClick={() => onNavigate?.('orders')} className="flex min-h-[112px] cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-4">
          <span className="flex w-full items-start justify-between gap-2"><span><span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 sm:text-[11px]">Live Kitchen</span><span className="mt-1 block text-xl font-black text-slate-900 sm:text-2xl">{liveOrdersCount}</span></span><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 sm:h-9 sm:w-9"><UtensilsCrossed className="h-4 w-4 sm:h-5 sm:w-5" /></span></span>
          <span className="mt-2 flex items-center justify-between text-[10px] font-bold text-slate-500 sm:text-[11px]"><span>Orders not yet served</span><ChevronRight className="h-3 w-3 text-slate-400" /></span>
        </button>

        <button type="button" onClick={() => onNavigate?.('billing')} className={`flex min-h-[112px] cursor-pointer flex-col justify-between rounded-2xl border bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-4 ${billRequestedCount > 0 ? 'border-amber-300 ring-2 ring-amber-200/60' : 'border-slate-200'}`}>
          <span className="flex w-full items-start justify-between gap-2"><span><span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 sm:text-[11px]">Unsettled Tables</span><span className="mt-1 block text-xl font-black text-slate-900 sm:text-2xl">{activeBillingCount}</span></span><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700 sm:h-9 sm:w-9"><CreditCard className="h-4 w-4 sm:h-5 sm:w-5" /></span></span>
          <span className="mt-2 flex items-center justify-between text-[10px] font-bold text-slate-500 sm:text-[11px]"><span>{billRequestedCount > 0 ? `${billRequestedCount} bill requests!` : 'Waiting payment'}</span><ChevronRight className="h-3 w-3 text-slate-400" /></span>
        </button>

        <button type="button" onClick={() => onNavigate?.('history')} className="flex min-h-[112px] cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-4">
          <span className="flex w-full items-start justify-between gap-2"><span><span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 sm:text-[11px]">Today's Sales</span><span className="mt-1 block text-xl font-black text-emerald-950 sm:text-2xl">₹{todayRevenue.toLocaleString('en-IN')}</span></span><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 sm:h-9 sm:w-9"><Receipt className="h-4 w-4 sm:h-5 sm:w-5" /></span></span>
          <span className="mt-2 flex items-center justify-between text-[10px] font-bold text-slate-500 sm:text-[11px]"><span>{todayOrdersCount} invoices settled</span><ChevronRight className="h-3 w-3 text-slate-400" /></span>
        </button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2"><Clock className="h-4 w-4 shrink-0 text-slate-500" /><h2 className="text-xs font-black text-slate-900 sm:text-sm">Active Tables Awaiting Cashier Settlement</h2><span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{activeBillingCount} tables</span></div>
          <button type="button" onClick={() => onNavigate?.('billing')} className="flex shrink-0 items-center gap-1 text-xs font-bold text-emerald-700 hover:underline">Open Settle Panel <ChevronRight className="h-3 w-3" /></button>
        </div>

        {billingOrders.length === 0 ? (
          <div className="space-y-2 px-4 py-10 text-center sm:py-12"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" /><p className="text-xs font-bold text-slate-700">All tables are clear and settled!</p><p className="text-[11px] text-slate-400">When served orders request bill or finish dining, they appear here.</p></div>
        ) : (
          <div className="divide-y divide-slate-100">
            {billingOrders.slice(0, 6).map(order => (
              <div key={order._id || order.tableName} className="flex flex-col gap-2.5 px-4 py-3 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-xs font-black text-slate-800">{order.tableName || 'Walk-in'}</span>
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="truncate text-xs font-extrabold text-slate-900 sm:text-sm">{order.tableName || 'Walk-in'}</span>{order.billRequested && <span className="animate-pulse rounded border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-800">Bill Req</span>}</div><span className="mt-0.5 block truncate text-[10px] font-medium text-slate-400 sm:text-[10.5px]">{order.itemCount || (order.items || []).length} items · {order.customerName || 'Guest User'}</span></div>
                </div>
                <div className="flex items-center justify-between gap-3 pl-12 sm:justify-end sm:pl-0"><span className="text-xs font-black text-slate-900 sm:text-sm">₹{order.totalAmount || 0}</span><button type="button" onClick={() => onNavigate?.('billing')} className="h-8 rounded-xl bg-[#003b1b] px-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#166534]">Settle Bill</button></div>
              </div>
            ))}
          </div>
        )}
      </section>

      {isOrderModePickerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={() => setIsOrderModePickerOpen(false)}>
          <section className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl sm:p-6" onClick={event => event.stopPropagation()}>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-700">Counter order</p>
            <h2 className="mt-1 text-lg font-black text-slate-900 sm:text-xl">{isChangingOrderMode ? 'Change the default order flow' : 'Choose the default order flow'}</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{isChangingOrderMode ? 'This setting will apply to new counter orders until it is changed again.' : 'Choose once. New orders will use this flow automatically until you change it.'}</p>
            <div className="mt-5 space-y-3">
              <button type="button" onClick={() => selectOrderMode('kitchen')} className="flex w-full items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-left transition hover:border-emerald-400 hover:bg-emerald-50">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-700 text-white"><UtensilsCrossed size={20} /></span>
                <span><span className="block text-sm font-extrabold text-slate-900">Kitchen + Live Orders</span><span className="mt-0.5 block text-[11px] leading-relaxed text-slate-600">Send to kitchen and keep it in the live order list until served.</span></span>
                <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-emerald-800" />
              </button>
              <button type="button" onClick={() => selectOrderMode('direct')} className="flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-left transition hover:border-amber-400 hover:bg-amber-50">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500 text-white"><CreditCard size={20} /></span>
                <span><span className="block text-sm font-extrabold text-slate-900">Direct to Settle</span><span className="mt-0.5 block text-[11px] leading-relaxed text-slate-600">Skip kitchen and add this order straight to the settle bills list.</span></span>
                <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-amber-800" />
              </button>
            </div>
            <button type="button" onClick={() => setIsOrderModePickerOpen(false)} className="mt-4 h-10 w-full rounded-xl border border-slate-200 text-xs font-bold text-slate-600 transition hover:bg-slate-50">{isChangingOrderMode ? 'Keep current flow' : 'Cancel'}</button>
          </section>
        </div>
      )}
    </div>
  );
}

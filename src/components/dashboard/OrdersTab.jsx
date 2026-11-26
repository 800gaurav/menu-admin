import React, { useState } from 'react';
import { Search, LayoutGrid, List, Eye, Trash2, AlertTriangle, X, User, ShoppingBag, Receipt, Volume2, VolumeX, Bell } from 'lucide-react';

export default function OrdersTab({
  orders,
  orderSearch,
  setOrderSearch,
  orderStatusFilter,
  setOrderStatusFilter,
  handleUpdateOrderStatus,
  setSelectedOrder,
  setIsOrderModalOpen,
  tabLoading,
  api,
  soundEnabled = true,
  toggleSound
}) {
  const [selectedViewOrder, setSelectedViewOrder] = useState(null);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'table'
  const [historyData, setHistoryData] = useState({ orders: [], totalCount: 0, totalPages: 1 });
  const [historyPage, setHistoryPage] = useState(1);
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistoryOrders = async () => {
    try {
      setHistoryLoading(true);
      const params = {
        status: 'Completed',
        pagination: 'true',
        page: historyPage,
        limit: 10,
        startDate: historyStartDate || undefined,
        endDate: historyEndDate || undefined,
        table: orderSearch || undefined
      };
      const res = await api.orders.getOrders(params);
      setHistoryData({
        orders: Array.isArray(res) ? res : res.orders || [],
        totalCount: res.totalCount || 0,
        totalPages: res.totalPages || 1
      });
    } catch (err) {
      console.error('Failed to fetch history orders:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  React.useEffect(() => {
    if (viewMode === 'table') {
      fetchHistoryOrders();
    }
  }, [viewMode, historyPage, historyStartDate, historyEndDate, orderSearch]);

  const [selectedTableFilter, setSelectedTableFilter] = useState('');
  const [mobileTab, setMobileTab] = useState('New'); // 'New' | 'Preparing' | 'Ready' | 'Completed'

  const handleDragStart = (e, orderId) => {
    e.dataTransfer.setData('text/plain', orderId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('text/plain');
    if (!orderId) return;
    try {
      await handleUpdateOrderStatus(orderId, targetStatus);
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const [orderToDelete, setOrderToDelete] = useState(null);

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    try {
      await api.orders.deleteOrder(orderToDelete._id);
      setOrderToDelete(null);
    } catch (err) {
      alert('Failed to delete order: ' + err.message);
    }
  };

  const handleRejectOrder = async (orderId) => {
    try {
      await api.orders.deleteOrder(orderId);
      setSelectedViewOrder(null);
    } catch (err) {
      alert('Failed to reject order: ' + err.message);
    }
  };

  const uniqueTables = React.useMemo(() => {
    return [...new Set(orders.map(o => o.tableName))].filter(Boolean).sort();
  }, [orders]);

  // Status Filtering Logic
  const getFilteredOrders = () => {
    return orders.filter(o => {
      const matchesSearch = o.tableName.toLowerCase().includes(orderSearch.toLowerCase()) || 
        (o.orderNumber && o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase())) ||
        (o.customerId?.name && o.customerId.name.toLowerCase().includes(orderSearch.toLowerCase())) ||
        (o.customerName && o.customerName.toLowerCase().includes(orderSearch.toLowerCase())) ||
        (o.customerId?.mobile && o.customerId.mobile.includes(orderSearch)) ||
        (o.customerMobile && o.customerMobile.includes(orderSearch));
      
      const matchesTable = !selectedTableFilter || o.tableName === selectedTableFilter;

      let matchesStatus = true;
      if (viewMode === 'table') {
        if (orderStatusFilter === 'Pending') {
          matchesStatus = !['Completed', 'Cancelled'].includes(o.status);
        } else if (orderStatusFilter) {
          matchesStatus = o.status === orderStatusFilter;
        }
      }
      return matchesSearch && matchesTable && matchesStatus;
    });
  };

  const filtered = getFilteredOrders();

  // Helper to format item description string
  const formatItemsSummary = (items) => {
    return items.map(it => `${it.name} (x${it.quantity})`).join(', ');
  };

  // Status styling class mapper
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'New': return 'bg-amber-50 text-amber-800 border border-amber-200/90 font-bold';
      case 'Accepted': return 'bg-blue-50 text-blue-800 border border-blue-200/90 font-bold';
      case 'Preparing': return 'bg-indigo-50 text-indigo-800 border border-indigo-200/90 font-bold';
      case 'Ready': return 'bg-emerald-50 text-emerald-800 border border-emerald-200/90 font-bold';
      case 'Served': return 'bg-teal-50 text-teal-800 border border-teal-200/90 font-bold';
      case 'Completed': return 'bg-slate-100 text-slate-800 border border-slate-200 font-bold';
      case 'Cancelled': return 'bg-rose-50 text-rose-800 border border-rose-200 font-bold';
      default: return 'bg-slate-100 text-slate-800 border border-slate-200 font-bold';
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col animate-fadeIn text-xs text-left">
      {tabLoading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#003b1b] mx-auto"></div>
        </div>
      ) : (
        <>
          {/* Controls & Filter Bar (Clean Table Filter and Sound toggle in one row on mobile) */}
          <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between bg-white px-3 sm:px-4 py-2 rounded-2xl border border-slate-200 shadow-sm text-xs mb-2 shrink-0">
            {/* Table filter & Mobile Sound toggle */}
            <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-0">
                <span className="text-slate-600 font-extrabold shrink-0 text-xs">Table:</span>
                <select 
                  className="h-9 px-3 border border-slate-200 rounded-xl bg-white outline-none font-bold text-slate-800 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 text-xs cursor-pointer w-full sm:w-44"
                  value={selectedTableFilter}
                  onChange={(e) => setSelectedTableFilter(e.target.value)}
                >
                  <option value="">All Tables</option>
                  {uniqueTables.map(tName => (
                    <option key={tName} value={tName}>{tName}</option>
                  ))}
                </select>
              </div>

              {/* Sound Notification Alert Toggle Button (Visible on Mobile right next to Table filter) */}
              {toggleSound && (
                <button
                  type="button"
                  onClick={toggleSound}
                  className={`sm:hidden h-9 px-2.5 rounded-xl border flex items-center gap-1.5 font-bold text-xs cursor-pointer transition-all shrink-0 shadow-2xs ${
                    soundEnabled
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                      : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                  }`}
                  title={soundEnabled ? 'Live Order Sound Alert is ON - Click to Mute' : 'Live Order Sound Alert is MUTED - Click to Enable'}
                >
                  {soundEnabled ? (
                    <>
                      <Volume2 className="w-4 h-4 text-emerald-600 animate-pulse shrink-0" />
                      <span className="text-emerald-900 font-black">Sound: ON</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Sound: OFF</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Right side: Desktop Sound Toggle & History date filters */}
            <div className={`flex items-center gap-2.5 justify-between sm:justify-end w-full sm:w-auto ${viewMode !== 'table' ? 'hidden sm:flex' : 'flex'}`}>
              {viewMode === 'table' && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600 font-bold shrink-0">Start:</span>
                    <input 
                      type="date" 
                      className="h-9 px-2.5 border border-slate-200 rounded-xl bg-white outline-none font-bold text-slate-800 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                      value={historyStartDate}
                      onChange={(e) => {
                        setHistoryStartDate(e.target.value);
                        setHistoryPage(1);
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600 font-bold shrink-0">End:</span>
                    <input 
                      type="date" 
                      className="h-9 px-2.5 border border-slate-200 rounded-xl bg-white outline-none font-bold text-slate-800 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                      value={historyEndDate}
                      onChange={(e) => {
                        setHistoryEndDate(e.target.value);
                        setHistoryPage(1);
                      }}
                    />
                  </div>
                  {(historyStartDate || historyEndDate) && (
                    <button
                      onClick={() => {
                        setHistoryStartDate('');
                        setHistoryEndDate('');
                        setHistoryPage(1);
                      }}
                      className="text-red-600 font-bold hover:text-red-700 ml-1.5 cursor-pointer text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {/* Sound Notification Alert Toggle Button (Visible on Desktop) */}
              {toggleSound && (
                <button
                  type="button"
                  onClick={toggleSound}
                  className={`hidden sm:flex h-9 px-3 rounded-xl border items-center gap-1.5 font-bold text-xs cursor-pointer transition-all shadow-2xs ${
                    soundEnabled
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                      : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                  }`}
                  title={soundEnabled ? 'Live Order Sound Alert is ON - Click to Mute' : 'Live Order Sound Alert is MUTED - Click to Enable'}
                >
                  {soundEnabled ? (
                    <>
                      <Volume2 className="w-4 h-4 text-emerald-600 animate-pulse shrink-0" />
                      <span className="text-emerald-900 font-black">Sound: ON</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Sound: OFF</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {viewMode === 'kanban' ? (
            <div className="flex-1 min-h-0 flex flex-col">
              {/* ── Mobile Column Switcher (Visible only on mobile screens < 768px, like Kitchen Panel) ── */}
              <div className="md:hidden bg-white border border-slate-200 rounded-2xl p-2 flex items-center gap-1.5 shadow-sm overflow-x-auto hide-scrollbar mb-2 shrink-0">
                {[
                  { id: 'New', label: 'New', count: filtered.filter(o => o.status === 'New').length, color: 'amber' },
                  { id: 'Preparing', label: 'Preparing', count: filtered.filter(o => ['Accepted', 'Preparing'].includes(o.status)).length, color: 'blue' },
                  { id: 'Ready', label: 'Ready', count: filtered.filter(o => o.status === 'Ready').length, color: 'emerald' },
                  { id: 'Completed', label: 'Served', count: filtered.filter(o => o.status === 'Served').length, color: 'slate' }
                ].map(col => {
                  const isSelected = mobileTab === col.id;
                  return (
                    <button
                      key={col.id}
                      onClick={() => setMobileTab(col.id)}
                      className={`flex-1 min-w-[75px] py-2 px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        isSelected
                          ? col.id === 'New'
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                            : col.id === 'Preparing'
                              ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                              : col.id === 'Ready'
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                : 'bg-slate-800 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <span className="truncate">{col.label}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        isSelected ? 'bg-black/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {col.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Orders Kanban Grid View (Desktop: 4 columns | Mobile: active tab column) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 sm:gap-3 items-stretch flex-1 min-h-0">
                {[
                  {
                    id: 'New',
                    label: 'New Orders',
                    statusList: ['New'],
                    headerClass: 'text-amber-800 bg-amber-50/55 border-amber-200'
                  },
                  {
                    id: 'Preparing',
                    label: 'Preparing',
                    statusList: ['Accepted', 'Preparing'],
                    headerClass: 'text-indigo-800 bg-indigo-50/55 border-indigo-200'
                  },
                  {
                    id: 'Ready',
                    label: 'Ready to Serve',
                    statusList: ['Ready'],
                    headerClass: 'text-emerald-800 bg-emerald-50/55 border-emerald-200'
                  },
                  {
                    id: 'Completed',
                    label: 'Served / Unpaid',
                    statusList: ['Served'],
                    headerClass: 'text-slate-700 bg-slate-50 border-slate-200'
                  }
                ].map(col => {
                  const isVisibleOnMobile = mobileTab === col.id;
                  return (
                    <div 
                      key={col.id} 
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, col.id === 'Preparing' ? 'Accepted' : col.id === 'Ready' ? 'Ready' : col.id)}
                      className={`bg-slate-50/50 border border-slate-200 rounded-2xl flex flex-col h-full min-h-0 transition-all hover:bg-slate-50/80 overflow-hidden ${
                        isVisibleOnMobile ? 'flex' : 'hidden md:flex'
                      }`}
                    >
                  {(() => {
                    const colOrders = filtered.filter(o => col.statusList.includes(o.status));

                    return (
                      <>
                        {/* Column Header */}
                        <div className={`px-3 py-2.5 rounded-t-2xl border-b font-extrabold text-xs uppercase tracking-wider flex items-center justify-between shrink-0 ${col.headerClass}`}>
                          <span>{col.label}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white border border-slate-200 text-slate-800 font-black shadow-xs">
                            {colOrders.length}
                          </span>
                        </div>

                        {/* Cards container */}
                        <div className="p-2 sm:p-2.5 space-y-2.5 flex-1 min-h-0 overflow-y-auto">
                          {colOrders.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 font-bold text-xs">
                              No orders
                            </div>
                          ) : (
                            colOrders.map(ord => {
                          const isNew = ord.status === 'New';
                          const isAccepted = ord.status === 'Accepted';
                          const isPreparing = ord.status === 'Preparing';
                          const elapsedMins = Math.floor((new Date() - new Date(ord.createdAt)) / 60000);
                          const timeString = elapsedMins < 1 ? 'Just now' : `${elapsedMins}m ago`;
                          const totalItems = ord.items.reduce((sum, it) => sum + it.quantity, 0);

                          const isRush = ord.priority === 'Rush';
                          const isHigh = ord.priority === 'High';
                          const topBarClass = isRush
                            ? 'bg-rose-500'
                            : isHigh
                            ? 'bg-amber-400'
                            : isNew
                            ? 'bg-amber-400'
                            : col.id === 'Preparing'
                            ? 'bg-indigo-500'
                            : col.id === 'Ready'
                            ? 'bg-emerald-500'
                            : 'bg-slate-300';

                          return (
                            <div
                              key={ord._id}
                              draggable="true"
                              onDragStart={(e) => handleDragStart(e, ord._id)}
                              className={`bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden cursor-grab active:cursor-grabbing ${isRush ? 'animate-[pulse_3s_infinite]' : ''}`}
                            >
                              {/* Colored top bar */}
                              <div className={`h-1.5 w-full ${topBarClass}`} />

                              {/* Card Body */}
                              <div className="p-3 flex flex-col gap-2.5">
                                {/* Row 1: Table + time + waiter badge */}
                                <div className="flex items-center justify-between gap-1">
                                  <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-black text-[10px] uppercase tracking-wide border border-slate-200">
                                    {ord.tableName}
                                  </span>
                                  <div className="flex items-center gap-1.5 ml-auto">
                                    {ord.placedBy === 'waiter' && (
                                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-black uppercase">
                                        <User className="w-2.5 h-2.5 shrink-0" />Waiter
                                      </span>
                                    )}
                                    <span className="text-[10.5px] text-slate-500 font-bold">{timeString}</span>
                                  </div>
                                </div>

                                {/* Row 2: Order# + customer + items badge inline */}
                                <div className="flex items-center justify-between gap-1">
                                  <div className="min-w-0">
                                    <span className="font-extrabold text-slate-900 text-xs block leading-tight">{ord.orderNumber}</span>
                                    <span className="text-xs text-slate-600 font-semibold truncate block max-w-[130px]">
                                      {ord.customerId?.name || ord.customerName || (typeof ord.customerId === 'object' && ord.customerId?.name) || 'Guest User'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg shrink-0 text-[10px] font-bold text-slate-700">
                                    <ShoppingBag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                    {totalItems}
                                  </div>
                                </div>

                                {/* Row 3: Total + action buttons */}
                                <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 gap-2">
                                  <span className="font-black text-slate-900 text-sm shrink-0">₹{ord.totalAmount}</span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setSelectedViewOrder(ord)}
                                      className="h-8 w-12 sm:w-9 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer transition-colors shrink-0 shadow-2xs"
                                      title="View Details"
                                    >
                                      <Eye className="w-4 h-4 shrink-0" />
                                    </button>
                                    {isNew && (
                                      <button
                                        onClick={() => handleUpdateOrderStatus(ord._id, 'Accepted')}
                                        className="h-8 px-6 sm:px-4 min-w-[115px] sm:min-w-[76px] bg-[#003b1b] hover:bg-[#166534] text-white font-extrabold rounded-xl cursor-pointer text-xs uppercase tracking-wide transition-colors shadow-xs shrink-0 flex items-center justify-center"
                                      >Accept</button>
                                    )}
                                    {(isAccepted || isPreparing) && (
                                      <button
                                        onClick={() => handleUpdateOrderStatus(ord._id, 'Ready')}
                                        className="h-8 px-6 sm:px-4 min-w-[115px] sm:min-w-[76px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl cursor-pointer text-xs uppercase tracking-wide transition-colors shadow-xs shrink-0 flex items-center justify-center"
                                      >Ready</button>
                                    )}
                                    {ord.status === 'Ready' && (
                                      <button
                                        onClick={() => handleUpdateOrderStatus(ord._id, 'Served')}
                                        className="h-8 px-6 sm:px-4 min-w-[115px] sm:min-w-[76px] bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-xl cursor-pointer text-xs uppercase tracking-wide transition-colors shadow-xs shrink-0 flex items-center justify-center"
                                      >Serve</button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                );
              })()}
              </div>
            );
          })}
        </div>
      </div>
    ) : (
            /* Orders Table view (History View) */
            <div className="space-y-4 flex-1 min-h-0 overflow-y-auto">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {historyLoading ? (
                  <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#003b1b] mx-auto"></div>
                    <p className="text-slate-400 text-xs mt-3 font-semibold">Loading overall history...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs font-semibold text-slate-700">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-extrabold uppercase text-[9px] tracking-wider">
                          <th className="p-3">Order ID</th>
                          <th className="p-3">Table</th>
                          <th className="p-3">Customer details</th>
                          <th className="p-3">Items Summary</th>
                          <th className="p-3">Total Amount</th>
                          <th className="p-3 text-center">Status</th>
                          <th className="p-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {historyData.orders.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="p-8 text-center text-slate-400 font-bold">
                              No completed orders found in history.
                            </td>
                          </tr>
                        ) : (
                          historyData.orders.map((ord) => {
                            return (
                              <tr key={ord._id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3">
                                  <span className="font-extrabold text-slate-800 text-[11px] block">{ord.orderNumber}</span>
                                  <span className="text-[9px] text-slate-400 block mt-0.5 font-bold">
                                    {new Date(ord.createdAt).toLocaleString()}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-extrabold text-[10px]">
                                    {ord.tableName}
                                  </span>
                                </td>
                                <td className="p-3">
                                  {(ord.customerId?.name || ord.customerName) ? (
                                    <div>
                                      <span className="text-slate-800 font-bold block">{ord.customerId?.name || ord.customerName}</span>
                                      <span className="text-[9px] text-slate-400 block mt-0.5">{ord.customerId?.mobile || ord.customerMobile || ''}</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 font-bold">Guest User</span>
                                  )}
                                </td>
                                <td className="p-3 max-w-xs truncate text-[11px] text-slate-600 font-semibold" title={formatItemsSummary(ord.items)}>
                                  {formatItemsSummary(ord.items)}
                                </td>
                                <td className="p-3">
                                  <span className="font-black text-slate-800 text-sm">₹{ord.totalAmount}</span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded-full text-[9px] font-extrabold uppercase">
                                    {ord.status}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center justify-center">
                                    {/* Open Details modal action */}
                                    <button 
                                      onClick={() => setSelectedViewOrder(ord)}
                                      className="h-7 w-7 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                                      title="View Details"
                                    >
                                      <Eye className="w-3.5 h-3.5 shrink-0" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {historyData.totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-slate-500 text-xs font-bold">
                    Showing page <span className="text-slate-800">{historyData.currentPage}</span> of <span className="text-slate-800">{historyData.totalPages}</span> ({historyData.totalCount} total orders)
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                      disabled={historyPage === 1}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 font-bold text-slate-600 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-all"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setHistoryPage(p => Math.min(historyData.totalPages, p + 1))}
                      disabled={historyPage === historyData.totalPages}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 font-bold text-slate-600 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-all"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* DETAILED ORDER MODAL */}
      {selectedViewOrder && (
        <div 
          onClick={() => setSelectedViewOrder(null)}
          className="fixed inset-0 bg-slate-900/60 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-[2px]"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden animate-slideUp sm:animate-none"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-200 shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-sm sm:text-base">{selectedViewOrder.orderNumber}</span>
                    <span className="bg-slate-200/80 text-slate-800 px-2.5 py-0.5 rounded-lg font-black text-[10px] uppercase">{selectedViewOrder.tableName}</span>
                    {selectedViewOrder.placedBy === 'waiter' && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-orange-100 text-orange-800 text-[9px] font-black uppercase">
                        <User className="w-2.5 h-2.5 shrink-0" />Waiter
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold block mt-0.5">
                    {new Date(selectedViewOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(selectedViewOrder.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border shadow-xs ${getStatusBadgeClass(selectedViewOrder.status)}`}>
                  {selectedViewOrder.status}
                </span>
                <button 
                  onClick={() => setSelectedViewOrder(null)} 
                  className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center cursor-pointer text-slate-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body — Responsive layout (Column on Mobile, Row on Desktop) */}
            <div className="flex flex-col sm:flex-row flex-1 overflow-y-auto">

              {/* LEFT: Items list */}
              <div className="flex-1 flex flex-col border-b sm:border-b-0 sm:border-r border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 shrink-0">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Order Items</span>
                </div>
                <div className="overflow-y-auto px-4 py-3 divide-y divide-slate-100">
                  {selectedViewOrder.items.map((it, idx) => (
                    <div key={idx} className="py-2.5 first:pt-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-slate-900 text-xs sm:text-sm">{it.name}</span>
                            <span className="text-[10px] text-slate-600 font-black bg-slate-100 px-2 py-0.5 rounded-md">×{it.quantity}</span>
                            {it.variantName && (
                              <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded text-[9px] font-extrabold">
                                {it.variantName}
                              </span>
                            )}
                          </div>
                          {it.addons?.length > 0 && (
                            <div className="mt-1 pl-2.5 border-l-2 border-slate-300 space-y-0.5">
                              {it.addons.map((add, i) => (
                                <span key={i} className="block text-[10px] text-slate-500 font-semibold">• {add.name} (+₹{add.price})</span>
                              ))}
                            </div>
                          )}
                          {it.specialInstructions && (
                            <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 font-semibold mt-1">
                              <strong>Note:</strong> {it.specialInstructions}
                            </p>
                          )}
                        </div>
                        <span className="font-black text-slate-900 text-xs sm:text-sm shrink-0">₹{it.price * it.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total row */}
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 shrink-0 mt-auto">
                  {selectedViewOrder.specialInstructions && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-[10px] text-amber-800 font-semibold mb-2">
                      <strong>Kitchen Note:</strong> {selectedViewOrder.specialInstructions}
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wide">Total Amount</span>
                    <span className="text-base sm:text-lg font-black text-slate-900">₹{selectedViewOrder.totalAmount}</span>
                  </div>
                </div>
              </div>

              {/* RIGHT: Customer + Timeline + Actions */}
              <div className="w-full sm:w-64 shrink-0 flex flex-col bg-white">

                {/* Customer info */}
                <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 shrink-0">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Customer</span>
                </div>
                <div className="px-4 py-3 border-b border-slate-200 shrink-0 bg-slate-50/30">
                  {(selectedViewOrder.customerId?.name || selectedViewOrder.customerName) ? (
                    <>
                      <span className="block font-black text-slate-900 text-xs sm:text-sm">{selectedViewOrder.customerId?.name || selectedViewOrder.customerName}</span>
                      <span className="block text-[11px] text-slate-500 font-bold mt-0.5">{selectedViewOrder.customerId?.mobile || selectedViewOrder.customerMobile || ''}</span>
                    </>
                  ) : (
                    <span className="font-bold text-slate-500 text-xs">Guest User</span>
                  )}
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 font-bold">Priority:</span>
                    <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider">
                      {selectedViewOrder.priority || 'Normal'}
                    </span>
                  </div>
                </div>

                {/* Timeline */}
                <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 shrink-0">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Timeline</span>
                </div>
                <div className="max-h-36 sm:max-h-48 overflow-y-auto px-4 py-2.5">
                  {(selectedViewOrder.statusTimeline || []).length === 0 ? (
                    <span className="text-[10px] text-slate-400 font-bold">No timeline updates yet</span>
                  ) : (
                    <div className="space-y-2">
                      {(selectedViewOrder.statusTimeline || []).map((tl, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                          <div>
                            <span className="block text-[10px] font-black text-slate-800 uppercase">{tl.status}</span>
                            <span className="block text-[9px] text-slate-500 font-semibold">
                              {new Date(tl.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="p-3 border-t border-slate-200 shrink-0 space-y-2 bg-slate-50/50 mt-auto">
                  <button
                    onClick={() => { setSelectedOrder(selectedViewOrder); setIsOrderModalOpen(true); setSelectedViewOrder(null); }}
                    className="w-full h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-extrabold cursor-pointer flex items-center justify-center gap-1.5 text-xs shadow-2xs transition-colors"
                  >
                    <Receipt className="w-3.5 h-3.5 shrink-0" /> Print / View Invoice
                  </button>

                  {selectedViewOrder.status === 'New' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRejectOrder(selectedViewOrder._id)}
                        className="flex-1 h-9 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 font-extrabold rounded-xl cursor-pointer text-xs transition-colors"
                      >Reject</button>
                      <button
                        onClick={() => { handleUpdateOrderStatus(selectedViewOrder._id, 'Accepted'); setSelectedViewOrder(prev => ({ ...prev, status: 'Accepted' })); }}
                        className="flex-1 h-9 bg-[#003b1b] hover:bg-[#166534] text-white font-extrabold rounded-xl cursor-pointer text-xs transition-colors shadow-xs"
                      >Accept</button>
                    </div>
                  )}
                  {(selectedViewOrder.status === 'Accepted' || selectedViewOrder.status === 'Preparing') && (
                    <button
                      onClick={() => { handleUpdateOrderStatus(selectedViewOrder._id, 'Ready'); setSelectedViewOrder(prev => ({ ...prev, status: 'Ready' })); }}
                      className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl cursor-pointer text-xs transition-colors shadow-xs"
                    >Mark Ready</button>
                  )}
                  {selectedViewOrder.status === 'Ready' && (
                    <button
                      onClick={() => { handleUpdateOrderStatus(selectedViewOrder._id, 'Served'); setSelectedViewOrder(prev => ({ ...prev, status: 'Served' })); }}
                      className="w-full h-9 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-xl cursor-pointer text-xs transition-colors shadow-xs"
                    >Serve Order</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {orderToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-[95] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 relative flex flex-col text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4 animate-[bounce_1.5s_infinite]">
              <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-2">Delete Order</h3>
            <p className="text-xs text-slate-500 font-semibold mb-6">
              Are you sure you want to delete order <span className="font-bold text-slate-800">{orderToDelete.orderNumber}</span>? This action is permanent and cannot be undone.
            </p>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setOrderToDelete(null)}
                className="flex-1 h-10 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOrder}
                className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

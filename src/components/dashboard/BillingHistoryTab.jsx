import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, 
  Calendar, 
  X, 
  Printer, 
  Receipt, 
  Download, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Filter,
  TrendingUp
} from 'lucide-react';
import { api } from '../../api';

// Helper: Format Date to YYYY-MM-DD
function formatDateToYMD(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Format Date & Time in Indian Standard Time (IST)
function formatIndianDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

function formatIndianTimeOnly(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export default function BillingHistoryTab({
  tables = [],
  handleOpenPrintBilling
}) {
  // Pagination & Data States
  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [statusTab, setStatusTab] = useState('all'); // 'all' | 'completed' | 'cancelled'
  const [datePreset, setDatePreset] = useState('all'); // 'all' | 'today' | 'yesterday' | '7days' | 'month' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Debounce search input (350ms) to avoid unnecessary backend queries while typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Compute start/end dates from preset
  const getDateRangeParams = useCallback(() => {
    const now = new Date();
    if (datePreset === 'today') {
      const todayStr = formatDateToYMD(now);
      return { startDate: todayStr, endDate: todayStr };
    }
    if (datePreset === 'yesterday') {
      const yest = new Date();
      yest.setDate(now.getDate() - 1);
      const yestStr = formatDateToYMD(yest);
      return { startDate: yestStr, endDate: yestStr };
    }
    if (datePreset === '7days') {
      const d7 = new Date();
      d7.setDate(now.getDate() - 7);
      return { startDate: formatDateToYMD(d7), endDate: formatDateToYMD(now) };
    }
    if (datePreset === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: formatDateToYMD(monthStart), endDate: formatDateToYMD(now) };
    }
    if (datePreset === 'custom') {
      return { startDate: startDate || '', endDate: endDate || '' };
    }
    return { startDate: '', endDate: '' };
  }, [datePreset, startDate, endDate]);

  // Status mapping to backend query (Only Completed / Paid or Cancelled)
  const getStatusParam = useCallback((tab) => {
    if (tab === 'completed') return 'Completed';
    if (tab === 'cancelled') return 'Cancelled';
    return '';
  }, []);

  // Fetch orders directly from backend with pagination and filters
  const fetchOrders = useCallback(async (pageToLoad = 1) => {
    setLoading(true);
    try {
      const { startDate: sDate, endDate: eDate } = getDateRangeParams();
      const statusParam = getStatusParam(statusTab);

      const params = {
        pagination: 'true',
        history: 'true',
        page: pageToLoad,
        limit: pageSize
      };

      if (statusParam) params.status = statusParam;
      if (tableFilter) params.table = tableFilter;
      if (debouncedSearch) params.search = debouncedSearch;
      if (sDate) params.startDate = sDate;
      if (eDate) params.endDate = eDate;

      const res = await api.orders.getOrders(params);

      if (res && res.orders) {
        // Ensure the most recently settled table is at the top
        const sorted = [...res.orders].sort((a, b) => {
          const tA = new Date(a.completedAt || a.updatedAt || a.createdAt).getTime();
          const tB = new Date(b.completedAt || b.updatedAt || b.createdAt).getTime();
          return tB - tA;
        });
        setOrders(sorted);
        setTotalCount(res.totalCount || 0);
        setTotalPages(res.totalPages || 1);
        setCurrentPage(res.currentPage || pageToLoad);
        setTotalRevenue(res.totalRevenue !== undefined ? res.totalRevenue : 0);
      } else if (Array.isArray(res)) {
        const sorted = [...res].sort((a, b) => {
          const tA = new Date(a.completedAt || a.updatedAt || a.createdAt).getTime();
          const tB = new Date(b.completedAt || b.updatedAt || b.createdAt).getTime();
          return tB - tA;
        });
        setOrders(sorted);
        setTotalCount(sorted.length);
        setTotalPages(1);
        setCurrentPage(1);
        const sum = sorted.filter(o => o.status !== 'Cancelled').reduce((acc, o) => acc + (o.totalAmount || 0), 0);
        setTotalRevenue(sum);
      } else {
        setOrders([]);
        setTotalCount(0);
        setTotalPages(1);
        setCurrentPage(1);
        setTotalRevenue(0);
      }
    } catch (err) {
      console.error('Failed to fetch billing history orders:', err);
      setOrders([]);
      setTotalCount(0);
      setTotalPages(1);
      setTotalRevenue(0);
    } finally {
      setLoading(false);
    }
  }, [pageSize, statusTab, tableFilter, debouncedSearch, getDateRangeParams, getStatusParam]);

  // Whenever filters change, reset to Page 1 and fetch
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchOrders(1);
      return;
    }
    setCurrentPage(1);
    fetchOrders(1);
  }, [debouncedSearch, tableFilter, statusTab, datePreset, startDate, endDate, pageSize]);

  // Handle explicit page changes
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    fetchOrders(newPage);
  };

  // CSV Export URL with active filters
  const getExportUrl = () => {
    const { startDate: sDate, endDate: eDate } = getDateRangeParams();
    const statusParam = getStatusParam(statusTab);
    return api.orders.exportCsvUrl({
      history: 'true',
      status: statusParam,
      table: tableFilter,
      search: debouncedSearch,
      startDate: sDate,
      endDate: eDate
    });
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setTableFilter('');
    setStatusTab('all');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const startRecord = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header Top Bar */}
      <header className="flex items-center justify-between gap-2 bg-white px-3 sm:px-5 py-2.5 sm:py-3.5 rounded-2xl border border-slate-200 shadow-xs">
        {/* Title */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shrink-0">
            <Receipt className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-black text-slate-900 tracking-tight truncate">
              Order History
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400 font-medium hidden sm:block">
              Search and audit completed or settled invoices.
            </p>
          </div>
        </div>

        {/* Right side: Total Sales / Revenue Badge + Action Buttons in one row */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Total Sales Badge */}
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/90 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-2xs">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 hidden xs:block shrink-0" />
            <div>
              <span className="text-[8.5px] sm:text-[9.5px] text-emerald-700 font-extrabold uppercase tracking-wider block leading-tight">
                Sales
              </span>
              <span className="text-xs sm:text-sm font-black text-emerald-950 leading-tight block">
                ₹{Number(totalRevenue || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchOrders(currentPage)}
            disabled={loading}
            className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh current page"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Refresh</span>
          </button>
          
          {/* Export CSV Button */}
          <a
            href={getExportUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 px-2.5 sm:h-9 sm:px-3.5 flex items-center justify-center gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] sm:text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-300" />
            <span>Export CSV</span>
          </a>
        </div>
      </header>

      {/* Filter & Controls Card */}
      <div className="bg-white p-2.5 sm:p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2 sm:space-y-2.5">
        <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 sm:gap-2.5 items-center">
          {/* Search Input (Full width on mobile, 5 cols on desktop) */}
          <div className="col-span-2 sm:col-span-6 lg:col-span-5 flex items-center bg-slate-50 px-2.5 py-1.5 sm:py-2 rounded-xl border border-slate-200 focus-within:border-emerald-600 focus-within:bg-white transition-all shadow-2xs">
            <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              className="bg-transparent border-none outline-none focus:ring-0 w-full text-xs font-semibold text-slate-800 placeholder-slate-400"
              placeholder="Search table, order #, or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button 
                onClick={() => setSearch('')} 
                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          {/* Table / Room Filter (1 col on mobile, 3 cols on desktop) */}
          <div className="col-span-1 sm:col-span-3">
            <select
              className="h-8 sm:h-9 w-full px-2.5 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-[11px] sm:text-xs outline-none focus:ring-2 focus:ring-[#003b1b]/20 focus:border-[#003b1b] cursor-pointer transition-colors"
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
            >
              <option value="">All Tables</option>
              {tables.map(tOption => (
                <option key={tOption._id} value={tOption.name}>{tOption.name}</option>
              ))}
            </select>
          </div>

          {/* Date Filter Preset Dropdown (1 col on mobile, 3/4 cols on desktop) */}
          <div className="col-span-1 sm:col-span-3 lg:col-span-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              </div>
              <select
                className="h-8 sm:h-9 w-full pl-7 pr-2.5 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-[11px] sm:text-xs outline-none focus:ring-2 focus:ring-[#003b1b]/20 focus:border-[#003b1b] cursor-pointer transition-colors truncate"
                value={datePreset}
                onChange={(e) => {
                  const val = e.target.value;
                  setDatePreset(val);
                  if (val !== 'custom') {
                    setStartDate('');
                    setEndDate('');
                  }
                }}
              >
                <option value="all">Date: All Time</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="7days">Last 7 Days</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Date...</option>
              </select>
            </div>
          </div>
        </div>

        {/* Custom Date Range Picker (Only visible when Custom is active) */}
        {(datePreset === 'custom' || startDate || endDate) && (
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-50/70 p-2 sm:p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-600 shrink-0 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" /> Range:
            </span>
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="h-7 sm:h-8 px-2 rounded-lg border border-slate-200 bg-white text-[11px] sm:text-xs font-semibold text-slate-800 outline-none focus:border-emerald-600 shadow-2xs flex-1 sm:flex-initial"
                placeholder="From Date"
              />
              <span className="text-slate-400 font-bold text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="h-7 sm:h-8 px-2 rounded-lg border border-slate-200 bg-white text-[11px] sm:text-xs font-semibold text-slate-800 outline-none focus:border-emerald-600 shadow-2xs flex-1 sm:flex-initial"
                placeholder="To Date"
              />
            </div>
            {(startDate || endDate || datePreset !== 'all') && (
              <button
                onClick={() => {
                  setDatePreset('all');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-[10px] sm:text-[11px] text-rose-600 font-bold hover:underline cursor-pointer flex items-center gap-1 sm:ml-auto"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Historical Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Subheader with Status Pills & Count */}
        <div className="px-3 sm:px-5 py-2 sm:py-2.5 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Receipt className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">Invoices</span>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 bg-slate-200/70 px-1.5 py-0.2 rounded-full shrink-0">
              {totalCount}
            </span>
          </div>

          {/* Status Subtabs (Only Settled / Paid or Cancelled) */}
          <div className="flex gap-0.5 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold shrink-0">
            {[
              { id: 'all', label: 'All' },
              { id: 'completed', label: 'Settled' },
              { id: 'cancelled', label: 'Cancelled' }
            ].map(subTab => (
              <button
                key={subTab.id}
                onClick={() => setStatusTab(subTab.id)}
                className={`px-2 sm:px-2.5 py-1 rounded-md cursor-pointer transition-colors font-bold ${
                  statusTab === subTab.id
                    ? 'bg-[#003b1b] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {subTab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-12 px-4">
            <div className="space-y-3 max-w-4xl mx-auto">
              {[...Array(6)].map((_, idx) => (
                <div key={idx} className="h-10 bg-slate-100/80 rounded-xl animate-pulse flex items-center px-4 gap-4">
                  <div className="h-4 bg-slate-200 rounded w-24"></div>
                  <div className="h-4 bg-slate-200 rounded w-32"></div>
                  <div className="h-4 bg-slate-200 rounded w-48 hidden sm:block"></div>
                  <div className="h-4 bg-slate-200 rounded w-16 ml-auto"></div>
                </div>
              ))}
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 px-6 space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Filter className="w-6 h-6" />
            </div>
            <p className="text-slate-500 font-bold text-xs sm:text-sm">No matching history orders found for the selected filters.</p>
            {(datePreset !== 'all' || tableFilter || debouncedSearch || statusTab !== 'all') && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10.5px] tracking-wider">
                <tr>
                  <th className="p-3.5 pl-5">Table / Room</th>
                  <th className="p-3.5">Settled Date & Time (IST)</th>
                  <th className="p-3.5">Customer Details</th>
                  <th className="p-3.5">Items Summary</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Payment</th>
                  <th className="p-3.5">Total Amount</th>
                  <th className="p-3.5 pr-5 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {orders.map((ord) => (
                  <tr key={ord._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 pl-5 font-bold text-slate-900">
                      <span>{ord.tableName}</span>
                      <span className="text-[10px] text-slate-500 block font-bold font-mono mt-0.5">{ord.orderNumber}</span>
                      {ord.servedBy && (
                        <span className="text-[9.5px] text-indigo-700 font-bold block mt-0.5 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/60 w-max">
                          Served by: {ord.servedBy}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-700 font-semibold text-[11px] whitespace-nowrap">
                      <span className="block text-slate-900 font-bold">
                        {formatIndianDateTime(ord.completedAt || ord.updatedAt || ord.createdAt)}
                      </span>
                      {ord.createdAt && ord.completedAt && (
                        <span className="text-[10px] text-slate-400 block font-medium">
                          Ordered: {formatIndianTimeOnly(ord.createdAt)}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      {ord.customerId ? (
                        <div>
                          <span className="text-slate-900 font-bold block">{ord.customerId?.name || 'N/A'}</span>
                          <span className="text-[10.5px] text-slate-500 font-medium block mt-0.5">{ord.customerId?.mobile || ''}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-bold">Guest Diner</span>
                      )}
                    </td>
                    <td className="p-3.5 max-w-xs truncate text-[11px] text-slate-700 font-medium">
                      {ord.items && ord.items.map(i => `${i.name}${i.variantName ? ` (${i.variantName})` : ''} (x${i.quantity})`).join(', ')}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        ord.status === 'Completed' || ord.paymentStatus === 'Paid'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {ord.status === 'Completed' ? 'Settled' : ord.status}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        ord.paymentStatus === 'Paid'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        {ord.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="p-3.5 font-black text-slate-900 text-sm whitespace-nowrap">
                      ₹{ord.totalAmount}
                    </td>
                    <td className="p-3.5 pr-5 text-right">
                      <button
                        onClick={() => handleOpenPrintBilling && handleOpenPrintBilling(ord)}
                        className="h-8 w-8 rounded-xl border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700 cursor-pointer shadow-xs ml-auto transition-colors"
                        title="Print Receipt"
                      >
                        <Printer className="w-4 h-4 text-slate-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination Bar */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-semibold">
          {/* Summary / Range Info */}
          <div className="flex items-center gap-3">
            <span>
              Showing <span className="font-bold text-slate-900">{startRecord}</span> to <span className="font-bold text-slate-900">{endRecord}</span> of <span className="font-bold text-slate-900">{totalCount}</span> orders
            </span>
            <div className="hidden xs:flex items-center gap-1.5 pl-3 border-l border-slate-200">
              <span className="text-[11px] text-slate-500 font-bold">per page:</span>
              <select
                className="h-7 px-2 border border-slate-200 rounded-lg bg-white text-slate-800 font-bold text-xs outline-none focus:border-emerald-600 cursor-pointer"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Page Navigation Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage <= 1 || loading}
              className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs transition-colors"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Indicator */}
            <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 shadow-2xs">
              Page <span className="text-emerald-700 font-black">{currentPage}</span> / {totalPages}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage >= totalPages || loading}
              className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs transition-colors"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
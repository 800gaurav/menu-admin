import React, { useState, useMemo } from 'react';
import {
  Banknote, Coins, Award, ExternalLink, UtensilsCrossed,
  TrendingUp, Activity, Clock, Table2, QrCode, Rss,
  BarChart2, ShoppingBag, CheckCircle2, AlertCircle,
  ArrowUpRight, ArrowDownRight, Users, ChevronRight,
  Filter, Calendar, Flame, ChefHat, Sparkles
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

// Register Chart.js modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

export default function OverviewTab({ stats = {}, restaurant = {}, historyOrders = [], onNavigate }) {
  const [chartMetric, setChartMetric] = useState('revenue'); // 'revenue' | 'orders'
  const [timeFilter, setTimeFilter] = useState('7days'); // '7days' | '30days'

  const todayRevenue = stats.todayRevenue || 0;
  const todayOrdersCount = stats.todayOrdersCount || 0;
  const lastWeekRevenue = stats.lastWeekRevenue || 0;
  const monthlyRevenue = stats.monthlyRevenue || 0;
  const activeOrdersCount = stats.activeOrdersCount || 0;
  const totalTables = stats.totalTables || 0;
  const lifetimeRevenue = stats.lifetimeRevenue || 0;
  const lifetimeOrdersCount = stats.lifetimeOrdersCount || 0;

  // Order status breakdown for Doughnut chart
  const orderStatusCounts = useMemo(() => {
    const counts = { Served: 0, Ready: 0, Cooking: 0, New: 0, Cancelled: 0 };
    historyOrders.forEach(o => {
      const s = o.status || 'New';
      if (counts[s] !== undefined) counts[s]++;
      else counts.New++;
    });
    return counts;
  }, [historyOrders]);

  // Top selling items
  const topItems = useMemo(() => {
    const itemCounts = {};
    historyOrders.forEach(order => {
      if (order.status !== 'Cancelled' && order.items) {
        order.items.forEach(it => {
          itemCounts[it.name] = (itemCounts[it.name] || 0) + (it.quantity || 1);
        });
      }
    });
    return Object.entries(itemCounts)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [historyOrders]);

  const maxQty = topItems.length > 0 ? topItems[0].qty : 1;

  // Recent 5 settled orders for live activity stream
  const recentOrders = useMemo(() => {
    return [...historyOrders]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  }, [historyOrders]);

  // Dynamic Chart Data based on timeFilter (7 or 30 days)
  const daysCount = timeFilter === '30days' ? 14 : 7;
  const dateBuckets = useMemo(() => {
    return Array.from({ length: daysCount }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (daysCount - 1 - i));
      return d;
    });
  }, [daysCount]);

  const salesTrend = useMemo(() => {
    return dateBuckets.map(date => {
      const dayStr = date.toDateString();
      const label = date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: daysCount > 7 ? 'numeric' : 'short'
      });
      const dayOrders = historyOrders.filter(o =>
        o.status !== 'Cancelled' && new Date(o.createdAt).toDateString() === dayStr
      );
      const revenue = dayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const count = dayOrders.length;
      return { label, revenue, count };
    });
  }, [dateBuckets, historyOrders, daysCount]);

  // Chart.js Line Configuration
  const lineChartData = {
    labels: salesTrend.map(d => d.label),
    datasets: [
      {
        label: chartMetric === 'revenue' ? 'Sales Revenue (₹)' : 'Settled Orders',
        data: salesTrend.map(d => (chartMetric === 'revenue' ? d.revenue : d.count)),
        borderColor: chartMetric === 'revenue' ? '#059669' : '#3b82f6',
        backgroundColor: chartMetric === 'revenue' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(59, 130, 246, 0.08)',
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointBackgroundColor: chartMetric === 'revenue' ? '#059669' : '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { size: 12, weight: 'bold', family: 'Inter' },
        bodyFont: { size: 12, family: 'Inter' },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => chartMetric === 'revenue' ? ` Revenue: ₹${ctx.parsed.y.toLocaleString()}` : ` Orders: ${ctx.parsed.y}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11, family: 'Inter' }, color: '#64748b' }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(226, 232, 240, 0.6)' },
        ticks: {
          font: { size: 11, family: 'Inter' },
          color: '#64748b',
          callback: (val) => chartMetric === 'revenue' ? `₹${val}` : val
        }
      }
    }
  };

  // Doughnut Chart Data
  const doughnutData = {
    labels: ['Served', 'In Kitchen', 'Ready', 'New'],
    datasets: [
      {
        data: [
          orderStatusCounts.Served || 0,
          orderStatusCounts.Cooking || 0,
          orderStatusCounts.Ready || 0,
          orderStatusCounts.New || 0
        ],
        backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'],
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 4
      }
    ]
  };

  const doughnutOptions = {
    cutout: '72%',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 8,
        cornerRadius: 6
      }
    }
  };

  // Quick stat cards matching Dhantag gradient & clean layout
  const statsCards = [
    {
      title: "Today's Revenue",
      value: `₹${todayRevenue.toLocaleString()}`,
      sub: `${todayOrdersCount} orders today`,
      icon: Banknote,
      gradient: 'from-emerald-700 to-emerald-900',
      iconBg: 'bg-emerald-500/20 text-emerald-200',
      tabKey: 'orders'
    },
    {
      title: "Active Live Orders",
      value: `${activeOrdersCount}`,
      sub: `${totalTables} tables connected`,
      icon: Activity,
      gradient: 'from-blue-700 to-indigo-900',
      iconBg: 'bg-blue-500/20 text-blue-200',
      pulse: activeOrdersCount > 0,
      tabKey: 'orders'
    },
    {
      title: "This Week Revenue",
      value: `₹${lastWeekRevenue.toLocaleString()}`,
      sub: "Rolling 7 days total",
      icon: TrendingUp,
      gradient: 'from-violet-700 to-purple-900',
      iconBg: 'bg-violet-500/20 text-violet-200',
      tabKey: 'billing-history'
    },
    {
      title: "Monthly Volume",
      value: `₹${monthlyRevenue.toLocaleString()}`,
      sub: `${lifetimeOrdersCount} all-time orders`,
      icon: BarChart2,
      gradient: 'from-slate-800 to-slate-950',
      iconBg: 'bg-slate-700/40 text-slate-200',
      tabKey: 'billing-history'
    }
  ];

  return (
    <div className="space-y-5 animate-fadeIn text-left">
      
      {/* ── Welcome Header Card (Dhantag Enterprise Style) ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Admin Dashboard</h1>
            <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200">
              POS Connected
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Welcome back, <strong className="text-slate-800 font-bold">{restaurant?.name || 'Manager'}</strong> 👋 · Live restaurant operations & sales summary
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <a
            href={`http://localhost:5173/menu/${restaurant?.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-slate-600" />
            Live Diner Menu
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Live
          </span>
        </div>
      </div>

      {/* ── 4 Key Metric Cards (Rich Gradient & High Contrast) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card, i) => (
          <div
            key={i}
            onClick={() => onNavigate && card.tabKey && onNavigate(card.tabKey)}
            className={`relative overflow-hidden bg-gradient-to-br ${card.gradient} rounded-2xl p-4.5 text-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer border border-white/10 flex flex-col justify-between min-h-[125px]`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-white/75 tracking-wider uppercase">{card.title}</span>
                <p className="text-2xl font-black text-white mt-1 tracking-tight">{card.value}</p>
              </div>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${card.iconBg}`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/10 text-[11px] text-white/80 font-medium">
              <span className="flex items-center gap-1.5">
                {card.pulse && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
                {card.sub}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-white/60" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Secondary Quick Metrics Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">All-Time Settled</span>
            <Coins className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-lg font-black text-slate-900">₹{lifetimeRevenue.toLocaleString()}</p>
          <span className="text-[10px] text-slate-500 font-semibold">{lifetimeOrdersCount} total orders</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Tables</span>
            <Table2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg font-black text-slate-900">{activeOrdersCount} / {totalTables}</p>
          <span className="text-[10px] text-slate-500 font-semibold">Dining right now</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Average Ticket</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-lg font-black text-slate-900">
            ₹{todayOrdersCount > 0 ? Math.round(todayRevenue / todayOrdersCount) : 0}
          </p>
          <span className="text-[10px] text-slate-500 font-semibold">Per order today</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Self-Order QR</span>
            <QrCode className="w-4 h-4 text-violet-600" />
          </div>
          <p className="text-lg font-black text-slate-900">{totalTables}</p>
          <span className="text-[10px] text-emerald-600 font-bold">100% active terminals</span>
        </div>
      </div>

      {/* ── Main Analytics Section: Chart (Left 8 Cols) + Distribution (Right 4 Cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Interactive Trend Chart */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Analytics Overview</h3>
                <p className="text-xs font-medium text-slate-500">Sales performance and order trajectory</p>
              </div>

              {/* Toggle Controls */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
                  <button
                    onClick={() => setChartMetric('revenue')}
                    className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      chartMetric === 'revenue' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Revenue (₹)
                  </button>
                  <button
                    onClick={() => setChartMetric('orders')}
                    className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      chartMetric === 'orders' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Orders
                  </button>
                </div>

                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 14 Days</option>
                </select>
              </div>
            </div>

            {/* Chart Canvas */}
            <div className="mt-4 h-[260px] w-full">
              <Line data={lineChartData} options={lineChartOptions} />
            </div>
          </div>

          {/* Quick Summary Pill Row Below Chart */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total in Range</p>
              <p className="text-base font-black text-slate-900 mt-0.5">
                ₹{salesTrend.reduce((sum, d) => sum + d.revenue, 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center border-x border-slate-100">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Orders Settled</p>
              <p className="text-base font-black text-slate-900 mt-0.5">
                {salesTrend.reduce((sum, d) => sum + d.count, 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Highest Day</p>
              <p className="text-base font-black text-emerald-700 mt-0.5">
                ₹{Math.max(...salesTrend.map(d => d.revenue), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Order Status Distribution (Doughnut) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Order Distribution</h3>
                <p className="text-xs font-medium text-slate-500">Breakdown by current status</p>
              </div>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>

            <div className="relative mt-4 h-[180px] flex items-center justify-center">
              <Doughnut data={doughnutData} options={doughnutOptions} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900">{historyOrders.length}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Total Logged</span>
              </div>
            </div>
          </div>

          {/* Status Breakdown Legend Items */}
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
            {[
              { label: 'Served / Completed', count: orderStatusCounts.Served, color: 'bg-emerald-500' },
              { label: 'In Kitchen (Cooking)', count: orderStatusCounts.Cooking, color: 'bg-amber-500' },
              { label: 'Ready to Serve', count: orderStatusCounts.Ready, color: 'bg-blue-500' },
              { label: 'New / Queued', count: orderStatusCounts.New, color: 'bg-violet-500' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                  <span className="text-slate-600 font-medium">{item.label}</span>
                </div>
                <span className="font-bold text-slate-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Bottom Row: Top Selling Dishes + Recent Settled Orders ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Top Selling Dishes (6 Cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Top Selling Menu Items</h3>
                <p className="text-[11px] font-medium text-slate-500">Highest quantity ordered by diners</p>
              </div>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('menu')}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
              >
                View Menu <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {topItems.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-medium text-xs">
              No orders registered yet to rank menu items.
            </div>
          ) : (
            <div className="space-y-3.5">
              {topItems.map((item, idx) => {
                const rankLabels = ['🥇', '🥈', '🥉', '4th', '5th'];
                const rankGradients = [
                  'from-amber-500 to-amber-600',
                  'from-slate-400 to-slate-500',
                  'from-amber-700 to-amber-800',
                  'from-blue-500 to-blue-600',
                  'from-emerald-500 to-emerald-600'
                ];
                const pct = Math.round((item.qty / maxQty) * 100);

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm shrink-0">{rankLabels[idx]}</span>
                        <span className="font-bold text-slate-800 truncate">{item.name}</span>
                      </div>
                      <span className="font-extrabold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-[11px]">
                        {item.qty} units sold
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${rankGradients[idx]} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Settled Orders (6 Cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Recent Settled Orders</h3>
                <p className="text-[11px] font-medium text-slate-500">Live cashier settlement log</p>
              </div>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('billing-history')}
                className="text-xs font-bold text-blue-800 hover:text-blue-950 flex items-center gap-1 cursor-pointer"
              >
                All History <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-500 font-medium text-xs">
              No recent settlements available.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentOrders.map((ord, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-800 shrink-0">
                      {ord.tableName ? ord.tableName.replace(/Table\s*/i, 'T') : '#'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {ord.orderNumber || `Order #${ord._id?.slice(-4)}`}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium truncate">
                        {ord.items?.length || 0} items · {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-slate-900">₹{(ord.totalAmount || 0).toLocaleString()}</p>
                    <span className={`inline-block text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                      ord.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {ord.paymentStatus || 'Paid'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

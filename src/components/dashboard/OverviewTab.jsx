import React, { useState, useMemo } from 'react';
import {
  Banknote, Coins, ExternalLink, UtensilsCrossed, TrendingUp, Activity,
  BarChart2, ShoppingBag, AlertCircle, ChevronRight, ChefHat
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
} from 'chart.js';
import { Line } from 'react-chartjs-2';

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const USER_URL = (import.meta.env.VITE_USER_URL || (isLocal ? 'http://localhost:5173' : window.location.origin)).replace(/\/+$/, '');

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
  Filler
);

export default function OverviewTab({ stats = {}, restaurant = {}, onNavigate, onOpenTakeOrder }) {
  const [chartMetric, setChartMetric] = useState('revenue'); // 'revenue' | 'orders'
  const [timeFilter, setTimeFilter] = useState('7days'); // '7days' | '30days'

  const todayRevenue = stats.todayRevenue || 0;
  const todayOrdersCount = stats.todayOrdersCount || 0;
  const lastWeekRevenue = stats.lastWeekRevenue || 0;
  const monthlyRevenue = stats.monthlyRevenue || 0;
  const activeOrdersCount = stats.activeOrdersCount || 0;
  const lifetimeRevenue = stats.lifetimeRevenue || 0;
  const lifetimeOrdersCount = stats.lifetimeOrdersCount || 0;

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
    const dailySales = new Map((stats.salesTrend || []).map(day => [day.date, day]));
    return dateBuckets.map(date => {
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: daysCount > 7 ? 'numeric' : 'short'
      });
      const day = dailySales.get(dateKey) || {};
      return { label, revenue: day.revenue || 0, count: day.count || 0 };
    });
  }, [dateBuckets, stats.salesTrend, daysCount]);

  // Chart.js Line Configuration
  const lineChartData = {
    labels: salesTrend.map(d => d.label),
    datasets: [
      {
        label: chartMetric === 'revenue' ? 'Sales Revenue (₹)' : 'Orders',
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
      sub: 'Orders currently in progress',
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
            href={`${USER_URL}/menu/${restaurant?.slug}`}
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

      {/* Operational counters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { title: 'All-Time Settled', value: `\u20B9${lifetimeRevenue.toLocaleString()}`, detail: `${lifetimeOrdersCount} total orders`, icon: Coins, tone: 'text-amber-600', iconBg: 'bg-amber-50' },
          { title: 'Cashier Orders', value: stats.cashierOrdersCount || 0, detail: 'Awaiting payment', icon: ShoppingBag, tone: 'text-violet-700', iconBg: 'bg-violet-50' },
          { title: 'Ready to Serve', value: stats.readyOrdersCount || 0, detail: 'Waiting to be served', icon: ChefHat, tone: 'text-emerald-700', iconBg: 'bg-emerald-50' },
          { title: 'Waiter Calls', value: stats.pendingWaiterCallsCount || 0, detail: 'Not attended yet', icon: AlertCircle, tone: 'text-rose-700', iconBg: 'bg-rose-50' },
        ].map((card) => (
          <div key={card.title} className="flex min-h-[94px] items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{card.title}</p>
              <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">{card.value}</p>
              <p className="mt-0.5 text-[10px] font-medium text-slate-500">{card.detail}</p>
            </div>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.iconBg} ${card.tone}`}>
              <card.icon className="h-5 w-5" />
            </span>
          </div>
        ))}
      </div>

      {/* Sales trend */}
      <div className="grid grid-cols-1 gap-5">
        
        {/* Left Column: Interactive Trend Chart */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
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
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Orders placed</p>
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

      </div>
    </div>
  );
}

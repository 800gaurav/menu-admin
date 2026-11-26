import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import { api, BACKEND_URL, removeRestaurantToken } from '../api';
import BillPrint from './BillPrint';
import {
  LayoutDashboard,
  ChefHat,
  BookOpen,
  Receipt,
  CreditCard,
  RefreshCw,
  LogOut,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  UtensilsCrossed,
  History,
  TrendingUp,
  AlertCircle,
  Store,
  CheckCircle,
  Clock,
  X,
  Bell,
  BellRing,
  Plus
} from 'lucide-react';
import { requestFirebaseNotificationPermission } from '../firebase';
import { playOrderNotification } from '../utils/soundAlert';

// Tab Component Imports
import CounterOverviewTab from '../components/dashboard/CounterOverviewTab';
import OrdersTab from '../components/dashboard/OrdersTab';
import BillingTab from '../components/dashboard/BillingTab';
import BillingHistoryTab from '../components/dashboard/BillingHistoryTab';
import OrderInvoiceModal from '../components/dashboard/OrderInvoiceModal';
import CounterOrderModal from '../components/dashboard/CounterOrderModal';
import CounterMenuPage from './CounterMenuPage';

// Robust helper to merge incoming order updates without dropping populated customer/waiter objects
const mergeOrderData = (existingOrder, incomingOrder) => {
  if (!existingOrder) return incomingOrder;
  if (!incomingOrder) return existingOrder;

  let resolvedCustomer = incomingOrder.customerId;
  const existingCust = existingOrder.customerId;
  if (existingCust && typeof existingCust === 'object' && existingCust.name) {
    if (!resolvedCustomer || typeof resolvedCustomer === 'string' || !resolvedCustomer.name) {
      resolvedCustomer = existingCust;
    }
  }

  const customerName = incomingOrder.customerName || existingOrder.customerName || (typeof resolvedCustomer === 'object' ? resolvedCustomer?.name : '') || 'Guest User';
  const customerMobile = incomingOrder.customerMobile || existingOrder.customerMobile || (typeof resolvedCustomer === 'object' ? resolvedCustomer?.mobile : '');

  let resolvedWaiter = incomingOrder.waiterId;
  const existingWaiter = existingOrder.waiterId;
  if (existingWaiter && typeof existingWaiter === 'object' && (existingWaiter.name || existingWaiter.waiterName)) {
    if (!resolvedWaiter || typeof resolvedWaiter === 'string' || (!resolvedWaiter.name && !resolvedWaiter.waiterName)) {
      resolvedWaiter = existingWaiter;
    }
  }

  return {
    ...existingOrder,
    ...incomingOrder,
    customerId: resolvedCustomer,
    customerName,
    customerMobile,
    waiterId: resolvedWaiter
  };
};

export default function CounterPanel() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isOrderPage = location.pathname.endsWith('/order');
  const isMenuPage = location.pathname.endsWith('/menu');
  const orderMode = new URLSearchParams(location.search).get('mode') === 'direct' ? 'direct' : 'kitchen';
  const counterBasePath = `/admin/counter/${slug}`;

  // Navigation State: 'overview' | 'orders' | 'billing' | 'history' | 'menu' | 'order'
  const [activeTab, setActiveTab] = useState(() => {
    if (isMenuPage) return 'menu';
    if (isOrderPage) return 'order';
    return 'overview';
  });

  useEffect(() => {
    if (location.pathname.endsWith('/menu')) {
      setActiveTab('menu');
    } else if (location.pathname.endsWith('/order')) {
      setActiveTab('order');
    } else if (location.pathname === counterBasePath || location.pathname === `${counterBasePath}/`) {
      if (activeTab === 'menu' || activeTab === 'order') {
        setActiveTab('overview');
      }
    }
  }, [location.pathname, counterBasePath]);

  const handleSelectTab = (tab) => {
    if (tab === 'menu') {
      navigate(`${counterBasePath}/menu`);
      setActiveTab('menu');
    } else if (tab === 'order') {
      navigate(`${counterBasePath}/order`);
      setActiveTab('order');
    } else {
      if (location.pathname.endsWith('/menu') || location.pathname.endsWith('/order')) {
        navigate(counterBasePath);
      }
      setActiveTab(tab);
      fetchTabData(tab);
    }
  };

  // Operational Data States
  const [restaurant, setRestaurant] = useState(null);
  const [stats, setStats] = useState({
    todayOrdersCount: 0,
    todayRevenue: 0,
    activeOrdersCount: 0,
    newOrdersCount: 0
  });
  const [orders, setOrders] = useState([]);
  const [billingOrders, setBillingOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [billingSummary, setBillingSummary] = useState({ count: 0, revenue: 0, averageValue: 0 });
  const [tables, setTables] = useState([]);

  // UI & Filter States
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  );
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');
  const [billingTableFilter, setBillingTableFilter] = useState('');
  const [historyTab, setHistoryTab] = useState('all');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sound & Notification Alert State
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('counterSoundEnabled');
    return saved !== null ? saved === 'true' : true;
  });
  const soundEnabledRef = useRef(soundEnabled);
  const [newOrderToast, setNewOrderToast] = useState(null);
  const newOrderToastTimeout = useRef(null);
  const alertedBillRequestIdsRef = useRef(new Set());

  // Modal States
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedPrintOrder, setSelectedPrintOrder] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [modalAlert, setModalAlert] = useState(null);

  const socketRef = useRef(null);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Persist active tab selection
  useEffect(() => {
    localStorage.setItem('counterActiveTab', activeTab);
  }, [activeTab]);

  // Alert & Confirm Dialogs
  const showAlert = (message, title = 'Notification') => {
    return new Promise((resolve) => {
      setModalAlert({
        title,
        message,
        type: 'alert',
        confirmText: 'OK',
        onConfirm: () => {
          setModalAlert(null);
          resolve();
        }
      });
    });
  };

  const showConfirm = (message, title = 'Confirmation Required', confirmText = 'Yes', cancelText = 'Cancel') => {
    return new Promise((resolve) => {
      setModalAlert({
        title,
        message,
        type: 'confirm',
        confirmText,
        cancelText,
        onConfirm: () => {
          setModalAlert(null);
          resolve(true);
        },
        onCancel: () => {
          setModalAlert(null);
          resolve(false);
        }
      });
    });
  };

  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg) => {
      showAlert(String(msg));
    };
    window.showConfirm = showConfirm;
    return () => {
      window.alert = originalAlert;
      delete window.showConfirm;
    };
  }, []);

  // High-Impact Web Audio + Voice Announcement
  const playNotificationSound = (order = null) => {
    if (!soundEnabledRef.current) return;
    playOrderNotification(order, { voice: true, desktop: true });
  };

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem('counterSoundEnabled', String(next));
      if (next) {
        // Preview loud chime so user hears volume level immediately
        playOrderNotification(null, { voice: false, desktop: false });
      }
      return next;
    });
  };

  const enableCounterNotifications = async () => {
    await requestFirebaseNotificationPermission('counter');
    setNotificationPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Master Initial Fetch
  const fetchAllData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const [
        profileRes,
        statsRes,
        liveOrdersRes,
        counterOrdersRes,
        counterSummaryRes,
        tablesRes
      ] = await Promise.all([
        api.restaurant.getProfile().catch(() => null),
        api.restaurant.getStats().catch(() => null),
        api.orders.getOrders({ live: 'true' }).catch(() => []),
        api.counter.getOrders().catch(() => []),
        api.counter.getSalesSummary().catch(() => ({ count: 0, revenue: 0, averageValue: 0 })),
        api.tables.getTables().catch(() => [])
      ]);

      if (profileRes) setRestaurant(profileRes);
      if (statsRes) setStats(statsRes);
      if (Array.isArray(liveOrdersRes)) setOrders(liveOrdersRes);
      if (Array.isArray(counterOrdersRes)) {
        setBillingOrders(counterOrdersRes);
        counterOrdersRes.forEach(order => {
          if (order.billRequested && order._id) alertedBillRequestIdsRef.current.add(String(order._id));
        });
      }
      if (counterSummaryRes) setBillingSummary(counterSummaryRes);
      if (Array.isArray(tablesRes)) setTables(tablesRes);

      // Also prefetch recent completed orders for history
      api.orders.getOrders({ limit: 200 }).then((hist) => {
        if (Array.isArray(hist)) setHistoryOrders(hist);
      }).catch(() => {});

    } catch (err) {
      console.error('Failed to fetch counter data:', err);
      if (err.status === 401 || err.status === 403) {
        removeRestaurantToken();
        navigate(`/admin/counter/${slug}/login`);
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // Tab-specific lazy refresh
  const fetchTabData = async (tab) => {
    try {
      setTabLoading(true);
      if (tab === 'orders') {
        const live = await api.orders.getOrders({ live: 'true' });
        if (Array.isArray(live)) setOrders(live);
      } else if (tab === 'billing') {
        const [activeList, summaryStats] = await Promise.all([
          api.counter.getOrders(),
          api.counter.getSalesSummary()
        ]);
        if (Array.isArray(activeList)) setBillingOrders(activeList);
        if (summaryStats) setBillingSummary(summaryStats);
      } else if (tab === 'history') {
        const [hist, tbls] = await Promise.all([
          api.orders.getOrders({ limit: 200 }).catch(() => []),
          api.tables.getTables().catch(() => [])
        ]);
        if (Array.isArray(hist)) setHistoryOrders(hist);
        if (Array.isArray(tbls) && tbls.length > 0) setTables(tbls);
      } else if (tab === 'overview') {
        const statsData = await api.restaurant.getStats();
        if (statsData) setStats(statsData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTabLoading(false);
    }
  };

  const refreshBillingSummary = async () => {
    try {
      const summaryStats = await api.counter.getSalesSummary();
      if (summaryStats) setBillingSummary(summaryStats);
    } catch (e) {}
  };

  const refreshStats = async () => {
    try {
      const statsData = await api.restaurant.getStats();
      if (statsData) setStats(statsData);
    } catch (e) {}
  };

  // Socket Connection and Event Listeners
  const connectSocket = (restId) => {
    if (!restId) return;
    if (socketRef.current) socketRef.current.disconnect();

    socketRef.current = io(BACKEND_URL);

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      socketRef.current.emit('joinRestaurant', restId);
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
    });

    // Real-time: New Order Created
    socketRef.current.on('orderCreated', (newOrder) => {
      if (!['Served', 'Completed', 'Cancelled'].includes(newOrder.status)) {
        setOrders(prev => {
          const exists = prev.some(o => o._id === newOrder._id);
          if (exists) return prev;
          return [newOrder, ...prev];
        });
      }

      if (newOrder.status === 'Served') {
        setBillingOrders(prev => {
          const exists = prev.some(o => o._id === newOrder._id);
          if (exists) return prev.map(o => o._id === newOrder._id ? newOrder : o);
          return [newOrder, ...prev].sort((a, b) => b.billRequested - a.billRequested || new Date(b.createdAt) - new Date(a.createdAt));
        });
      }

      // Keep the order in the live board, but do not alert the counter operator
      // about an order they just entered themselves.
      if (newOrder.placedBy !== 'counter') {
        setNewOrderToast(newOrder);
        if (newOrderToastTimeout.current) clearTimeout(newOrderToastTimeout.current);
        newOrderToastTimeout.current = setTimeout(() => setNewOrderToast(null), 10000);
        playNotificationSound(newOrder);
      }
      refreshStats();
      refreshBillingSummary();
    });

    // Real-time: Order Status / Items Updated
    socketRef.current.on('orderUpdated', (updatedOrder) => {
      setOrders(prev => prev.map(o => o._id === updatedOrder._id ? mergeOrderData(o, updatedOrder) : o));

      if (updatedOrder.billRequested && updatedOrder._id) {
        const orderId = String(updatedOrder._id);
        if (!alertedBillRequestIdsRef.current.has(orderId)) {
          alertedBillRequestIdsRef.current.add(orderId);
          if (soundEnabledRef.current) playOrderNotification(null, { voice: false, desktop: false });
        }
      }

      // Billing tab strictly holds orders whose status is 'Served'
      setBillingOrders(prev => {
        if (updatedOrder.status === 'Served') {
          const exists = prev.some(o => o._id === updatedOrder._id);
          if (exists) {
            return prev
              .map(o => o._id === updatedOrder._id ? mergeOrderData(o, updatedOrder) : o)
              .sort((a, b) => b.billRequested - a.billRequested || new Date(b.createdAt) - new Date(a.createdAt));
          } else {
            return [updatedOrder, ...prev].sort((a, b) => b.billRequested - a.billRequested || new Date(b.createdAt) - new Date(a.createdAt));
          }
        } else {
          return prev.filter(o => o._id !== updatedOrder._id);
        }
      });

      if (updatedOrder.status === 'Completed' || updatedOrder.status === 'Cancelled') {
        setHistoryOrders(prev => {
          const exists = prev.some(o => o._id === updatedOrder._id);
          const list = exists
            ? prev.map(o => o._id === updatedOrder._id ? mergeOrderData(o, updatedOrder) : o)
            : [updatedOrder, ...prev];
          return list
            .sort((a, b) => new Date(b.completedAt || b.updatedAt || b.createdAt) - new Date(a.completedAt || a.updatedAt || a.createdAt))
            .slice(0, 200);
        });
      }

      refreshStats();
      refreshBillingSummary();
    });

    // Real-time: Order Deleted
    const handleOrderDeleted = (orderId) => {
      if (!orderId) return;
      const idStr = String(orderId);
      setOrders(prev => prev.filter(o => String(o._id) !== idStr));
      setBillingOrders(prev => prev.filter(o => String(o._id) !== idStr));
      setHistoryOrders(prev => prev.filter(o => String(o._id) !== idStr));
      refreshStats();
      refreshBillingSummary();
    };

    socketRef.current.on('orderDeleted', handleOrderDeleted);
    socketRef.current.on('order-deleted', handleOrderDeleted);

    socketRef.current.on('counterBillUpdated', () => {
      api.counter.getOrders().then(setBillingOrders).catch(console.error);
      refreshBillingSummary();
    });

    socketRef.current.on('waiterCalled', refreshStats);
    socketRef.current.on('waiterCallAttended', refreshStats);
  };

  // Mount Effect
  useEffect(() => {
    const token = localStorage.getItem('restaurant_token');
    const restId = localStorage.getItem('restaurant_id');

    if (!token) {
      navigate(`/admin/counter/${slug}/login`);
      return;
    }

    fetchAllData();
    if (restId) connectSocket(restId);
    requestFirebaseNotificationPermission('counter').then(() => {
      setNotificationPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
    });

    // Dynamic Manifest injection for PWA
    if (slug) {
      const existing = document.querySelectorAll('link[rel="manifest"]');
      existing.forEach(el => el.remove());

      const link = document.createElement('link');
      link.rel = 'manifest';
      link.crossOrigin = 'anonymous';
      link.href = `${BACKEND_URL}/api/manifest/${slug}/counter?origin=${window.location.origin}&t=${Date.now()}`;
      document.head.appendChild(link);
    }

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [slug]);

  // Favicon & Page Title
  useEffect(() => {
    if (restaurant?.logo) {
      let iconLink = document.querySelector("link[rel~='icon']");
      if (!iconLink) {
        iconLink = document.createElement('link');
        iconLink.rel = 'icon';
        document.head.appendChild(iconLink);
      }
      iconLink.href = restaurant.logo.startsWith('http') ? restaurant.logo : `${BACKEND_URL}${restaurant.logo}`;

      let appleIconLink = document.querySelector("link[rel='apple-touch-icon']");
      if (!appleIconLink) {
        appleIconLink = document.createElement('link');
        appleIconLink.rel = 'apple-touch-icon';
        document.head.appendChild(appleIconLink);
      }
      appleIconLink.href = iconLink.href;
    }
    if (restaurant?.name) {
      document.title = `${restaurant.name} | Counter POS`;
    }
  }, [restaurant]);

  // --- Operational Action Handlers ---

  // Order Status Handler for OrdersTab
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      setOrders(prev => prev.map(o => o._id === orderId ? mergeOrderData(o, { ...o, status: newStatus }) : o));
      const res = await api.orders.updateStatus(orderId, newStatus, (newStatus === 'Served' || newStatus === 'Completed') ? 'Counter' : undefined);
      if (res && res._id) {
        setOrders(prev => prev.map(o => o._id === orderId ? mergeOrderData(o, res) : o));
      }
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder(prev => mergeOrderData(prev, { status: newStatus }));
      }
      refreshStats();
      refreshBillingSummary();
    } catch (err) {
      alert('Failed to update order status');
    }
  };

  // Payment Status Handler for Invoice Modal and Billing
  const handleUpdatePaymentStatus = async (orderId, newPaymentStatus) => {
    try {
      await api.orders.updatePaymentStatus(orderId, newPaymentStatus);
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder({ ...selectedOrder, paymentStatus: newPaymentStatus });
      }
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, paymentStatus: newPaymentStatus } : o));
      setBillingOrders(prev => prev.map(o => o._id === orderId ? { ...o, paymentStatus: newPaymentStatus } : o));
      setHistoryOrders(prev => prev.map(o => o._id === orderId ? { ...o, paymentStatus: newPaymentStatus } : o));
    } catch (err) {
      alert('Failed to update payment status: ' + err.message);
    }
  };

  // Settle Order Handler for BillingTab
  const handleSettleBillingOrder = async (orderId) => {
    try {
      await api.counter.completeOrder(orderId);
      setBillingOrders(prev => prev.filter(o => o._id !== orderId));
      refreshBillingSummary();
      refreshStats();

      // Refresh history list to display the newly completed order
      const historyList = await api.orders.getOrders({ limit: 200, history: 'true' });
      if (Array.isArray(historyList)) {
        const sorted = [...historyList].sort((a, b) =>
          new Date(b.completedAt || b.updatedAt || b.createdAt) - new Date(a.completedAt || a.updatedAt || a.createdAt)
        );
        setHistoryOrders(sorted);
      }
    } catch (err) {
      alert('Failed to settle order: ' + err.message);
    }
  };

  // Thermal Receipt Print Handler
  const handleOpenPrintBilling = (order) => {
    setSelectedPrintOrder(order);
    setIsPrintModalOpen(true);
  };

  // Logout Handler
  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    removeRestaurantToken();
    navigate(`/admin/counter/${slug}/login`);
  };

  // Calculated Counts for Badges
  const activeOrdersCount = orders.filter(o => !['Served', 'Completed', 'Cancelled'].includes(o.status)).length;
  const billRequestedCount = billingOrders.filter(o => o.billRequested).length;
  const activeBillingCount = billingOrders.length;

  // Mobile topbar visibility rule:
  // Only shown on Dashboard ('overview'), Menu ('menu'), and Take Order ('order' / table select).
  // Hidden on Mobile for Live Orders ('orders'), Settle ('billing'), and History ('history').
  const isMobileHeaderVisible = ['overview', 'menu', 'order'].includes(activeTab);

  return (
    <div className={`bg-slate-50 font-sans text-slate-800 flex flex-col selection:bg-emerald-100 selection:text-emerald-900 ${
      activeTab === 'orders' || activeTab === 'order' ? 'h-screen overflow-hidden' : 'min-h-screen'
    }`}>
      
      {/* =========================================================================
          TOPBAR (Unified Top Navbar across ALL pages on Desktop; conditional on Mobile)
          ========================================================================= */}
      <header className={`sticky top-0 z-30 bg-white border-b border-slate-200/90 shadow-xs ${isMobileHeaderVisible ? 'block' : 'hidden md:block'}`}>
        <div className="w-full px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          
          {/* Left: Branding & Station Info */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-700/10 border border-emerald-600/20 flex items-center justify-center shrink-0 shadow-xs">
              {restaurant?.logo ? (
                <img
                  src={restaurant.logo.startsWith('http') ? restaurant.logo : `${BACKEND_URL}${restaurant.logo}`}
                  alt={restaurant?.name || 'Logo'}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <Store className="w-5 h-5 text-emerald-700" />
              )}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight truncate max-w-[130px] sm:max-w-xs md:max-w-sm">
                  {restaurant?.name || 'Counter POS'}
                </h1>
              </div>
            </div>
          </div>

          {/* Center: Desktop Navigation Tabs (Clean typography without icons or harsh grey background) */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
            {/* Tab 1: Dashboard */}
            <button
              type="button"
              onClick={() => handleSelectTab('overview')}
              className={`px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#003b1b] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
              }`}
            >
              Dashboard
            </button>

            {/* Tab 2: Live Orders */}
            <button
              type="button"
              onClick={() => handleSelectTab('orders')}
              className={`flex items-center px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-[#003b1b] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
              }`}
            >
              <span>Live Orders</span>
              {activeOrdersCount > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'orders' ? 'bg-emerald-400 text-slate-950' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {activeOrdersCount > 99 ? '99+' : activeOrdersCount}
                </span>
              )}
            </button>

            {/* Tab 3: Settle */}
            <button
              type="button"
              onClick={() => handleSelectTab('billing')}
              className={`flex items-center px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'billing'
                  ? 'bg-[#003b1b] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
              }`}
            >
              <span>Settle</span>
              {billRequestedCount > 0 ? (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                  {billRequestedCount}
                </span>
              ) : activeBillingCount > 0 ? (
                <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'billing' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {activeBillingCount}
                </span>
              ) : null}
            </button>

            {/* Tab 4: History */}
            <button
              type="button"
              onClick={() => handleSelectTab('history')}
              className={`px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-[#003b1b] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
              }`}
            >
              History
            </button>
          </nav>

          {/* Right: Station Controls & Quick Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Take Order POS Button */}
            <button
              type="button"
              onClick={() => handleSelectTab('order')}
              className={`h-9 px-3.5 sm:px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs ${
                activeTab === 'order'
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-emerald-600/20'
                  : 'bg-[#003b1b] hover:bg-[#166534] text-white active:scale-95'
              }`}
              title="Open Counter POS Order"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="whitespace-nowrap">New Order</span>
            </button>

            <div className="h-4 w-px bg-slate-200 hidden sm:block mx-0.5" />

            {/* Sound Mute / Unmute */}
            <button
              type="button"
              onClick={toggleSound}
              className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all cursor-pointer ${
                soundEnabled
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-slate-200 bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
              title={soundEnabled ? 'Mute Audio Alerts' : 'Unmute Audio Alerts'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-9 h-9 border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 cursor-pointer transition-all hidden sm:flex"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Kiosk Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Refresh Data */}
            <button
              type="button"
              onClick={() => fetchAllData(false)}
              disabled={loading}
              className="w-9 h-9 border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 cursor-pointer transition-all disabled:opacity-50"
              title="Refresh All Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-700' : ''}`} />
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="h-9 px-3 border border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
              title="Exit Counter Station"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          MAIN CONTENT AREA (Renders: Dashboard, Orders, Settle, History, Menu, New Order)
          ========================================================================= */}
      <main
        className={`flex-1 w-full text-left ${
          activeTab === 'order'
            ? 'p-0 flex flex-col overflow-hidden pb-20 md:pb-0'
            : activeTab === 'orders'
            ? 'max-w-7xl mx-auto px-3 sm:px-6 pt-1.5 sm:pt-2 pb-20 md:pb-3 flex flex-col flex-1 min-h-0 overflow-hidden'
            : 'max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 md:pb-8'
        }`}
      >
        {loading ? (
          <div className="text-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-700 mx-auto" />
            <p className="text-slate-600 text-sm mt-4 font-bold">Loading Counter Terminal...</p>
          </div>
        ) : (
          <>
            {/* 1. Live Orders Board */}
            {activeTab === 'orders' && (
              <OrdersTab
                orders={orders}
                orderSearch={orderSearch}
                setOrderSearch={setOrderSearch}
                orderStatusFilter={orderStatusFilter}
                setOrderStatusFilter={setOrderStatusFilter}
                handleUpdateOrderStatus={handleUpdateOrderStatus}
                setSelectedOrder={setSelectedOrder}
                setIsOrderModalOpen={setIsOrderModalOpen}
                tabLoading={tabLoading}
                api={api}
                soundEnabled={soundEnabled}
                toggleSound={toggleSound}
              />
            )}

            {/* 2. Cashier Counter Billing Tab */}
            {activeTab === 'billing' && (
              <BillingTab
                billingOrders={billingOrders}
                historyOrders={historyOrders}
                billingSummary={billingSummary}
                tables={tables}
                orderSearch={orderSearch}
                setOrderSearch={setOrderSearch}
                billingTableFilter={billingTableFilter}
                setBillingTableFilter={setBillingTableFilter}
                historyTab={historyTab}
                setHistoryTab={setHistoryTab}
                handleOpenPrintBilling={handleOpenPrintBilling}
                handleSettleBillingOrder={handleSettleBillingOrder}
                handleUpdatePaymentStatus={handleUpdatePaymentStatus}
                fetchTabData={fetchTabData}
                tabLoading={tabLoading}
              />
            )}

            {/* 3. Settlement History Tab */}
            {activeTab === 'history' && (
              <BillingHistoryTab
                tables={tables}
                handleOpenPrintBilling={handleOpenPrintBilling}
              />
            )}

            {/* 4. Counter Terminal Overview Dashboard */}
            {activeTab === 'overview' && (
              <CounterOverviewTab
                stats={stats}
                restaurant={restaurant}
                billingOrders={billingOrders}
                orders={orders}
                onNavigate={(tab) => {
                  if (tab === 'billing-history') handleSelectTab('history');
                  else if (['orders', 'billing', 'history', 'overview', 'menu'].includes(tab)) handleSelectTab(tab);
                }}
                onOpenTakeOrder={() => handleSelectTab('order')}
                onOpenMenu={() => handleSelectTab('menu')}
                onRefresh={() => fetchAllData(false)}
              />
            )}

            {/* 5. Menu Management Tab (Shares the exact same top navbar) */}
            {activeTab === 'menu' && (
              <CounterMenuPage embedded />
            )}

            {/* 6. Counter POS New Order Tab (Shares the exact same top navbar) */}
            {activeTab === 'order' && (
              <CounterOrderModal
                isOpen
                pageMode
                embedded
                orderMode={orderMode}
                tables={tables}
                onClose={() => handleSelectTab('overview')}
                onOrderPlaced={() => {
                  fetchAllData(true);
                  playOrderNotification(null, { voice: true, desktop: true });
                  handleSelectTab('orders');
                }}
              />
            )}
          </>
        )}
      </main>

      {/* =========================================================================
          BOTTOM NAVIGATION BAR (Visible on Mobile only - hidden on Desktop md:)
          ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-300/90 shadow-[0_-4px_25px_rgba(0,0,0,0.08)]">
        <div className="max-w-2xl mx-auto px-2 py-1.5 sm:py-2">
          <div className="grid grid-cols-4 gap-1 sm:gap-2">

            {/* Tab 1: Dashboard */}
            <button
              type="button"
              onClick={() => handleSelectTab('overview')}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'overview'
                  ? 'text-[#003b1b] bg-emerald-50 font-bold'
                  : 'text-slate-800 hover:text-black font-medium'
              }`}
            >
              <LayoutDashboard className="w-4.5 h-4.5" strokeWidth={2} />
              <span className="text-[10px] mt-1 tracking-tight truncate w-full text-center">
                Dashboard
              </span>
            </button>

            {/* Tab 2: Live Orders */}
            <button
              type="button"
              onClick={() => handleSelectTab('orders')}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'orders'
                  ? 'text-[#003b1b] bg-emerald-50 font-bold'
                  : 'text-slate-800 hover:text-black font-medium'
              }`}
            >
              <div className="relative">
                <ChefHat className="w-4.5 h-4.5" strokeWidth={2} />
                {activeOrdersCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 bg-emerald-700 text-white rounded-full text-[9px] font-bold flex items-center justify-center border-2 border-white shadow-xs">
                    {activeOrdersCount > 99 ? '99+' : activeOrdersCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight truncate w-full text-center">
                Orders
              </span>
            </button>

            {/* Tab 3: Settle */}
            <button
              type="button"
              onClick={() => handleSelectTab('billing')}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'billing'
                  ? 'text-[#003b1b] bg-emerald-50 font-bold'
                  : 'text-slate-800 hover:text-black font-medium'
              }`}
            >
              <div className="relative">
                <Receipt className="w-4.5 h-4.5" strokeWidth={2} />
                {billRequestedCount > 0 ? (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 bg-amber-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center border-2 border-white animate-pulse shadow-xs">
                    {billRequestedCount}
                  </span>
                ) : activeBillingCount > 0 ? (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 bg-slate-900 text-white rounded-full text-[9px] font-bold flex items-center justify-center border-2 border-white shadow-xs">
                    {activeBillingCount}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] mt-1 tracking-tight truncate w-full text-center">
                Settle
              </span>
            </button>

            {/* Tab 4: History */}
            <button
              type="button"
              onClick={() => handleSelectTab('history')}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-colors cursor-pointer ${
                activeTab === 'history'
                  ? 'text-[#003b1b] bg-emerald-50 font-bold'
                  : 'text-slate-800 hover:text-black font-medium'
              }`}
            >
              <History className="w-4.5 h-4.5" strokeWidth={2} />
              <span className="text-[10px] mt-1 tracking-tight truncate w-full text-center">
                History
              </span>
            </button>

          </div>
        </div>
      </nav>

      {/* =========================================================================
          OPERATIONAL OVERLAYS & MODALS
          ========================================================================= */}

      {/* Order Invoice Modal */}
      <OrderInvoiceModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        selectedOrder={selectedOrder}
        onUpdatePaymentStatus={handleUpdatePaymentStatus}
      />

      {/* Thermal Receipt Print Modal */}
      {isPrintModalOpen && selectedPrintOrder && (
        <BillPrint
          order={selectedPrintOrder}
          restaurant={restaurant}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 relative text-left flex flex-col border border-slate-100 animate-fadeIn">
            <div className="w-12 h-12 bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center rounded-2xl mb-4">
              <LogOut className="w-6 h-6" />
            </div>

            <h3 className="text-base font-extrabold text-slate-800">Exit Counter POS?</h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1.5 leading-relaxed">
              Are you sure you want to end your current session at the counter terminal? You will need to log back in to access cashier functions.
            </p>

            <div className="mt-6 flex gap-2.5">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-center text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md text-center text-xs cursor-pointer transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time New Order Floating Notification Banner */}
      {newOrderToast && (
        <div className="fixed bottom-20 sm:bottom-22 right-3 sm:right-6 z-50 animate-slideUp max-w-sm w-[92vw] sm:w-88 bg-slate-900 text-white rounded-2xl shadow-2xl p-4 border border-slate-700/80 flex items-start gap-3.5 backdrop-blur-md">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-amber-400 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                New Order Received!
              </span>
              <button
                type="button"
                onClick={() => setNewOrderToast(null)}
                className="text-slate-400 hover:text-white p-0.5 cursor-pointer transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm font-black text-white mt-1 truncate">
              {newOrderToast.tableName} • <span className="font-mono text-xs text-slate-300">{newOrderToast.orderNumber || ''}</span>
            </p>
            <p className="text-xs text-slate-300 font-medium mt-0.5 truncate">
              {(newOrderToast.items || []).map(i => `${i.name} (x${i.quantity})`).join(', ') || 'Items'} • ₹{newOrderToast.totalAmount || 0}
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('orders');
                  setSelectedOrder(newOrderToast);
                  setIsOrderModalOpen(true);
                  setNewOrderToast(null);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                View Order
              </button>
              <button
                type="button"
                onClick={() => setNewOrderToast(null)}
                className="px-2.5 py-1.5 text-slate-400 hover:text-white font-medium text-xs transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert/Confirm Modal */}
      {modalAlert && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn text-slate-800">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 relative text-left flex flex-col border border-slate-100">
            <h3 className="font-extrabold text-base text-slate-800 leading-snug">{modalAlert.title}</h3>
            <p className="text-[11px] text-slate-500 font-medium mt-2 leading-relaxed whitespace-pre-line">{modalAlert.message}</p>
            <div className="mt-6 flex gap-2.5">
              {modalAlert.type === 'confirm' && (
                <button
                  type="button"
                  onClick={modalAlert.onCancel}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-center text-xs cursor-pointer transition-colors"
                >
                  {modalAlert.cancelText || 'Cancel'}
                </button>
              )}
              <button
                type="button"
                onClick={modalAlert.onConfirm}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl shadow-md text-center text-xs cursor-pointer transition-colors"
              >
                {modalAlert.confirmText || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

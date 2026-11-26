import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import io from 'socket.io-client';
import { api, BACKEND_URL, API_BASE } from '../api';
import {
  ChefHat, ArrowLeft, Volume2, VolumeX, Maximize2,
  Clock, UtensilsCrossed, Flame, Zap, LogOut, BellRing,
  SlidersHorizontal, CheckCheck, RefreshCw, AlertTriangle, Layers
} from 'lucide-react';
import { requestFirebaseNotificationPermission } from '../firebase';
import { playOrderNotification } from '../utils/soundAlert';

const COLUMNS = [
  { id: 'New',       label: 'New Orders',     next: 'Preparing', color: 'amber'   },
  { id: 'Preparing', label: 'Preparing',     next: 'Ready',     color: 'blue'    },
  { id: 'Ready',     label: 'Ready to Serve', next: null,        color: 'emerald' },
];

const COL_STYLE = {
  amber: {
    header: 'bg-amber-500/10 border-amber-300/40 text-amber-950',
    badge: 'bg-amber-500 text-white',
    dot: 'bg-amber-500',
    btn: 'bg-amber-600 hover:bg-amber-700 active:scale-98 text-white',
    cardBorder: 'border-amber-200'
  },
  blue: {
    header: 'bg-blue-500/10 border-blue-300/40 text-blue-950',
    badge: 'bg-blue-600 text-white',
    dot: 'bg-blue-600',
    btn: 'bg-blue-600 hover:bg-blue-700 active:scale-98 text-white',
    cardBorder: 'border-blue-200'
  },
  emerald: {
    header: 'bg-emerald-500/10 border-emerald-300/40 text-emerald-950',
    badge: 'bg-emerald-600 text-white',
    dot: 'bg-emerald-600',
    btn: 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white',
    cardBorder: 'border-emerald-200'
  },
};

const PRIORITY_STYLE = {
  Normal: 'border-slate-200',
  High:   'border-amber-400 bg-amber-50/40 shadow-xs',
  Rush:   'border-rose-500 bg-rose-50/50 shadow-sm ring-1 ring-rose-400',
};

const PRIORITY_ICON = {
  Normal: null,
  High:   <Flame className="w-3.5 h-3.5 text-amber-600" />,
  Rush:   <Zap  className="w-3.5 h-3.5 text-rose-600 animate-pulse" />,
};

export default function KitchenPanel() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [modalAlert, setModalAlert] = useState(null);
  const [mobileTab, setMobileTab] = useState('New'); // 'New' | 'Preparing' | 'Ready'

  // Custom alert & confirm hooks
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
    return () => {
      window.alert = originalAlert;
    };
  }, []);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(soundEnabled);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const socketRef = useRef(null);
  const orderSyncRequestRef = useRef(null);
  const orderSyncQueuedRef = useRef(false);
  const syncKitchenOrdersRef = useRef(null);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    const token = localStorage.getItem('restaurant_token') || localStorage.getItem('kitchen_token');
    if (!token) {
      navigate(`/admin/kitchen/${slug}/login`);
      return;
    }
    fetchInitialData();
    const clock = setInterval(() => setCurrentTime(new Date()), 5000);
    requestFirebaseNotificationPermission('kitchen');

    if (slug) {
      const existing = document.querySelectorAll('link[rel="manifest"]');
      existing.forEach(el => el.remove());

      const link = document.createElement('link');
      link.rel = 'manifest';
      link.crossOrigin = 'anonymous';
      link.href = `${API_BASE}/manifest/${slug}/kitchen?origin=${window.location.origin}&t=${Date.now()}`;
      document.head.appendChild(link);
    }

    return () => {
      clearInterval(clock);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [slug]);

  // Socket.IO cannot replay events missed while the panel is closed or offline.
  // Reconcile from the server on reconnect/resume and periodically while visible.
  const syncKitchenOrders = useCallback(async () => {
    if (orderSyncRequestRef.current) {
      // A refresh requested after joining the socket must run after any older
      // request, so its snapshot cannot miss an order created in that gap.
      orderSyncQueuedRef.current = true;
      return orderSyncRequestRef.current;
    }

    const request = api.kitchen.getOrders()
      .then((kitchenOrders) => {
        if (Array.isArray(kitchenOrders)) setOrders(kitchenOrders);
      })
      .catch((error) => {
        console.warn('Could not sync kitchen orders:', error);
      });

    orderSyncRequestRef.current = request;
    try {
      await request;
    } finally {
      if (orderSyncRequestRef.current === request) orderSyncRequestRef.current = null;
      if (orderSyncQueuedRef.current) {
        orderSyncQueuedRef.current = false;
        if (document.visibilityState === 'visible') {
          window.setTimeout(() => syncKitchenOrdersRef.current?.(), 0);
        }
      }
    }
  }, []);

  useEffect(() => {
    syncKitchenOrdersRef.current = syncKitchenOrders;
  }, [syncKitchenOrders]);

  useEffect(() => {
    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') syncKitchenOrdersRef.current?.();
    };
    const poll = window.setInterval(syncWhenVisible, 15000);
    document.addEventListener('visibilitychange', syncWhenVisible);
    window.addEventListener('focus', syncWhenVisible);
    window.addEventListener('pageshow', syncWhenVisible);

    return () => {
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', syncWhenVisible);
      window.removeEventListener('focus', syncWhenVisible);
      window.removeEventListener('pageshow', syncWhenVisible);
    };
  }, []);

  const playChime = (order = null) => {
    if (!soundEnabledRef.current) return;
    playOrderNotification(order, { voice: true, desktop: true });
  };

  const connectSocket = (restaurantId) => {
    if (!restaurantId) return;
    if (socketRef.current) socketRef.current.disconnect();
    
    // Connect to backend socket
    const socket = io(BACKEND_URL);
    socketRef.current = socket;

    const rId = restaurantId.toString();

    socket.on('connect', () => {
      console.log('Kitchen socket connected, joining room for:', rId);
      socket.emit('joinKitchen', rId);
      // Fetch after joining so orders placed during a disconnect are not missed.
      syncKitchenOrdersRef.current?.();
    });

    const handledOrderIds = new Set();
    const handleNewOrder = (order) => {
      if (!order || !order._id) return;
      if (handledOrderIds.has(order._id)) return;
      handledOrderIds.add(order._id);
      setTimeout(() => handledOrderIds.delete(order._id), 6000);
      console.log('Kitchen received new order:', order.orderNumber, order.tableName);
      playChime(order);
      setOrders(prev => {
        const exists = prev.some(o => o._id === order._id);
        if (exists) return prev.map(o => o._id === order._id ? order : o);
        return [order, ...prev];
      });
    };

    socket.on('orderCreated', handleNewOrder);
    socket.on('new-order', handleNewOrder);
    socket.on('newOrder', handleNewOrder);

    const handleOrderUpdated = (updated) => {
      if (!updated) return;
      setOrders(prev => {
        // If completed or cancelled, remove from active kitchen view
        if (updated.status === 'Completed' || updated.status === 'Cancelled') {
          return prev.filter(o => o._id !== updated._id);
        }
        const exists = prev.some(o => o._id === updated._id);
        if (exists) {
          return prev.map(o => o._id === updated._id ? { ...o, ...updated } : o);
        }
        return [updated, ...prev];
      });
    };

    socket.on('orderUpdated', handleOrderUpdated);
    socket.on('order-updated', handleOrderUpdated);

    const handleOrderDeleted = (orderId) => {
      if (!orderId) return;
      const idStr = String(orderId);
      setOrders(prev => prev.filter(o => String(o._id) !== idStr));
    };

    socket.on('orderDeleted', handleOrderDeleted);
    socket.on('order-deleted', handleOrderDeleted);

  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const isRestAdmin = !!localStorage.getItem('restaurant_token');
      const storedRestId = localStorage.getItem('restaurant_id');
      
      let profile = null;
      try {
        if (isRestAdmin) {
          profile = await api.restaurant.getProfile();
        } else if (api.restaurant.getPublicProfile) {
          profile = await api.restaurant.getPublicProfile(slug);
        } else {
          profile = await api.restaurant.getProfile();
        }
      } catch (err) {
        console.warn('Profile fetch warning in kitchen panel:', err);
      }

      if (!profile) {
        profile = { _id: storedRestId, name: 'Kitchen KDS', slug };
      }
      setRestaurant(profile);

      await syncKitchenOrders();

      const targetRestId = profile?._id || storedRestId;
      if (targetRestId) {
        connectSocket(targetRestId);
      }
    } catch (err) {
      console.error('Failed to load kitchen dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, newStatus, servedBy = null) => {
    try {
      await api.kitchen.updateOrderStatus(orderId, newStatus, servedBy);
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  const updatePriority = async (orderId, newPriority) => {
    try {
      await api.kitchen.updatePriority(orderId, newPriority);
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, priority: newPriority } : o));
    } catch (err) {
      alert('Error updating priority: ' + err.message);
    }
  };

  const onDragStart = (e, orderId) => {
    e.dataTransfer.setData('orderId', orderId);
  };

  const onDrop = (e, targetColumnId) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('orderId');
    if (!orderId) return;

    if (targetColumnId === 'New') {
      updateStatus(orderId, 'New');
    } else if (targetColumnId === 'Preparing') {
      updateStatus(orderId, 'Preparing');
    } else if (targetColumnId === 'Ready') {
      updateStatus(orderId, 'Ready');
    }
  };

  const getElapsed = (order) => {
    const start = new Date(order.createdAt);
    const now = currentTime;
    return Math.max(0, Math.floor((now - start) / 60000));
  };

  const activeOrders = useMemo(() => {
    return orders.filter(o => ['New', 'Accepted', 'Preparing', 'Ready'].includes(o.status));
  }, [orders]);

  const fullScreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.();
  };

  // Grouped active orders by column
  const ordersByCol = useMemo(() => {
    return {
      New: activeOrders.filter(o => o.status === 'New'),
      Preparing: activeOrders.filter(o => o.status === 'Accepted' || o.status === 'Preparing'),
      Ready: activeOrders.filter(o => o.status === 'Ready')
    };
  }, [activeOrders]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <ChefHat className="w-12 h-12 text-amber-500 animate-bounce mb-3" />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-3"></div>
        <p className="text-slate-300 text-sm font-bold tracking-wide">Connecting Kitchen Display...</p>
      </div>
    );
  }

  if (restaurant?.features && restaurant.features.kitchenPanel === false) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4 text-3xl">
          🚫
        </div>
        <h2 className="text-xl font-black mb-2">Kitchen Display (KDS) Not Included</h2>
        <p className="text-slate-400 text-sm max-w-sm mb-6">
          The Kitchen Panel is not enabled in {restaurant.name || 'this restaurant'}'s current subscription plan.
        </p>
        <button
          onClick={() => {
            localStorage.removeItem('kitchen_token');
            localStorage.removeItem('kitchen_slug');
            navigate(`/admin/kitchen/${slug}/login`);
          }}
          className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold text-xs cursor-pointer"
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-[#f1f5f9] text-slate-800 flex flex-col font-sans select-none text-left">

      {/* ── Top Header Bar (Mobile + Desktop Optimized) ── */}
      <header className="bg-white border-b border-slate-200 px-3.5 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        
        {/* Left: Branding & Kitchen Title */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
            {restaurant?.brandingSettings?.kitchenAppLogo ? (
              <img 
                src={restaurant.brandingSettings.kitchenAppLogo.startsWith('http') ? restaurant.brandingSettings.kitchenAppLogo : `${BACKEND_URL}${restaurant.brandingSettings.kitchenAppLogo}`} 
                alt="Logo" 
                className="w-full h-full object-cover" 
              />
            ) : (
              <ChefHat className="w-5 h-5 text-orange-500" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight truncate">
                {restaurant?.brandingSettings?.kitchenAppName || 'Kitchen KDS'}
              </h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                Live Sync
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-semibold truncate">
              {restaurant?.name || 'Kitchen Order Display'}
            </p>
          </div>
        </div>

        {/* Right: Actions, Clock & Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Live Clock (Hidden on very narrow phones) */}
          <div className="hidden xs:flex h-8 sm:h-9 px-2 sm:px-3 border border-slate-200 bg-slate-50 rounded-xl items-center font-mono text-xs sm:text-sm font-bold text-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-400 mr-1.5 hidden sm:inline" />
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>

          {/* History Button */}
          <button
            onClick={() => setShowHistory(true)}
            className="h-8 sm:h-9 px-2.5 sm:px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl flex items-center gap-1.5 cursor-pointer text-xs font-bold transition-all shadow-2xs"
            title="Prepared Orders History"
          >
            <span>📜</span>
            <span className="hidden sm:inline">History</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(v => !v)}
            className={`h-8 w-8 sm:h-9 sm:w-9 border rounded-xl flex items-center justify-center cursor-pointer transition-all ${
              soundEnabled
                ? 'border-orange-200 bg-orange-50 text-orange-600'
                : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
            }`}
            title="Toggle Alert Chime"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {typeof Notification !== 'undefined' && Notification.permission !== 'granted' && (
            <button
              type="button"
              onClick={() => requestFirebaseNotificationPermission('kitchen')}
              className="h-8 w-8 sm:h-9 sm:w-9 border border-amber-200 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center cursor-pointer"
              title="Enable kitchen order notifications"
            >
              <BellRing className="w-4 h-4" />
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={fullScreen}
            className="hidden sm:flex h-9 w-9 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl items-center justify-center cursor-pointer transition-colors"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Dedicated Logout button only when logged in via Kitchen PIN */}
          {!localStorage.getItem('restaurant_token') && (
            <button
              onClick={() => {
                localStorage.removeItem('kitchen_token');
                localStorage.removeItem('kitchen_slug');
                navigate(`/admin/kitchen/${slug}/login`);
              }}
              className="h-8 sm:h-9 px-2.5 sm:px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors text-xs font-bold shadow-xs"
              title="Logout Kitchen"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Mobile Column Switcher (Visible only on mobile screens < 768px) ── */}
      <div className="md:hidden bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2 shadow-2xs">
        {COLUMNS.map(col => {
          const count = ordersByCol[col.id]?.length || 0;
          const isSelected = mobileTab === col.id;
          return (
            <button
              key={col.id}
              onClick={() => setMobileTab(col.id)}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                isSelected
                  ? col.id === 'New'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                    : col.id === 'Preparing'
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                      : 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="truncate">{col.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                isSelected ? 'bg-black/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Kanban Columns Board (Desktop: 3 Columns Grid | Mobile: Active Tab Column) ── */}
      <main className="flex-1 p-3 sm:p-4 grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 overflow-y-auto md:overflow-y-hidden md:h-[calc(100vh-65px)]">
        {COLUMNS.map((col) => {
          const style = COL_STYLE[col.color];
          const colOrders = ordersByCol[col.id] || [];
          
          // On mobile screens, only show the selected tab
          const isMobileHidden = mobileTab !== col.id;

          return (
            <section
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, col.id)}
              className={`bg-white border border-slate-200 rounded-2xl sm:rounded-3xl flex flex-col shadow-xs overflow-hidden min-h-[380px] md:min-h-0 ${
                isMobileHidden ? 'hidden md:flex' : 'flex'
              }`}
            >
              {/* Column Header */}
              <div className={`px-4 py-3 sm:py-3.5 border-b flex items-center justify-between shrink-0 ${style.header}`}>
                <div className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${style.dot} shadow-2xs`}></span>
                  <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider">{col.label}</h2>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black shadow-2xs ${style.badge}`}>
                  {colOrders.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex-1 p-3 sm:p-3.5 overflow-y-auto space-y-3 hide-scrollbar bg-slate-50/50">
                {colOrders.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center">
                    <UtensilsCrossed className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                    <p className="text-xs font-bold text-slate-600">No {col.label.toLowerCase()}</p>
                    <span className="text-[11px] text-slate-400 mt-0.5">Orders will appear here in real-time</span>
                  </div>
                ) : (
                  colOrders.map((order) => {
                    const elapsed = getElapsed(order);
                    const isUrgent = elapsed >= 20;
                    const isWarning = elapsed >= 10 && elapsed < 20;
                    const priority = order.priority || 'Normal';

                    return (
                      <article
                        key={order._id}
                        draggable
                        onDragStart={(e) => onDragStart(e, order._id)}
                        className={`rounded-2xl border bg-white p-2.5 sm:p-3 shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing transition-all ${PRIORITY_STYLE[priority]} ${
                          isUrgent
                            ? 'ring-2 ring-rose-500/80 bg-rose-50/30'
                            : isWarning
                              ? 'ring-2 ring-amber-500/60 bg-amber-50/30'
                              : 'border-slate-200'
                        }`}
                      >
                        {/* Card Header: Table + Time + Priority */}
                        <div className="flex items-start justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {PRIORITY_ICON[priority]}
                              <span className="font-black text-slate-900 text-sm sm:text-base tracking-tight">
                                {order.tableName}
                              </span>
                              {order.placedBy === 'waiter' && (
                                <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-black uppercase">
                                  Waiter
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 font-bold block mt-0.5">
                              {order.orderNumber || `Order #${order._id?.slice(-4)}`}
                            </span>
                            <span className="text-[10px] text-slate-600 font-semibold block mt-0.5">
                              Customer: {order.customerId?.name || (order.placedBy === 'waiter' ? 'Guest' : order.customerName) || 'Guest'}
                            </span>
                          </div>

                          {/* Elapsed Timer Pill */}
                          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black shrink-0 ${
                            isUrgent
                              ? 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse'
                              : isWarning
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            <Clock className="w-3.5 h-3.5" />
                            <span>{elapsed}m</span>
                          </div>
                        </div>

                        {/* Items List */}
                        <div className="space-y-1 mb-2">
                          {order.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between items-start text-xs gap-2 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                              <div className="min-w-0">
                                <span className="text-slate-900 font-bold leading-tight block">
                                  {it.name}
                                </span>
                                {it.variantName && (
                                  <span className="text-amber-700 text-[11px] font-semibold block mt-0.5">
                                    Size: {it.variantName}
                                  </span>
                                )}
                              </div>
                              <span className="px-2 py-0.5 bg-white text-slate-800 border border-slate-200 rounded-lg font-black text-xs shrink-0 shadow-2xs">
                                ×{it.quantity}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Special Diner Notes / Instructions */}
                        {order.specialInstructions && (
                          <div className="mb-2 bg-amber-50 border border-amber-200 rounded-xl px-2 py-1.5 text-xs text-amber-800 font-semibold leading-relaxed">
                            📝 Note: {order.specialInstructions}
                          </div>
                        )}

                        {/* Action Bar (Mobile-Friendly Touch Targets) */}
                        <div className="flex items-center gap-2">
                          {/* Priority dropdown */}
                          <select
                            value={priority}
                            onChange={(e) => updatePriority(order._id, e.target.value)}
                            className="h-10 w-24 border border-slate-200 bg-white text-slate-800 rounded-xl text-xs font-bold outline-none px-2 cursor-pointer focus:ring-2 focus:ring-[#003b1b]/20"
                          >
                            <option value="Normal">Normal</option>
                            <option value="High">🔥 High</option>
                            <option value="Rush">⚡ Rush</option>
                          </select>

                          {/* Status Transition Button */}
                          {col.id === 'Preparing' ? (
                            <button
                              onClick={() => updateStatus(order._id, order.status === 'Accepted' ? 'Preparing' : 'Ready')}
                              className={`h-10 flex-1 font-black rounded-xl text-xs uppercase cursor-pointer transition-all shadow-xs ${style.btn}`}
                            >
                              {order.status === 'Accepted' ? 'Start Cooking' : 'Mark Ready ✓'}
                            </button>
                          ) : col.next ? (
                            <button
                              onClick={() => updateStatus(order._id, col.next)}
                              className={`h-10 flex-1 font-black rounded-xl text-xs uppercase cursor-pointer transition-all shadow-xs ${style.btn}`}
                            >
                              {col.next === 'Preparing' ? 'Accept & Cook →' : `Move to ${col.next}`}
                            </button>
                          ) : null}

                          {col.id === 'Ready' && (
                            <button
                              onClick={() => updateStatus(order._id, 'Served', 'Kitchen')}
                              className="h-10 flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black rounded-xl text-xs uppercase cursor-pointer transition-all shadow-xs"
                            >
                              Mark Served ✓
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </main>

      {/* ── Prepared Order History Modal (Mobile-Responsive Bottom-Sheet) ── */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 text-slate-800">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <ChefHat className="w-5 h-5 text-orange-500" />
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Prepared Orders History (Today)</h3>
              </div>
              <button 
                onClick={() => setShowHistory(false)}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer transition-all shadow-2xs"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4">
              {orders.filter(o => ['Served', 'Completed'].includes(o.status)).length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">No orders prepared or served yet today.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
                  {orders
                    .filter(o => ['Served', 'Completed'].includes(o.status))
                    .map(ord => {
                      const elapsedPrep = ord.readyAt && ord.acceptedAt
                        ? Math.max(1, Math.round((new Date(ord.readyAt) - new Date(ord.acceptedAt)) / 60000))
                        : null;
                      return (
                        <div key={ord._id} className="border border-slate-200/90 rounded-2xl p-4 bg-white shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-lg font-black text-[10px] uppercase">
                                {ord.tableName}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono font-bold">{ord.orderNumber}</span>
                            </div>
                            
                            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-xs font-medium space-y-1 mt-2">
                              {ord.items.map((it, idx) => (
                                <div key={idx} className="flex justify-between text-slate-700">
                                  <span>{it.name} <strong className="text-slate-400 font-bold">×{it.quantity}</strong></span>
                                  <span className="font-mono text-slate-500">₹{it.price * it.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between text-[10px] text-slate-500 font-bold">
                            <div className="space-y-0.5">
                              {elapsedPrep && <div>⏱️ Cook Time: {elapsedPrep} mins</div>}
                              {ord.servedBy && <div>🤵 Served by: <span className="text-emerald-700">{ord.servedBy}</span></div>}
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              ord.status === 'Completed' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {ord.status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Custom Alert & Confirm Modal ── */}
      {modalAlert && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 relative text-left flex flex-col border border-slate-100 text-slate-800">
            <h3 className="font-extrabold text-base text-slate-900 leading-snug">{modalAlert.title}</h3>
            <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed whitespace-pre-line">{modalAlert.message}</p>
            <div className="mt-6 flex gap-2.5">
              {modalAlert.type === 'confirm' && (
                <button
                  onClick={modalAlert.onCancel}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 font-bold text-center text-xs cursor-pointer transition-colors"
                >
                  {modalAlert.cancelText || 'Cancel'}
                </button>
              )}
              <button
                onClick={modalAlert.onConfirm}
                className="flex-1 py-2.5 bg-[#003b1b] hover:bg-[#166534] text-white font-black rounded-xl shadow-md text-center text-xs cursor-pointer transition-colors"
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

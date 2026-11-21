import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { api } from '../api';
import BillPrint from './BillPrint';
import {
  Receipt, RefreshCw, LogOut, CheckCircle, Banknote,
  TrendingUp, Printer, Check, Clock, AlertCircle,
  UtensilsCrossed, User, ChefHat, Wifi, WifiOff, Download
} from 'lucide-react';
import { requestFirebaseNotificationPermission } from '../firebase';
export default function CounterPanel() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [modalAlert, setModalAlert] = useState(null);

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
    // Override window.alert
    const originalAlert = window.alert;
    window.alert = (msg) => {
      showAlert(String(msg));
    };
    return () => {
      window.alert = originalAlert;
    };
  }, []);
  const [summary, setSummary] = useState({ count: 0, revenue: 0, averageValue: 0 });
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [pwaDiagnostics, setPwaDiagnostics] = useState({
    swRegistered: 'Checking...',
    swScope: 'Checking...',
    manifestUrl: 'Checking...',
    activeWorker: 'Checking...'
  });
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('restaurant_token') || localStorage.getItem('waiter_token');
    if (!token) { navigate('/admin/login'); return; }
    fetchCounterData();
    connectSocket();
    requestFirebaseNotificationPermission('counter');
    
    if (slug) {
      // Clean up any existing manifests to prevent duplicates/conflicts
      const existing = document.querySelectorAll('link[rel="manifest"]');
      existing.forEach(el => el.remove());

      const link = document.createElement('link');
      link.rel = 'manifest';
      link.crossOrigin = 'anonymous';
      link.href = `http://localhost:5000/api/manifest/${slug}/counter?origin=${window.location.origin}&t=${Date.now()}`;
      document.head.appendChild(link);
      setPwaDiagnostics(prev => ({ ...prev, manifestUrl: link.href }));
    }

    // Detect if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsAppInstalled(true);
    }
    const installedHandler = () => setIsAppInstalled(true);
    window.addEventListener('appinstalled', installedHandler);

    const handler = (e) => {
      console.log('beforeinstallprompt event fired inside CounterPanel!');
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Diagnostics checks
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        if (regs.length === 0) {
          setPwaDiagnostics(prev => ({ ...prev, swRegistered: 'No active service workers registered for this origin.' }));
        } else {
          const details = regs.map(r => `Scope: ${r.scope} (Active: ${r.active ? 'Yes' : 'No'})`).join('; ');
          setPwaDiagnostics(prev => ({
            ...prev,
            swRegistered: `Yes (${regs.length} found)`,
            swScope: details,
            activeWorker: regs[0].active ? 'Active' : 'Not active / waiting'
          }));
        }
      });
    } else {
      setPwaDiagnostics(prev => ({ ...prev, swRegistered: 'ServiceWorker not supported in this browser!' }));
    }

    return () => { 
      if (socketRef.current) socketRef.current.disconnect(); 
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, [slug]);

  const fetchCounterData = async () => {
    try {
      setLoading(true);
      const [orderList, stats, menuData] = await Promise.all([
        api.counter.getOrders(),
        api.counter.getSalesSummary(),
        api.customer.getMenu(slug).catch(() => null)
      ]);
      setOrders(orderList);
      setSummary(stats);
      if (menuData?.restaurant) {
        setRestaurant(menuData.restaurant);
      }
    } catch (err) {
      console.error(err);
      if (err.status === 401 || err.status === 403) navigate('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (restaurant?.logo) {
      let iconLink = document.querySelector("link[rel~='icon']");
      if (!iconLink) {
        iconLink = document.createElement('link');
        iconLink.rel = 'icon';
        document.head.appendChild(iconLink);
      }
      iconLink.href = restaurant.logo.startsWith('http') ? restaurant.logo : `http://localhost:5000${restaurant.logo}`;

      let appleIconLink = document.querySelector("link[rel='apple-touch-icon']");
      if (!appleIconLink) {
        appleIconLink = document.createElement('link');
        appleIconLink.rel = 'apple-touch-icon';
        document.head.appendChild(appleIconLink);
      }
      appleIconLink.href = iconLink.href;
    }
    if (restaurant?.name) {
      document.title = `${restaurant.name} | Counter`;
    }
  }, [restaurant]);

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      osc.start(); osc.stop(audioCtx.currentTime + 0.2);
      setTimeout(() => {
        const o2 = audioCtx.createOscillator(), g2 = audioCtx.createGain();
        o2.connect(g2); g2.connect(audioCtx.destination);
        o2.frequency.setValueAtTime(880, audioCtx.currentTime);
        g2.gain.setValueAtTime(0.2, audioCtx.currentTime);
        o2.start(); o2.stop(audioCtx.currentTime + 0.25);
      }, 200);
    } catch (e) { console.error(e); }
  };

  const connectSocket = () => {
    const restId = localStorage.getItem('restaurant_id');
    if (!restId) return;
    socketRef.current = io('http://localhost:5000');
    socketRef.current.on('connect', () => setIsConnected(true));
    socketRef.current.on('disconnect', () => setIsConnected(false));
    socketRef.current.emit('joinRestaurant', restId);
    socketRef.current.on('orderCreated', (newOrder) => {
      setOrders(prev => [newOrder, ...prev].sort((a, b) => b.billRequested - a.billRequested || new Date(b.createdAt) - new Date(a.createdAt)));
      playNotificationSound();
    });
    socketRef.current.on('orderUpdated', (updated) => {
      if (updated.status === 'Completed' || updated.status === 'Cancelled') {
        setOrders(prev => prev.filter(o => o._id !== updated._id));
      } else {
        setOrders(prev => prev.map(o => o._id === updated._id ? updated : o).sort((a, b) => b.billRequested - a.billRequested || new Date(b.createdAt) - new Date(a.createdAt)));
      }
      refreshSummary();
    });
  };

  const refreshSummary = async () => {
    try { setSummary(await api.counter.getSalesSummary()); } catch (e) { console.error(e); }
  };

  const handleSettleOrder = async (orderId) => {
    if (!await showConfirm('Mark this order as Completed and settle billing?')) return;
    try {
      await api.counter.completeOrder(orderId);
      setOrders(prev => prev.filter(o => o._id !== orderId));
      refreshSummary();
    } catch (err) { alert('Failed to settle order'); }
  };

  const handleOpenPrint = (order) => { setSelectedOrder(order); setIsPrintModalOpen(true); };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User choice for Counter PWA install: ${outcome}`);
    setDeferredPrompt(null);
  };

  const handleLogout = () => { localStorage.removeItem('restaurant_token'); navigate('/admin/login'); };

  const billRequestedCount = orders.filter(o => o.billRequested).length;

  return (
    <div className="min-h-screen bg-[#0d1117] text-white font-sans flex flex-col">

      {/* Header */}
      <header className="bg-[#161b22] border-b border-white/5 px-6 py-3.5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Receipt className="w-4.5 h-4.5 text-emerald-400" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white leading-none">{restaurant?.name || 'Counter Billing'}</h1>
            <p className="text-[10px] text-slate-400 mt-0.5">Counter Terminal</p>
          </div>
          {/* Live connection badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ml-2 ${isConnected ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-700/30 border-slate-600/30 text-slate-400'}`}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? 'Live' : 'Offline'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isAppInstalled ? (
            <button
              type="button"
              onClick={() => { if (deferredPrompt) { handleInstallClick(); } else { setShowInstallGuide(true); } }}
              className={`h-9 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all border ${
                deferredPrompt
                  ? 'border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-600 text-emerald-400 hover:text-white animate-pulse'
                  : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
              }`}
              title={deferredPrompt ? 'Install App' : 'How to Install'}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{deferredPrompt ? 'Install App' : 'Install Guide'}</span>
            </button>
          ) : (
            <div className="h-9 px-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <span>Installed ✓</span>
            </div>
          )}
          <button
            type="button"
            onClick={fetchCounterData}
            className="w-9 h-9 border border-white/10 hover:bg-white/5 flex items-center justify-center rounded-xl text-slate-400 hover:text-white cursor-pointer transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="h-9 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-600 px-4 rounded-xl text-xs font-semibold text-rose-400 hover:text-white flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Install Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-[200] bg-black/70 flex items-end sm:items-center justify-center p-4" onClick={() => setShowInstallGuide(false)}>
          <div className="bg-[#1c2128] border border-white/10 rounded-2xl p-6 max-w-sm w-full text-left" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Download className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-white font-bold text-sm">Install Counter App</h3>
              </div>
              <button onClick={() => setShowInstallGuide(false)} className="text-slate-400 hover:text-white cursor-pointer text-lg">✕</button>
            </div>
            <p className="text-slate-400 text-xs mb-4">Billing counter app install karne ke liye:</p>
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <p className="text-slate-300 text-xs"><strong>Chrome / Edge:</strong> Address bar mein ⊕ install icon click karein, ya browser menu → "Install app"</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <p className="text-slate-300 text-xs"><strong>Android:</strong> Chrome menu ⋮ → "Add to Home Screen"</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <p className="text-slate-300 text-xs"><strong>iPhone (Safari):</strong> Share icon → "Add to Home Screen"</p>
              </div>
            </div>

            {/* PWA System Diagnostics Accordion */}
            <details className="mt-4 pt-3 border-t border-white/5 text-[10px]">
              <summary className="text-slate-400 font-bold cursor-pointer hover:text-slate-200 select-none">⚙️ PWA Diagnostics (Developer Info)</summary>
              <div className="mt-2 space-y-1.5 bg-black/30 p-2.5 rounded-lg font-mono text-[9px] text-slate-400 border border-white/5 break-all">
                <div><strong>SW Registered:</strong> {pwaDiagnostics.swRegistered}</div>
                <div><strong>Active Worker:</strong> {pwaDiagnostics.activeWorker}</div>
                <div><strong>Manifest API:</strong> {pwaDiagnostics.manifestUrl}</div>
                <div><strong>Registered SW List:</strong> {pwaDiagnostics.swScope}</div>
              </div>
            </details>

            <p className="text-slate-500 text-[10px] mt-4 border-t border-white/5 pt-3">Cashier screen full-screen mode mein browser bar ke bina chalegi</p>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 p-5 max-w-7xl mx-auto w-full space-y-5 text-left">

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#161b22] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Settled Today</p>
              <h3 className="text-2xl font-bold text-white mt-1">{summary.count} <span className="text-sm font-medium text-slate-400">orders</span></h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-700/40 border border-white/5 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-slate-300" />
            </div>
          </div>
          <div className="bg-[#161b22] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Daily Revenue</p>
              <h3 className="text-2xl font-bold text-white mt-1">₹{summary.revenue.toLocaleString()}</h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Banknote className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="bg-[#161b22] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Avg Ticket Value</p>
              <h3 className="text-2xl font-bold text-white mt-1">₹{summary.averageValue}</h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-[#161b22] border border-white/5 rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-white">Billing Queue</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Active orders pending settlement</p>
            </div>
            <div className="flex items-center gap-2">
              {billRequestedCount > 0 && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 border border-amber-500/25 text-amber-400 rounded-full text-[10px] font-bold animate-pulse">
                  <AlertCircle className="w-3 h-3" />
                  {billRequestedCount} Bill Request{billRequestedCount > 1 ? 's' : ''}
                </span>
              )}
              <span className="px-3 py-1.5 bg-white/5 border border-white/10 text-slate-300 rounded-full text-[10px] font-semibold">
                {orders.length} Active
              </span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
              <p className="text-slate-400 text-xs mt-3">Loading billing data...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-14 h-14 bg-white/5 border border-white/10 flex items-center justify-center rounded-2xl mx-auto mb-3">
                <UtensilsCrossed className="w-6 h-6 text-slate-500" />
              </div>
              <h3 className="font-semibold text-slate-300 text-sm">No active orders</h3>
              <p className="text-slate-500 text-xs mt-1">Bill requests from tables will appear here automatically.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/5 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Table</th>
                    <th className="px-5 py-3">Items</th>
                    <th className="px-5 py-3">Placed By</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Total</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {orders.map((ord) => (
                    <tr
                      key={ord._id}
                      className={`transition-colors ${
                        ord.billRequested
                          ? 'bg-amber-500/5 border-l-2 border-l-amber-500 hover:bg-amber-500/10'
                          : 'hover:bg-white/3'
                      }`}
                    >
                      {/* Table name */}
                      <td className="px-5 py-4">
                        <span className="font-bold text-sm text-white block">{ord.tableName}</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">{ord.orderNumber}</span>
                      </td>

                      {/* Items list */}
                      <td className="px-5 py-4 min-w-[200px]">
                        <div className="space-y-1 max-h-16 overflow-y-auto pr-1">
                          {ord.items.map((it, i) => (
                            <div key={i} className="flex justify-between gap-4 text-slate-300">
                              <span className="truncate">{it.name} <span className="text-slate-500">×{it.quantity}</span></span>
                              <span className="text-slate-400 shrink-0">₹{it.price * it.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Placed by */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                          ord.placedBy === 'waiter'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }`}>
                          {ord.placedBy === 'waiter' ? <ChefHat className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          {ord.placedBy || 'customer'}
                        </span>
                      </td>

                      {/* Bill status */}
                      <td className="px-5 py-4">
                        {ord.billRequested ? (
                          <span className="inline-flex items-center gap-1.5 text-amber-400 font-bold text-[10px] uppercase tracking-wide">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                            Bill Requested
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-slate-400 text-[10px]">
                            <Clock className="w-3 h-3" />
                            Dining In
                          </span>
                        )}
                      </td>

                      {/* Total */}
                      <td className="px-5 py-4">
                        <span className="font-bold text-base text-white">₹{ord.totalAmount}</span>
                        {ord.subtotal && ord.subtotal !== ord.totalAmount && (
                          <span className="text-[10px] text-slate-500 block mt-0.5">Sub: ₹{ord.subtotal}</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenPrint(ord)}
                            className="h-8 px-3 border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-all text-[11px]"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Print
                          </button>
                          <button
                            onClick={() => handleSettleOrder(ord._id)}
                            className="h-8 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-all text-[11px]"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Settle
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {isPrintModalOpen && selectedOrder && (
        <BillPrint order={selectedOrder} onClose={() => setIsPrintModalOpen(false)} />
      )}

      {/* Premium Alert/Confirm Modal */}
      {modalAlert && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn text-slate-800">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 relative text-left flex flex-col border border-slate-100">
            <h3 className="font-extrabold text-base text-slate-800 leading-snug">{modalAlert.title}</h3>
            <p className="text-[11px] text-slate-500 font-medium mt-2 leading-relaxed whitespace-pre-line">{modalAlert.message}</p>
            <div className="mt-6 flex gap-2.5">
              {modalAlert.type === 'confirm' && (
                <button
                  onClick={modalAlert.onCancel}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-center text-xs cursor-pointer transition-colors"
                >
                  {modalAlert.cancelText || 'Cancel'}
                </button>
              )}
              <button
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

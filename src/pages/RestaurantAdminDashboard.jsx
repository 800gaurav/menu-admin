import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import io from 'socket.io-client';
import { api, removeRestaurantToken, BACKEND_URL } from '../api';

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const ADMIN_URL = (import.meta.env.VITE_ADMIN_URL || (isLocal ? 'http://localhost:5175' : window.location.origin)).replace(/\/+$/, '');
const USER_URL = (import.meta.env.VITE_USER_URL || (isLocal ? 'http://localhost:5173' : window.location.origin)).replace(/\/+$/, '');
const WAITER_URL = (import.meta.env.VITE_WAITER_URL || (isLocal ? 'http://localhost:5174' : window.location.origin)).replace(/\/+$/, '');
import BillPrint from './BillPrint';
import { 
  TrendingUp, 
  ClipboardList, 
  Receipt, 
  History, 
  UtensilsCrossed, 
  QrCode, 
  Users, 
  UserCheck, 
  Settings, 
  X, 
  ChefHat, 
  LogOut, 
  ExternalLink,
  Menu,
  ChevronLeft,
  ChevronRight,
  Globe,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Lock
} from 'lucide-react';

// Tab Component Imports
import OverviewTab from '../components/dashboard/OverviewTab';
import OrdersTab from '../components/dashboard/OrdersTab';
import BillingTab from '../components/dashboard/BillingTab';
import { optimizeMenuItemImage, optimizeBannerImage, optimizeLogoImage } from '../utils/imageOptimizer';
import BillingHistoryTab from '../components/dashboard/BillingHistoryTab';
import MenuTab from '../components/dashboard/MenuTab';
import TablesTab from '../components/dashboard/TablesTab';
import CrmTab from '../components/dashboard/CrmTab';
import WaitersTab from '../components/dashboard/WaitersTab';
import SettingsTab from '../components/dashboard/SettingsTab';
import { requestFirebaseNotificationPermission } from '../firebase';
import { playOrderNotification } from '../utils/soundAlert';

// Modal Component Imports
import OrderInvoiceModal from '../components/dashboard/OrderInvoiceModal';
import CounterOrderModal from '../components/dashboard/CounterOrderModal';
import CategoryModal from '../components/dashboard/CategoryModal';
import MenuItemModal from '../components/dashboard/MenuItemModal';
import TableModal from '../components/dashboard/TableModal';
import BulkPriceModal from '../components/dashboard/BulkPriceModal';

// Robust helper to merge incoming order updates without dropping populated customer/waiter objects
const mergeOrderData = (existingOrder, incomingOrder) => {
  if (!existingOrder) return incomingOrder;
  if (!incomingOrder) return existingOrder;

  // Resolve customer: prioritize populated object with name, fallback to existing then incoming
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

export default function RestaurantAdminDashboard() {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('adminActiveTab') || 'overview');
  const [restaurant, setRestaurant] = useState(null);
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
    // Override default window.alert
    const originalAlert = window.alert;
    window.alert = (msg) => {
      showAlert(String(msg));
    };

    // Expose window.showConfirm
    window.showConfirm = showConfirm;

    return () => {
      window.alert = originalAlert;
      delete window.showConfirm;
    };
  }, []);
  const [stats, setStats] = useState({
    todayOrdersCount: 0,
    todayRevenue: 0,
    activeOrdersCount: 0
  });

  // State Lists
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [advancedAnalytics, setAdvancedAnalytics] = useState(null);

  // Billing & Cashier Panel States
  const [billingOrders, setBillingOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [billingSummary, setBillingSummary] = useState({ count: 0, revenue: 0, averageValue: 0 });
  const [billingTableFilter, setBillingTableFilter] = useState('');
  const [historyTab, setHistoryTab] = useState('all');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedPrintOrder, setSelectedPrintOrder] = useState(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Filter states
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  
  // Modals / Modifiers
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Forms Modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [catFormData, setCatFormData] = useState({ name: '', isHidden: false, id: null });

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemFormData, setItemFormData] = useState({
    name: '', description: '', price: '', categoryId: '', tags: ['Veg'], badges: [], image: '', id: null,
    hasVariants: false, variants: [], inStock: true
  });

  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [tableFormData, setTableFormData] = useState({ name: '', type: 'Table', id: null });

  const [bulkPriceData, setBulkPriceData] = useState({ value: '', type: 'percentage' });
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isTakeOrderModalOpen, setIsTakeOrderModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('admin_sound_enabled') !== 'false';
  });
  const soundEnabledRef = useRef(soundEnabled);
  const [orderNotificationsEnabled, setOrderNotificationsEnabled] = useState(() => localStorage.getItem('admin_order_push_enabled') !== 'false');
  const orderNotificationsEnabledRef = useRef(orderNotificationsEnabled);
  const [newOrderToast, setNewOrderToast] = useState(null);
  const newOrderToastTimeout = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [logoUploadStatus, setLogoUploadStatus] = useState({ loading: false, error: null, success: null });
  const loadedTabs = useRef(new Set());
  const socketRef = useRef(null);
  const handledNewOrderIdsRef = useRef(new Set());
  const audioContextRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    const unlockAudio = () => {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new AudioContextClass();
        }
        if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume();
      } catch (error) {
        console.warn('Could not unlock order alert audio:', error);
      }
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  useEffect(() => {
    fetchInitialData();
    if (orderNotificationsEnabledRef.current) {
      requestFirebaseNotificationPermission('restaurantadmin').then(token => {
        if (token) api.notifications.setPreference(token, orderNotificationsEnabledRef.current).catch(error => console.error('Could not sync admin push preference:', error));
      });
    }
    
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    orderNotificationsEnabledRef.current = orderNotificationsEnabled;
  }, [orderNotificationsEnabled]);

  useEffect(() => {
    fetchTabData(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (restaurant?.slug) {
      // Clean up any existing manifests to prevent duplicates/conflicts
      const existing = document.querySelectorAll('link[rel="manifest"]');
      existing.forEach(el => el.remove());

      const link = document.createElement('link');
      link.rel = 'manifest';
      link.crossOrigin = 'anonymous';
      link.href = `${BACKEND_URL}/api/manifest/${restaurant.slug}/admin?origin=${window.location.origin}&t=${Date.now()}`;
      document.head.appendChild(link);
    }
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
      document.title = restaurant.brandingSettings?.pageTitle || `${restaurant.name} | Admin`;
    }
  }, [restaurant]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      let profile = null;
      try {
        profile = await api.restaurant.getProfile();
        setRestaurant({
          brandColor: '#003b1b',
          brandingSettings: {},
          socialLinks: {},
          actionButtons: [],
          customerDataSettings: { enabled: false, fields: {} },
          ...profile
        });
      } catch (err) {
        console.error('Failed to load profile:', err);

        if (err.status === 401 || err.status === 403) {
          removeRestaurantToken();
          navigate('/admin/login');
          return;
        }
      }

      if (profile) {
        try {
          const statsData = await api.restaurant.getStats();
          setStats(statsData);
        } catch (err) {
          console.error('Failed to load dashboard stats:', err);
        }
        
        loadedTabs.current.add('overview');
        loadedTabs.current.add('settings');
        api.tables.getTables().then(tList => { if (Array.isArray(tList)) setTables(tList); }).catch(() => {});
        connectSocket(profile._id);
      }
    } catch (err) {
      console.error(err);
      if (err.status === 401 || err.status === 403) {
        removeRestaurantToken();
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTabData = async (tab) => {
    const isFirstLoad = !loadedTabs.current.has(tab);
    try {
      if (isFirstLoad) {
        setTabLoading(true);
      }
      if (tab === 'overview') {
        const statsData = await api.restaurant.getStats();
        setStats(statsData);
      } else if (tab === 'orders') {
        const data = await api.orders.getOrders({ live: 'true' });
        setOrders(data);
      } else if (tab === 'billing') {
        const [activeList, historyList, summaryStats, tablesList] = await Promise.all([
          api.counter.getOrders(),
          api.orders.getOrders({ limit: 200 }),
          api.counter.getSalesSummary(),
          api.tables.getTables().catch(() => [])
        ]);
        setBillingOrders(activeList);
        setHistoryOrders(historyList);
        setBillingSummary(summaryStats);
        setTables(tablesList);
      } else if (tab === 'billing-history') {
        const tablesList = await api.tables.getTables().catch(() => []);
        if (Array.isArray(tablesList)) setTables(tablesList);
      } else if (tab === 'menu') {
        const [cats, items] = await Promise.all([api.menu.getCategories(), api.menu.getItems()]);
        setCategories(cats);
        setMenuItems(items);
      } else if (tab === 'tables') {
        const data = await api.tables.getTables();
        setTables(data);
      } else if (tab === 'crm') {
        const [customersData, analytics] = await Promise.all([
          api.crm.getCustomers().catch(() => []),
          api.analytics.getDashboard(30).catch(() => null)
        ]);
        setCustomers(customersData);
        setAdvancedAnalytics(analytics);
      } else if (tab === 'settings') {
        const profile = await api.restaurant.getProfile();
        setRestaurant(prev => prev ? { ...prev, ...profile } : profile);
      }
      loadedTabs.current.add(tab);
    } catch (err) {
      console.error(err);
      if (err.status === 401 || err.status === 403) {
        removeRestaurantToken();
        navigate('/admin/login');
      }
    } finally {
      if (isFirstLoad) {
        setTabLoading(false);
      }
    }
  };

  const playNotificationSound = (force = false, order = null) => {
    if (!soundEnabledRef.current && !force) return;
    playOrderNotification(order, { voice: true, desktop: true });
  };

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem('admin_sound_enabled', String(next));
      if (next) {
        // Preview loud chime when toggled on
        playOrderNotification(null, { voice: false, desktop: false });
      }
      return next;
    });
  };

  const toggleOrderNotifications = async () => {
    const nextEnabled = !orderNotificationsEnabled;
    let token = localStorage.getItem('menuos_fcm_token_restaurantadmin');

    if (nextEnabled) {
      if (typeof Notification === 'undefined' || Notification.permission === 'denied') {
        window.alert('Notifications are blocked in browser settings. Allow notifications for this site, then try again.');
        return;
      }
      token = await requestFirebaseNotificationPermission('restaurantadmin');
      if (!token) {
        window.alert('Admin push notifications could not be enabled. Check browser notification permission and try again.');
        return;
      }
    }

    setOrderNotificationsEnabled(nextEnabled);
    orderNotificationsEnabledRef.current = nextEnabled;
    localStorage.setItem('admin_order_push_enabled', String(nextEnabled));
    if (!nextEnabled) {
      setNewOrderToast(null);
      if (newOrderToastTimeout.current) clearTimeout(newOrderToastTimeout.current);
    }
    if (token) {
      try {
        await api.notifications.setPreference(token, nextEnabled);
      } catch (error) {
        if (!nextEnabled && error.status === 404 && error.message === 'This device is not registered for this panel') return;
        setOrderNotificationsEnabled(!nextEnabled);
        orderNotificationsEnabledRef.current = !nextEnabled;
        localStorage.setItem('admin_order_push_enabled', String(!nextEnabled));
        window.alert(error.message || 'Could not save notification preference. Please try again.');
      }
    }
  };

  const refreshBillingSummary = async () => {
    try {
      const statsSummary = await api.counter.getSalesSummary();
      setBillingSummary(statsSummary);
    } catch (err) {
      console.error(err);
    }
  };

  const connectSocket = (restaurantId) => {
    if (socketRef.current) socketRef.current.disconnect();
    socketRef.current = io(BACKEND_URL);
    
    socketRef.current.on('connect', () => {
      console.log('Admin socket connected, rejoining room...');
      socketRef.current.emit('joinRestaurant', restaurantId);
      if (activeTab) fetchTabData(activeTab);
    });

    socketRef.current.on('orderCreated', (newOrder) => {
      const orderId = newOrder?._id ? String(newOrder._id) : null;
      if (orderId && handledNewOrderIdsRef.current.has(orderId)) return;
      if (orderId) {
        handledNewOrderIdsRef.current.add(orderId);
        setTimeout(() => handledNewOrderIdsRef.current.delete(orderId), 6000);
      }

      setOrders((prev) => {
        const exists = prev.some(o => o._id === newOrder._id);
        if (exists) return prev.map(o => o._id === newOrder._id ? mergeOrderData(o, newOrder) : o);
        return [newOrder, ...prev];
      });
      
      // Only add to Cashier/Billing tab if the order is already Served
      setBillingOrders((prev) => {
        if (newOrder.status === 'Served') {
          const exists = prev.some(o => o._id === newOrder._id);
          if (exists) return prev.map(o => o._id === newOrder._id ? mergeOrderData(o, newOrder) : o);
          return [newOrder, ...prev].sort((a, b) => b.billRequested - a.billRequested || new Date(b.createdAt) - new Date(a.createdAt));
        }
        return prev;
      });

      if (newOrder.status === 'Completed' || newOrder.status === 'Cancelled') {
        setHistoryOrders((prev) => {
          const exists = prev.some(o => o._id === newOrder._id);
          if (exists) return prev.map(o => o._id === newOrder._id ? mergeOrderData(o, newOrder) : o);
          return [newOrder, ...prev].slice(0, 200);
        });
      }

      if (orderNotificationsEnabledRef.current) {
        setNewOrderToast(newOrder);
        if (newOrderToastTimeout.current) clearTimeout(newOrderToastTimeout.current);
        newOrderToastTimeout.current = setTimeout(() => setNewOrderToast(null), 8000);
        playNotificationSound(false, newOrder);
      }
      refreshStats();
      refreshBillingSummary();
    });

    socketRef.current.on('orderUpdated', (updatedOrder) => {
      setOrders((prev) => prev.map(o => o._id === updatedOrder._id ? mergeOrderData(o, updatedOrder) : o));
      
      // Billing/Cashier tab strictly holds orders whose status is 'Served'
      setBillingOrders((prev) => {
        if (updatedOrder.status === 'Served') {
          const exists = prev.some(o => o._id === updatedOrder._id);
          if (exists) {
            return prev.map(o => o._id === updatedOrder._id ? mergeOrderData(o, updatedOrder) : o)
                       .sort((a, b) => b.billRequested - a.billRequested || new Date(b.createdAt) - new Date(a.createdAt));
          } else {
            return [updatedOrder, ...prev].sort((a, b) => b.billRequested - a.billRequested || new Date(b.createdAt) - new Date(a.createdAt));
          }
        } else {
          return prev.filter(o => o._id !== updatedOrder._id);
        }
      });

      if (updatedOrder.status === 'Completed' || updatedOrder.status === 'Cancelled') {
        setHistoryOrders((prev) => {
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

    const handleOrderDeleted = (orderId) => {
      if (!orderId) return;
      const idStr = String(orderId);
      setOrders((prev) => prev.filter(o => String(o._id) !== idStr));
      setBillingOrders((prev) => prev.filter(o => String(o._id) !== idStr));
      setHistoryOrders((prev) => prev.filter(o => String(o._id) !== idStr));
      refreshStats();
      refreshBillingSummary();
      api.tables.getTables().then(setTables).catch(() => {});
    };

    socketRef.current.on('orderDeleted', handleOrderDeleted);
    socketRef.current.on('order-deleted', handleOrderDeleted);

    socketRef.current.on('waiterCalled', refreshStats);
    socketRef.current.on('waiterCallAttended', refreshStats);
    socketRef.current.on('counterBillUpdated', () => {
      api.counter.getOrders().then(setBillingOrders).catch((err) => console.error(err));
      refreshBillingSummary();
    });
  };

  const refreshStats = async () => {
    try {
      const statsData = await api.restaurant.getStats();
      setStats(statsData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const handleConfirmLogout = () => {
    setIsLogoutModalOpen(false);
    removeRestaurantToken();
    navigate('/admin/login');
  };

  // --- Category Handlers ---
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      if (catFormData.id) {
        await api.menu.updateCategory(catFormData.id, catFormData);
      } else {
        await api.menu.createCategory(catFormData);
      }
      setIsCategoryModalOpen(false);
      setCatFormData({ name: '', isHidden: false, id: null });
      const data = await api.menu.getCategories();
      setCategories(data);
    } catch (err) {
      alert(err.message || 'Error saving category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!await showConfirm('Delete category? All menu items under this category will also be deleted!')) return;
    try {
      await api.menu.deleteCategory(id);
      setCategories(categories.filter(c => c._id !== id));
      setMenuItems(menuItems.filter(i => i.categoryId !== id));
    } catch (err) {
      alert(err.message || 'Error deleting category');
    }
  };

  // --- MenuItem Handlers ---
  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...itemFormData,
        inStock: itemFormData.inStock !== false,
        price: itemFormData.hasVariants ? undefined : parseFloat(itemFormData.price || 0),
        variants: itemFormData.hasVariants
          ? itemFormData.variants.map(v => ({ name: v.name, price: parseFloat(v.price || 0) }))
          : []
      };
      if (itemFormData.id) {
        await api.menu.updateItem(itemFormData.id, payload);
      } else {
        await api.menu.createItem(payload);
      }
      setIsItemModalOpen(false);
      setItemFormData({ name: '', description: '', price: '', categoryId: '', tags: ['Veg'], badges: [], image: '', id: null, hasVariants: false, variants: [], inStock: true });
      const data = await api.menu.getItems();
      setMenuItems(data);
    } catch (err) {
      alert(err.message || 'Error saving item');
    }
  };

  const handleToggleStock = async (id) => {
    const item = menuItems.find(i => i._id === id);
    const itemName = item?.name || 'this dish';
    const nextStatus = item?.inStock ? 'Out of Stock (Unavailable)' : 'Available (In Stock)';
    const confirmMsg = `Are you sure you want to mark "${itemName}" as ${nextStatus}?`;
    
    if (!await showConfirm(confirmMsg, 'Confirm Stock Status', 'Yes, Update', 'Cancel')) return;
    
    try {
      await api.menu.toggleStock(id);
      setMenuItems(menuItems.map(i => i._id === id ? { ...i, inStock: !i.inStock } : i));
    } catch (err) {
      alert('Error changing item stock state: ' + (err.message || ''));
    }
  };

  const handleDuplicateItem = async (id) => {
    try {
      await api.menu.duplicateItem(id);
      const data = await api.menu.getItems();
      setMenuItems(data);
    } catch (err) {
      alert('Error duplicating item');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!await showConfirm('Are you sure you want to delete this menu item?')) return;
    try {
      await api.menu.deleteItem(id);
      setMenuItems(menuItems.filter(i => i._id !== id));
    } catch (err) {
      alert('Error deleting item');
    }
  };

  const handleBulkPrice = async (e) => {
    e.preventDefault();
    const itemIds = menuItems.map(i => i._id);
    try {
      await api.menu.bulkPriceUpdate(itemIds, bulkPriceData.type, parseFloat(bulkPriceData.value));
      setIsBulkModalOpen(false);
      setBulkPriceData({ value: '', type: 'percentage' });
      const data = await api.menu.getItems();
      setMenuItems(data);
    } catch (err) {
      alert('Error running bulk price updates: ' + err.message);
    }
  };

  // --- Table Handlers ---
  const handleSaveTable = async (e) => {
    e.preventDefault();
    try {
      if (tableFormData.id) {
        await api.tables.updateTable(tableFormData.id, tableFormData);
      } else {
        await api.tables.createTable(tableFormData);
      }
      setIsTableModalOpen(false);
      setTableFormData({ name: '', type: 'Table', id: null });
      const data = await api.tables.getTables();
      setTables(data);
    } catch (err) {
      alert(err.message || 'Error saving table/room');
    }
  };

  const handleToggleTableActive = async (tableObj) => {
    try {
      await api.tables.updateTable(tableObj._id, { isActive: !tableObj.isActive });
      setTables(tables.map(t => t._id === tableObj._id ? { ...t, isActive: !t.isActive } : t));
    } catch (err) {
      alert('Error toggling table active state');
    }
  };

  const handleDeleteTable = async (id) => {
    if (!await showConfirm('Delete table? Diners scanning this QR will no longer be able to access the menu.')) return;
    try {
      await api.tables.deleteTable(id);
      setTables(tables.filter(t => t._id !== id));
    } catch (err) {
      alert('Error deleting table');
    }
  };

  // --- Integrated Counter Billing Handlers ---
  const handleSettleBillingOrder = async (orderId) => {
    try {
      await api.counter.completeOrder(orderId);
      setBillingOrders((prev) => prev.filter(o => o._id !== orderId));
      refreshBillingSummary();
      // Refresh the history list too to show the newly completed order at the top
      const historyList = await api.orders.getOrders({ limit: 200, history: 'true' });
      if (Array.isArray(historyList)) {
        const sorted = [...historyList].sort((a, b) => new Date(b.completedAt || b.updatedAt || b.createdAt) - new Date(a.completedAt || a.updatedAt || a.createdAt));
        setHistoryOrders(sorted);
      }
    } catch (err) {
      alert('Failed to settle order: ' + err.message);
    }
  };

  const handleOpenPrintBilling = (order) => {
    setSelectedPrintOrder(order);
    setIsPrintModalOpen(true);
  };

  // --- Orders status update ---
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      setOrders(prev => prev.map(o => o._id === orderId ? mergeOrderData(o, { ...o, status: newStatus }) : o));
      const res = await api.orders.updateStatus(orderId, newStatus, (newStatus === 'Served' || newStatus === 'Completed') ? 'Admin' : undefined);
      if (res && res._id) {
        setOrders(prev => prev.map(o => o._id === orderId ? mergeOrderData(o, res) : o));
      }
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder(prev => mergeOrderData(prev, { status: newStatus }));
      }
    } catch (err) {
      alert('Failed to update order status');
    }
  };

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

  // Dynamic branding preview handler
  const handleSaveBranding = async (e) => {
    e.preventDefault();
    try {
      await api.restaurant.updateProfile({
        brandColor: restaurant.brandColor,
        googleMapsLink: restaurant.googleMapsLink,
        reviewLink: restaurant.reviewLink,
        socialLinks: restaurant.socialLinks
      });
      await api.restaurant.updateBranding(restaurant.brandingSettings);
      alert('Branding and Settings saved successfully');
    } catch (err) {
      alert('Error saving brand configs: ' + err.message);
    }
  };

  const handleSaveCustomerDataSettings = async () => {
    try {
      const settings = restaurant.customerDataSettings || {};
      await api.restaurant.updateCustomerDataSettings(settings);
      alert('Customer data settings saved');
    } catch (err) {
      alert(err.message || 'Error saving customer data settings');
    }
  };

  const handleSaveActionButtons = async () => {
    try {
      await api.restaurant.updateActionButtons(restaurant.actionButtons || []);
      alert('Action buttons saved');
    } catch (err) {
      alert(err.message || 'Error saving action buttons');
    }
  };

  const setCustomerField = (field, patch) => {
    setRestaurant({
      ...restaurant,
      customerDataSettings: {
        ...(restaurant.customerDataSettings || {}),
        fields: {
          ...(restaurant.customerDataSettings?.fields || {}),
          [field]: {
            ...(restaurant.customerDataSettings?.fields?.[field] || {}),
            ...patch
          }
        }
      }
    });
  };

  const validateAndOptimizeLogoFile = (file) => {
    return new Promise((resolve) => {
      if (file.type !== 'image/png') {
        resolve({ ok: false, error: 'Only PNG format allowed. Please convert to PNG first.' });
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const { naturalWidth: w, naturalHeight: h } = img;
        if (w !== h) {
          resolve({ ok: false, error: `Image must be square (1:1). Yours is ${w}×${h}px — please crop to square.` });
          return;
        }
        if (w < 192) {
          resolve({ ok: false, error: `Too small (${w}×${h}px). Minimum 192×192px required. Recommended: 512×512px.` });
          return;
        }

        // Draw to exactly 512x512 canvas for perfect PWA sizing and display
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Clear background with transparency
        ctx.clearRect(0, 0, 512, 512);

        // Draw image stretched to exactly 512x512 (since it's already square, no distortion happens)
        ctx.drawImage(img, 0, 0, 512, 512);

        canvas.toBlob((blob) => {
          if (!blob) {
            resolve({ ok: false, error: 'Could not process and resize image.' });
            return;
          }
          const optimizedFile = new File([blob], 'logo-512.png', { type: 'image/png' });
          resolve({ ok: true, file: optimizedFile, width: 512, height: 512 });
        }, 'image/png');
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve({ ok: false, error: 'Could not read image file.' }); };
      img.src = url;
    });
  };

  const handleUploadBanner = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      for (const file of files) {
        // High-quality WebP banner compression (1400x800 max, 88% quality)
        const optimized = await optimizeBannerImage(file);
        const formData = new FormData();
        formData.append('image', optimized.file);
        const res = await api.restaurant.uploadImage(formData);
        if (res.imageUrl) {
          setRestaurant(prev => ({
            ...prev,
            banners: [...(prev.banners || []), res.imageUrl]
          }));
        }
      }
    } catch (err) {
      alert('Banner upload failed: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };

  const handleUploadLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoUploadStatus({ loading: true, error: null, success: null });
    try {
      // High-quality 512x512 WebP conversion without visible quality loss
      const optimized = await optimizeLogoImage(file);
      const formData = new FormData();
      formData.append('logo', optimized.file);

      const res = await api.restaurant.uploadLogo(formData);
      setRestaurant(prev => ({ ...prev, logo: res.logoUrl }));
      const origKb = Math.round(optimized.originalSize / 1024);
      const newKb = Math.round(optimized.compressedSize / 1024);
      setLogoUploadStatus({
        loading: false,
        error: null,
        success: `Optimized (${origKb}KB → ${newKb}KB WebP) — Uploaded successfully!`
      });
    } catch (err) {
      setLogoUploadStatus({ loading: false, error: err.message || 'Upload failed. Please try again.', success: null });
    } finally {
      e.target.value = '';
    }
  };

  const handleUploadItemImageForm = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      // High-quality WebP menu item compression (900x900 max, 88% quality)
      const optimized = await optimizeMenuItemImage(file);
      const formData = new FormData();
      formData.append('image', optimized.file);
      const res = await api.restaurant.uploadImage(formData);
      setItemFormData(prev => ({ ...prev, image: res.imageUrl }));
    } catch (err) {
      alert('Error uploading image: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="bg-[#f8fafc] text-slate-900 min-h-screen w-full md:flex font-sans antialiased">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside className={`bg-[#0f172a] flex flex-col fixed inset-y-0 left-0 h-dvh max-h-dvh overflow-hidden shadow-2xl z-40 text-left border-r border-slate-800/90 transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${isSidebarCollapsed ? 'w-[72px]' : 'w-[250px]'}`}>
        
        {/* Header Block */}
        <div className={`px-4 py-4 flex items-center border-b border-slate-800/90 bg-slate-950/40 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 min-w-0">
            {restaurant?.logo ? (
              <img 
                src={restaurant.logo.startsWith('http') ? restaurant.logo : `${BACKEND_URL}${restaurant.logo}`} 
                alt="Logo" 
                className="w-9 h-9 rounded-xl object-cover border border-slate-700/80 shrink-0 shadow-sm" 
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-[#003b1b] flex items-center justify-center shrink-0 shadow-md border border-emerald-500/40">
                <UtensilsCrossed className="text-white w-4.5 h-4.5" />
              </div>
            )}
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-[13.5px] text-white tracking-tight truncate">{restaurant?.name || 'Restaurant Admin'}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse"></span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    {restaurant?.package || 'Enterprise'} Plan
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            {/* Mobile close */}
            {!isSidebarCollapsed && (
              <button onClick={() => setSidebarOpen(false)} className="md:hidden w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            )}
            {/* Desktop collapse toggle */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex w-7 h-7 items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-all cursor-pointer border border-transparent hover:border-slate-700"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        {/* Nav Links */}
        <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4 space-y-6 hide-scrollbar">
          
          {/* Main Controls */}
          <div>
            {!isSidebarCollapsed && (
              <div className="flex items-center justify-between px-2.5 mb-2">
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400">Workspace Menu</span>
              </div>
            )}
            <ul className="flex flex-col space-y-1">
              {[
                { id: 'overview', label: 'Analytics Dashboard', icon: TrendingUp },
                { id: 'orders', label: 'Live Orders', icon: ClipboardList, badge: stats.activeOrdersCount },
                { id: 'billing', label: 'Counter Cashier', icon: Receipt, badge: billingOrders.filter(o => o.billRequested).length },
                { id: 'billing-history', label: 'Settlement History', icon: History },
                { id: 'menu', label: 'Menu & Food Catalog', icon: UtensilsCrossed },
                { id: 'tables', label: 'Tables & QR Codes', icon: QrCode },
                { id: 'crm', label: 'Customer Directory', icon: Users },
                ...(restaurant?.features?.waiterPanel !== false ? [{ id: 'waiters', label: 'Service Staff', icon: UserCheck }] : []),
                { id: 'settings', label: 'System Settings', icon: Settings }
              ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <li key={tab.id}>
                    <button
                      onClick={() => {
                        setActiveTab(tab.id);
                        localStorage.setItem('adminActiveTab', tab.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center transition-all duration-150 rounded-xl group cursor-pointer ${
                        isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
                      } ${
                        isActive
                          ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/30'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white font-medium'
                      }`}
                      title={isSidebarCollapsed ? tab.label : ''}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <tab.icon 
                          className={`w-4.5 h-4.5 shrink-0 transition-transform group-hover:scale-105 ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'
                          }`}
                        />
                        {!isSidebarCollapsed && (
                          <span className={`text-[13.5px] truncate ${
                            isActive ? 'text-white font-bold' : 'text-slate-300 group-hover:text-white'
                          }`}>{tab.label}</span>
                        )}
                      </div>
                      {!isSidebarCollapsed && tab.badge > 0 && (
                        <span className={`ml-auto px-2 py-0.5 rounded-full text-[11px] font-black shadow-xs ${
                          isActive ? 'bg-white text-emerald-800' : 'bg-rose-500 text-white'
                        }`}>
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Live Terminal Feeds */}
          <div>
            {!isSidebarCollapsed && (
              <div className="flex items-center justify-between px-2.5 mb-2">
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400">Terminal Terminus</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            )}
            <ul className="flex flex-col space-y-1">
              <li>
                {restaurant?.features?.kitchenPanel === false ? (
                  <div 
                    className={`w-full flex items-center rounded-xl text-slate-500 bg-slate-900/40 border border-slate-800/80 cursor-not-allowed ${
                      isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
                    }`}
                    title="Kitchen KDS is not enabled in your current plan. Contact Super Admin to upgrade."
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ChefHat className="w-4.5 h-4.5 text-slate-500 shrink-0" />
                      {!isSidebarCollapsed && <span className="text-[13.5px] font-medium truncate line-through">Kitchen KDS</span>}
                    </div>
                    {!isSidebarCollapsed && <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                  </div>
                ) : restaurant?.slug ? (
                  <a 
                    href={`${ADMIN_URL}/admin/kitchen/${restaurant.slug}`} 
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setSidebarOpen(false)}
                    className={`w-full flex items-center transition-all duration-150 rounded-xl group text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent hover:border-slate-700/60 ${
                      isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
                    }`}
                    title={isSidebarCollapsed ? 'Kitchen Display (KDS)' : ''}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ChefHat className="w-4.5 h-4.5 text-amber-400 group-hover:scale-105 transition-transform shrink-0" />
                      {!isSidebarCollapsed && <span className="text-[13.5px] text-slate-300 group-hover:text-white font-medium truncate">Kitchen KDS</span>}
                    </div>
                    {!isSidebarCollapsed && <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 shrink-0" />}
                  </a>
                ) : (
                  <div className={`w-full flex items-center text-slate-600 select-none ${isSidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'}`}>
                    <div className="flex items-center gap-3">
                      <ChefHat className="w-4.5 h-4.5 text-slate-600 shrink-0" />
                      {!isSidebarCollapsed && <span className="text-[13.5px] text-slate-600">Kitchen KDS</span>}
                    </div>
                  </div>
                )}
              </li>
              <li>
                {restaurant?.features?.waiterPanel === false ? (
                  <div 
                    className={`w-full flex items-center rounded-xl text-slate-500 bg-slate-900/40 border border-slate-800/80 cursor-not-allowed ${
                      isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
                    }`}
                    title="Waiter Terminal is not enabled in your current plan. Contact Super Admin to upgrade."
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserCheck className="w-4.5 h-4.5 text-slate-500 shrink-0" />
                      {!isSidebarCollapsed && <span className="text-[13.5px] font-medium truncate line-through">Waiter Terminal</span>}
                    </div>
                    {!isSidebarCollapsed && <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                  </div>
                ) : restaurant?.slug ? (
                  <a 
                    href={`${WAITER_URL}/waiter/${restaurant.slug}`} 
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setSidebarOpen(false)}
                    className={`w-full flex items-center transition-all duration-150 rounded-xl group text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent hover:border-slate-700/60 ${
                      isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
                    }`}
                    title={isSidebarCollapsed ? 'Waiter Screen' : ''}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserCheck className="w-4.5 h-4.5 text-blue-400 group-hover:scale-105 transition-transform shrink-0" />
                      {!isSidebarCollapsed && <span className="text-[13.5px] text-slate-300 group-hover:text-white font-medium truncate">Waiter Terminal</span>}
                    </div>
                    {!isSidebarCollapsed && <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 shrink-0" />}
                  </a>
                ) : (
                  <div className={`w-full flex items-center text-slate-600 select-none ${isSidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'}`}>
                    <div className="flex items-center gap-3">
                      <UserCheck className="w-4.5 h-4.5 text-slate-600 shrink-0" />
                      {!isSidebarCollapsed && <span className="text-[13.5px] text-slate-600">Waiter Terminal</span>}
                    </div>
                  </div>
                )}
              </li>
              <li>
                {restaurant?.features?.counterPanel === false ? (
                  <div 
                    className={`w-full flex items-center rounded-xl text-slate-500 bg-slate-900/40 border border-slate-800/80 cursor-not-allowed ${
                      isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
                    }`}
                    title="Counter POS is not enabled in your current plan. Contact Super Admin to upgrade."
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Receipt className="w-4.5 h-4.5 text-slate-500 shrink-0" />
                      {!isSidebarCollapsed && <span className="text-[13.5px] font-medium truncate line-through">Counter POS</span>}
                    </div>
                    {!isSidebarCollapsed && <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                  </div>
                ) : restaurant?.slug ? (
                  <a 
                    href={`${ADMIN_URL}/admin/counter/${restaurant.slug}`} 
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setSidebarOpen(false)}
                    className={`w-full flex items-center transition-all duration-150 rounded-xl group text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent hover:border-slate-700/60 ${
                      isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
                    }`}
                    title={isSidebarCollapsed ? 'Counter POS' : ''}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Receipt className="w-4.5 h-4.5 text-emerald-400 group-hover:scale-105 transition-transform shrink-0" />
                      {!isSidebarCollapsed && <span className="text-[13.5px] text-slate-300 group-hover:text-white font-medium truncate">Counter POS</span>}
                    </div>
                    {!isSidebarCollapsed && <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 shrink-0" />}
                  </a>
                ) : (
                  <div className={`w-full flex items-center text-slate-600 select-none ${isSidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'}`}>
                    <div className="flex items-center gap-3">
                      <Receipt className="w-4.5 h-4.5 text-slate-600 shrink-0" />
                      {!isSidebarCollapsed && <span className="text-[13.5px] text-slate-600">Counter POS</span>}
                    </div>
                  </div>
                )}
              </li>
              <li>
                {restaurant?.slug ? (
                  <a 
                    href={`${USER_URL}/menu/${restaurant.slug}`} 
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setSidebarOpen(false)}
                    className={`w-full flex items-center transition-all duration-150 rounded-xl group text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent hover:border-slate-700/60 ${
                      isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
                    }`}
                    title={isSidebarCollapsed ? 'Customer Digital Menu' : ''}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Globe className="w-4.5 h-4.5 text-emerald-400 group-hover:scale-105 transition-transform shrink-0" />
                      {!isSidebarCollapsed && <span className="text-[13.5px] text-slate-300 group-hover:text-white font-medium truncate">Customer Menu</span>}
                    </div>
                    {!isSidebarCollapsed && <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 shrink-0" />}
                  </a>
                ) : (
                  <div className={`w-full flex items-center text-slate-600 select-none ${isSidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'}`}>
                    <div className="flex items-center gap-3">
                      <Globe className="w-4.5 h-4.5 text-slate-600 shrink-0" />
                      {!isSidebarCollapsed && <span className="text-[13.5px] text-slate-600">Customer Menu</span>}
                    </div>
                  </div>
                )}
              </li>
            </ul>
          </div>
        </nav>

        {typeof Notification !== 'undefined' && (
          <div className="px-3 pb-2.5 bg-slate-950/20">
            <button
              type="button"
              onClick={toggleOrderNotifications}
              className={`mb-2 w-full flex items-center gap-2.5 rounded-xl border cursor-pointer ${orderNotificationsEnabled ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20' : 'border-slate-600 bg-slate-800/80 text-slate-300 hover:bg-slate-700'} ${isSidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2'}`}
              title={orderNotificationsEnabled ? 'Turn off admin live-order alerts and push notifications' : 'Turn on admin live-order alerts and push notifications'}
            >
              {orderNotificationsEnabled ? <Bell className="w-4 h-4 shrink-0" /> : <BellOff className="w-4 h-4 shrink-0" />}
              {!isSidebarCollapsed && <span className="text-[11.5px] font-bold">Order Alerts: {orderNotificationsEnabled ? 'On' : 'Off'}</span>}
            </button>
            {Notification.permission !== 'granted' && (
            <button
              type="button"
              onClick={async () => {
                const token = await requestFirebaseNotificationPermission('restaurantadmin');
                if (token) {
                  await api.notifications.setPreference(token, orderNotificationsEnabled).catch(error => window.alert(error.message || 'Could not save notification preference'));
                }
              }}
              className={`w-full flex items-center gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 cursor-pointer ${isSidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2'}`}
              title="Enable new order notifications"
            >
              <Bell className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span className="text-[11.5px] font-bold">Enable Notifications</span>}
            </button>
            )}
          </div>
        )}

        {/* Profile Footer with Logout */}
        <div className={`p-3 border-t border-slate-800/90 bg-slate-950/60 flex items-center gap-2.5 ${isSidebarCollapsed ? 'flex-col justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 text-white font-extrabold flex items-center justify-center border border-slate-600 uppercase text-[12px] shrink-0 shadow-xs">
              {restaurant?.name?.substring(0, 1) || 'A'}
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <span className="font-extrabold text-[12px] text-white block truncate leading-tight">Admin Manager</span>
                <span className="text-[10px] text-slate-400 block truncate mt-0.5 leading-tight">{restaurant?.email || 'admin@restaurant.com'}</span>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`w-full md:flex-1 p-2.5 sm:p-4 md:p-6 min-w-0 text-left bg-[#f8fafc] transition-all duration-300 ${
        isSidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[250px]'
      }`}>
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-2xl mb-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-700 shadow-sm transition-colors hover:bg-slate-100 cursor-pointer">
              <Menu className="w-5 h-5 text-slate-700" />
            </button>
            <span className="font-extrabold text-slate-900 text-sm">{restaurant?.name || 'Dashboard'}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTab('orders');
              localStorage.setItem('adminActiveTab', 'orders');
              setSidebarOpen(false);
            }}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer"
            aria-label={`Open live orders, ${stats.newOrdersCount || 0} new orders`}
            title="Open Live Orders"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-rose-600 px-1 text-[9px] font-black leading-none text-white">
              {(stats.newOrdersCount || 0) > 99 ? '99+' : (stats.newOrdersCount || 0)}
            </span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-3 border-[#003b1b] mx-auto"></div>
            <p className="text-slate-600 text-sm mt-4 font-bold">Loading operational details...</p>
          </div>
        ) : (
          <>
            {/* Conditional Tab Rendering */}
            {activeTab === 'overview' && (
              <OverviewTab
                stats={stats}
                restaurant={restaurant}
                onNavigate={setActiveTab}
                onOpenTakeOrder={() => setIsTakeOrderModalOpen(true)}
              />
            )}

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
                fetchTabData={fetchTabData}
                tabLoading={tabLoading}
              />
            )}

            {activeTab === 'billing-history' && (
              <BillingHistoryTab
                tables={tables}
                handleOpenPrintBilling={handleOpenPrintBilling}
              />
            )}

            {activeTab === 'menu' && (
              <MenuTab
                categories={categories}
                menuItems={menuItems}
                tabLoading={tabLoading}
                setIsBulkModalOpen={setIsBulkModalOpen}
                setIsCategoryModalOpen={setIsCategoryModalOpen}
                setIsItemModalOpen={setIsItemModalOpen}
                setCatFormData={setCatFormData}
                setItemFormData={setItemFormData}
                handleToggleStock={handleToggleStock}
                handleDuplicateItem={handleDuplicateItem}
                handleDeleteItem={handleDeleteItem}
                handleDeleteCategory={handleDeleteCategory}
              />
            )}

            {activeTab === 'tables' && (
              <TablesTab
                tables={tables}
                tabLoading={tabLoading}
                setIsTableModalOpen={setIsTableModalOpen}
                setTableFormData={setTableFormData}
                handleToggleTableActive={handleToggleTableActive}
                handleDeleteTable={handleDeleteTable}
                api={api}
                restaurant={restaurant}
              />
            )}

            {activeTab === 'crm' && (
              <CrmTab
                customers={customers}
                advancedAnalytics={advancedAnalytics}
                tabLoading={tabLoading}
                api={api}
              />
            )}

            {activeTab === 'waiters' && (
              <WaitersTab />
            )}

            {activeTab === 'settings' && (
              <SettingsTab
                restaurant={restaurant}
                setRestaurant={setRestaurant}
                handleSaveBranding={handleSaveBranding}
                handleSaveCustomerDataSettings={handleSaveCustomerDataSettings}
                handleSaveActionButtons={handleSaveActionButtons}
                setCustomerField={setCustomerField}
                handleUploadLogo={handleUploadLogo}
                handleUploadBanner={handleUploadBanner}
                logoUploadStatus={logoUploadStatus}
              />
            )}
          </>
        )}
      </main>

      {/* Operational Overlays & Modals */}
      <OrderInvoiceModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        selectedOrder={selectedOrder}
        onUpdatePaymentStatus={handleUpdatePaymentStatus}
      />

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        catFormData={catFormData}
        setCatFormData={setCatFormData}
        handleSaveCategory={handleSaveCategory}
      />

      <MenuItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        itemFormData={itemFormData}
        setItemFormData={setItemFormData}
        categories={categories}
        handleSaveItem={handleSaveItem}
        handleUploadItemImageForm={handleUploadItemImageForm}
      />

      <TableModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        tableFormData={tableFormData}
        setTableFormData={setTableFormData}
        handleSaveTable={handleSaveTable}
      />

      <BulkPriceModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        bulkPriceData={bulkPriceData}
        setBulkPriceData={setBulkPriceData}
        handleBulkPrice={handleBulkPrice}
      />

      {/* Thermal Receipt Print Modal */}
      {isPrintModalOpen && selectedPrintOrder && (
        <BillPrint 
          order={selectedPrintOrder} 
          restaurant={restaurant}
          onClose={() => setIsPrintModalOpen(false)} 
        />
      )}

      {/* Logout Confirmation Popup Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 relative text-left flex flex-col border border-slate-100 animate-fadeIn">
            <div className="w-12 h-12 bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center rounded-2xl mb-4">
              <LogOut className="w-6 h-6" />
            </div>
            
            <h3 className="text-base font-extrabold text-slate-800">Confirm Sign Out</h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1.5 leading-relaxed">
              Are you sure you want to end your current session? You will need to log back in with your credentials to access the admin panel.
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
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-md text-center text-xs cursor-pointer transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Real-time New Order Floating Toast Banner */}
      {newOrderToast && (
        <div className="fixed bottom-5 right-5 z-50 animate-slideUp max-w-sm w-[92vw] sm:w-88 bg-slate-900 text-white rounded-2xl shadow-2xl p-4 border border-slate-700/80 flex items-start gap-3.5 backdrop-blur-md">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-amber-400 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                New Order Received!
              </span>
              <button 
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
                onClick={() => setNewOrderToast(null)}
                className="px-2.5 py-1.5 text-slate-400 hover:text-white font-medium text-xs transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Alert/Confirm Modal */}
      {modalAlert && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
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

      {/* Counter POS Order Modal */}
      <CounterOrderModal
        isOpen={isTakeOrderModalOpen}
        onClose={() => setIsTakeOrderModalOpen(false)}
        tables={tables}
        onOrderPlaced={() => {
          fetchInitialData();
          fetchTabData(activeTab);
        }}
      />
    </div>
  );
}

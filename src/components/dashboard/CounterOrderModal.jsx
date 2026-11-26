import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  UtensilsCrossed, 
  Check, 
  QrCode, 
  User, 
  Phone, 
  FileText,
  ArrowLeft,
  Store,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { api } from '../../api';

export default function CounterOrderModal({
  isOpen,
  pageMode = false,
  embedded = false,
  orderMode = 'kitchen',
  onClose,
  tables = [],
  onOrderPlaced
}) {
  const [currentStep, setCurrentStep] = useState('table'); // 'table' | 'menu'
  const [mobileView, setMobileView] = useState('menu'); // 'menu' | 'cart' (on mobile)
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [internalTables, setInternalTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null); // { id, name, type }
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState({}); // { [key]: { menuItemId, name, variantName, price, quantity } }
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [variantSelectorItem, setVariantSelectorItem] = useState(null);

  // Fetch menu catalog and tables when modal opens
  useEffect(() => {
    if (!isOpen) return;
    
    setLoadingData(true);
    setCurrentStep('table');
    setMobileView('menu');
    setTableSearchQuery('');
    setSearchQuery('');

    Promise.all([
      api.menu.getCategories().catch(() => []),
      api.menu.getItems().catch(() => []),
      tables && tables.length > 0 ? Promise.resolve(tables) : api.tables.getTables().catch(() => [])
    ]).then(([cats, items, tbls]) => {
      setCategories(Array.isArray(cats) ? cats : []);
      setMenuItems(Array.isArray(items) ? items : []);
      const tableList = Array.isArray(tbls) ? tbls : [];
      setInternalTables(tableList);
    }).finally(() => {
      setLoadingData(false);
    });
  }, [isOpen, tables]);

  // Reset cart when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCart({});
      setSearchQuery('');
      setTableSearchQuery('');
      setCustomerName('');
      setCustomerMobile('');
      setOrderNotes('');
      setSelectedTable(null);
      setVariantSelectorItem(null);
      setCurrentStep('table');
      setMobileView('menu');
    }
  }, [isOpen]);

  // Filtered tables for Step 1
  const filteredTables = useMemo(() => {
    if (!tableSearchQuery.trim()) return internalTables;
    const q = tableSearchQuery.toLowerCase();
    return internalTables.filter(t => t.name?.toLowerCase().includes(q) || t.type?.toLowerCase().includes(q));
  }, [internalTables, tableSearchQuery]);

  // Filtered menu items for Step 2
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      if (item.inStock === false) return false;
      const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
      const matchesSearch = !searchQuery.trim() || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Select a table and proceed to menu
  const handleSelectTableAndProceed = (tableObj) => {
    setSelectedTable(tableObj);
    setCurrentStep('menu');
    setMobileView('menu');
  };

  // Cart operations
  const handleAddToCart = (item, variant = null) => {
    const variantName = variant ? variant.name : (item.hasVariants && item.variants?.length > 0 ? item.variants[0].name : '');
    const price = variant ? variant.price : (item.hasVariants && item.variants?.length > 0 ? item.variants[0].price : item.price);
    const cartKey = `${item._id}_${variantName}`;

    setCart(prev => {
      const existing = prev[cartKey];
      const newQty = (existing ? existing.quantity : 0) + 1;
      return {
        ...prev,
        [cartKey]: {
          menuItemId: item._id,
          name: item.name,
          variantName,
          price,
          quantity: newQty
        }
      };
    });
    setVariantSelectorItem(null);
  };

  const handleUpdateQuantity = (cartKey, delta) => {
    setCart(prev => {
      const existing = prev[cartKey];
      if (!existing) return prev;
      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[cartKey];
        return copy;
      }
      return {
        ...prev,
        [cartKey]: { ...existing, quantity: newQty }
      };
    });
  };

  const cartList = Object.entries(cart).map(([key, val]) => ({ ...val, cartKey: key }));
  const totalItemCount = cartList.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cartList.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Submit Order to Kitchen / POS
  const handleSubmitOrder = async () => {
    if (cartList.length === 0) {
      alert('Please add at least one dish to the order.');
      return;
    }

    const targetTableName = selectedTable ? selectedTable.name : 'Counter Walk-in';
    const targetTableId = selectedTable ? selectedTable.id : null;

    const payload = {
      tableOrRoomId: targetTableId,
      tableName: targetTableName,
      processMode: orderMode,
      items: cartList.map(item => ({
        menuItemId: item.menuItemId,
        variantName: item.variantName || '',
        quantity: item.quantity
      })),
      customerName: customerName.trim() || 'Guest User',
      customerMobile: customerMobile.trim() || '',
      originAdminNotificationToken: localStorage.getItem('menuos_fcm_token_restaurantadmin') || '',
      specialInstructions: orderNotes.trim() // Single overall note
    };

    try {
      setSubmitting(true);
      const newOrder = await api.counter.createOrder(payload);
      if (onOrderPlaced) onOrderPlaced(newOrder);
      onClose();
    } catch (err) {
      console.error('Failed to place counter order:', err);
      alert(err.message || 'Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={embedded ? 'w-full flex-1 flex flex-col text-left overflow-hidden bg-slate-50' : `${pageMode ? 'min-h-screen' : 'fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4'} bg-slate-50 text-left`}>
      <div className={`w-full flex-1 flex flex-col overflow-hidden ${embedded ? 'bg-slate-50' : (pageMode ? 'min-h-screen bg-white' : 'max-w-6xl max-h-[96vh] sm:max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 animate-fadeIn')}`}>
        
        {/* =========================================================================
            STEP 1: TABLE SELECTION SCREEN (User first chooses Table or Counter Walk-in)
            ========================================================================= */}
        {currentStep === 'table' ? (
          <div className="flex flex-col flex-1 overflow-hidden bg-slate-50">
            {/* Step 1 Top Header - Modal Dialog only, hidden in embedded mode */}
            {!embedded && (
              <header className="px-4 sm:px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
                      Counter POS — Select Table
                      <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                        Step 1 of 2
                      </span>
                    </h2>
                    <p className="text-[10.5px] sm:text-xs text-slate-300 font-medium">
                      Choose a dine-in table or proceed with direct Counter Walk-in to open the menu.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </header>
            )}

            {/* Step 1 Body */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 max-w-5xl mx-auto w-full space-y-5">
              {embedded && (
                <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                      Choose Table or Instant Counter Order
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                        Step 1
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Select a dine-in table or proceed with direct Counter Walk-in to open the menu.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Option A: Direct Counter Walk-in (Prominent Card) */}
              <div>
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider block mb-2.5">
                  Direct / Quick Order (No Table)
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectTableAndProceed({ id: null, name: 'Counter Walk-in', type: 'Walk-in' })}
                  className="w-full bg-white hover:bg-emerald-50/50 border-2 border-emerald-700/40 hover:border-emerald-700 rounded-2xl p-4 sm:p-5 flex items-center justify-between text-left transition-all shadow-xs hover:shadow-md cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 sm:gap-4">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#003b1b] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <Store className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-slate-900 text-base sm:text-lg">
                          Counter Walk-in
                        </h3>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-md">
                          Instant Order
                        </span>
                      </div>
                   
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 shrink-0 bg-emerald-50 px-3 py-2 rounded-xl group-hover:bg-[#003b1b] group-hover:text-white transition-colors">
                    <span>Select &amp; Open Menu</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              </div>

              {/* Option B: Dine-in Tables Grid */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
                      Dine-in Tables &amp; Rooms ({internalTables.length})
                    </span>
                    <p className="text-xs text-slate-500 font-medium">
                      {orderMode === 'direct' ? 'Select the billing table or Counter Walk-in.' : 'Select table where the customer is seated to send a KOT.'}
                    </p>
                  </div>
                  {internalTables.length > 8 && (
                    <div className="relative w-full sm:w-60">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Filter table..."
                        value={tableSearchQuery}
                        onChange={(e) => setTableSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-xl focus:border-emerald-600 outline-none"
                      />
                    </div>
                  )}
                </div>

                {loadingData ? (
                  <div className="text-center py-12 space-y-2 bg-white rounded-2xl border border-slate-200">
                    <div className="w-8 h-8 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-bold text-slate-500">Loading tables...</p>
                  </div>
                ) : filteredTables.length === 0 ? (
                  <div className="text-center py-10 px-4 bg-white rounded-2xl border border-slate-200 space-y-2">
                    <QrCode className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">No tables found matching search.</p>
                    <p className="text-[11px] text-slate-500">You can always proceed with Counter Walk-in above.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3">
                    {filteredTables.map(tbl => (
                      <button
                        key={tbl._id}
                        type="button"
                        onClick={() => handleSelectTableAndProceed({ id: tbl._id, name: tbl.name, type: tbl.type || 'Table' })}
                        className="bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-600 rounded-2xl p-3.5 text-left transition-all hover:-translate-y-0.5 shadow-2xs hover:shadow-xs cursor-pointer flex flex-col justify-between min-h-[96px] group"
                      >
                        <div className="flex items-start justify-between">
                          <span className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-[#003b1b] group-hover:text-white text-slate-700 flex items-center justify-center transition-colors">
                            <QrCode className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {tbl.type || 'Table'}
                          </span>
                        </div>
                        <div className="mt-2">
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-emerald-950 truncate">
                            {tbl.name}
                          </h4>
                          <span className="text-[10px] font-medium text-emerald-800 flex items-center gap-1 mt-0.5 opacity-90 group-hover:opacity-100">
                            Tap to open menu &rarr;
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (

          /* =========================================================================
              STEP 2: {orderMode === 'direct' ? 'MENU & SETTLE BILL' : 'MENU & KOT BASKET'} (After Table Selection)
              ========================================================================= */
          <div className="flex flex-col flex-1 overflow-hidden">
            
            {/* Step 2 Top Header */}
            {embedded ? (
              /* Mobile-only compact view switcher (Menu vs Cart) - Completely hidden on Desktop (lg:) to avoid double navbar */
              <div className="lg:hidden flex items-center justify-between px-3.5 py-2 bg-white border-b border-slate-200 shrink-0">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                  <span className="truncate">{selectedTable ? selectedTable.name : 'Counter Walk-in'}</span>
                </span>

                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setMobileView('menu')}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                      mobileView === 'menu' ? 'bg-[#003b1b] text-white font-bold shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Menu
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileView('cart')}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                      mobileView === 'cart' ? 'bg-[#003b1b] text-white font-bold shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    <span>Cart</span>
                    {totalItemCount > 0 && (
                      <span className="bg-emerald-600 text-white text-[10px] font-black px-1.5 rounded-full">
                        {totalItemCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <header className="px-3 sm:px-6 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {/* Back / Change Table Button */}
                  <button
                    type="button"
                    onClick={() => setCurrentStep('table')}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition border border-slate-700 shrink-0"
                    title="Select different table"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Change Table</span>
                    <span className="sm:hidden">Table</span>
                  </button>

                  {/* Selected Table Badge */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-extrabold text-xs border border-emerald-400/30 flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="truncate">{selectedTable ? selectedTable.name : 'Counter Walk-in'}</span>
                    </span>
                  </div>
                </div>

                {/* Mobile View Toggle Buttons (Menu vs Cart) */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex lg:hidden bg-slate-800 p-0.5 rounded-xl border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setMobileView('menu')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                        mobileView === 'menu' ? 'bg-[#003b1b] text-white font-bold' : 'text-slate-300'
                      }`}
                    >
                      Menu
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileView('cart')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                        mobileView === 'cart' ? 'bg-[#003b1b] text-white font-bold' : 'text-slate-300'
                      }`}
                    >
                      <span>Cart</span>
                      {totalItemCount > 0 && (
                        <span className="bg-emerald-500 text-slate-900 text-[10px] font-black px-1.5 rounded-full">
                          {totalItemCount}
                        </span>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </header>
            )}

            {/* Step 2 Main Content (Left Menu ~75%, Right Cart ~25% on Desktop) */}
            <div className="flex-1 lg:grid lg:grid-cols-12 min-h-0 overflow-hidden">
              
              {/* LEFT COLUMN: Menu Catalog (Desktop col-span-8 or 9) */}
              <div className={`lg:col-span-8 xl:col-span-9 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/40 overflow-hidden ${
                mobileView === 'menu' ? 'flex flex-1' : 'hidden lg:flex'
              }`}>
                
                {/* Search Bar & Category Filter Bar */}
                <div className="p-3 sm:p-4 bg-white border-b border-slate-200/90 shrink-0 space-y-2.5">
                  
                  {/* Clean Search Input */}
                  <div className="flex items-center bg-white border border-slate-300 rounded-xl px-3.5 py-2 shadow-2xs focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/10 transition-all">
                    <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search dish by name (e.g. Paneer Tikka, Biryani, Chai)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent border-none outline-none w-full text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400"
                    />
                    {searchQuery && (
                      <button 
                        type="button"
                        onClick={() => setSearchQuery('')} 
                        className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Clean Category Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-0.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('all')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-colors cursor-pointer border ${
                        selectedCategory === 'all'
                          ? 'bg-[#003b1b] text-white border-[#003b1b] font-semibold shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700 border-slate-200/80'
                      }`}
                    >
                      All Dishes ({menuItems.length})
                    </button>
                    {categories.map(cat => {
                      const isCatSelected = selectedCategory === cat._id;
                      return (
                        <button
                          key={cat._id}
                          type="button"
                          onClick={() => setSelectedCategory(cat._id)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-colors cursor-pointer border ${
                            isCatSelected
                              ? 'bg-[#003b1b] text-white border-[#003b1b] font-semibold shadow-2xs'
                              : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700 border-slate-200/80'
                          }`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dishes Grid */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                  {loadingData ? (
                    <div className="text-center py-20 space-y-2">
                      <div className="w-8 h-8 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs text-slate-500 font-bold">Loading dishes catalog...</p>
                    </div>
                  ) : filteredMenuItems.length === 0 ? (
                    <div className="text-center py-16 space-y-2">
                      <UtensilsCrossed className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-600 font-bold">No dishes found matching your search.</p>
                      <button
                        type="button"
                        onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                        className="text-xs text-emerald-700 font-semibold underline cursor-pointer"
                      >
                        Reset search filter
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3.5">
                      {filteredMenuItems.map(item => {
                        const hasVariants = item.hasVariants && item.variants && item.variants.length > 0;
                        const startingPrice = hasVariants ? item.variants[0].price : item.price;
                        
                        // Total quantity in cart for this base item
                        const inCartCount = cartList
                          .filter(c => c.menuItemId === item._id)
                          .reduce((sum, c) => sum + c.quantity, 0);

                        return (
                          <div
                            key={item._id}
                            className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-1.5">
                                <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">
                                  {item.name}
                                </h4>
                                {item.isVeg !== undefined && (
                                  <span className={`w-3.5 h-3.5 border rounded-xs flex items-center justify-center shrink-0 ${
                                    item.isVeg ? 'border-emerald-600' : 'border-rose-600'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-[10.5px] text-slate-500 line-clamp-1 mt-0.5 font-normal">
                                  {item.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-3 mt-2.5 border-t border-slate-100">
                              <div>
                                <span className="text-sm sm:text-base font-black text-slate-900">
                                  ₹{startingPrice}
                                </span>
                                {hasVariants && (
                                  <span className="text-[10px] text-slate-400 font-medium block leading-none mt-0.5">
                                    {item.variants.length} options
                                  </span>
                                )}
                              </div>

                              {/* Enlarged Add Button or Stepper Controls */}
                              {hasVariants ? (
                                <button
                                  type="button"
                                  onClick={() => setVariantSelectorItem(item)}
                                  className="h-9 px-3.5 sm:px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-semibold rounded-xl text-xs sm:text-sm cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5 active:scale-95"
                                >
                                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>{inCartCount > 0 ? `Add (${inCartCount})` : 'Select Size'}</span>
                                </button>
                              ) : inCartCount > 0 ? (
                                <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-xl p-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQuantity(`${item._id}_`, -1)}
                                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-800 flex items-center justify-center cursor-pointer shadow-2xs hover:bg-slate-100 active:scale-95 transition"
                                  >
                                    <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                                  </button>
                                  <span className="w-7 text-center text-xs sm:text-sm font-black text-emerald-950">
                                    {inCartCount}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQuantity(`${item._id}_`, 1)}
                                    className="w-8 h-8 rounded-lg bg-[#003b1b] text-white flex items-center justify-center cursor-pointer shadow-2xs hover:bg-[#166534] active:scale-95 transition"
                                  >
                                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAddToCart(item)}
                                  className="h-9 px-4 sm:px-5 bg-[#003b1b] hover:bg-[#166534] text-white font-semibold rounded-xl text-xs sm:text-sm cursor-pointer transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
                                >
                                  <Plus className="w-4 h-4 stroke-[2.5]" />
                                  <span>Add</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Mobile Floating Cart Summary Bar */}
                {totalItemCount > 0 && (
                  <div className="lg:hidden p-2.5 bg-white border-t border-slate-200 shadow-lg shrink-0">
                    <button
                      type="button"
                      onClick={() => setMobileView('cart')}
                      className="w-full h-11 bg-[#003b1b] text-white rounded-xl px-4 flex items-center justify-between font-extrabold text-xs sm:text-sm shadow-md cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-emerald-300" />
                        <span>{totalItemCount} Items · ₹{totalAmount}</span>
                      </span>
                      <span className="flex items-center gap-1 text-emerald-300 font-bold">
                        <span>{orderMode === 'direct' ? 'View Bill' : 'View Cart (KOT)'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: KOT Order Basket (Desktop reduced width: col-span-4 or 3) */}
              <div className={`lg:col-span-4 xl:col-span-3 flex flex-col bg-white overflow-hidden ${
                mobileView === 'cart' ? 'flex flex-1' : 'hidden lg:flex'
              }`}>
                
                {/* Basket Top Header */}
                <div className="p-3 sm:p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-emerald-700" />
                    <div>
                      <h3 className="font-black text-xs sm:text-sm text-slate-900 leading-tight">
                        {orderMode === 'direct' ? 'Direct Settle Bill' : 'Kitchen Order Ticket (KOT)'}
                      </h3>
                      <span className="text-[10.5px] text-slate-500 font-medium">
                        Table: {selectedTable ? selectedTable.name : 'Counter Walk-in'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                    {totalItemCount} items
                  </span>
                </div>

                {/* Cart Items List (NO per-item note input) */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 divide-y divide-slate-100">
                  {cartList.length === 0 ? (
                    <div className="text-center py-16 px-4 space-y-2">
                      <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">Order basket is empty</p>
                      <p className="text-[11px] text-slate-500 font-normal">Tap dishes from the menu to add items to ticket.</p>
                      <button
                        type="button"
                        onClick={() => setMobileView('menu')}
                        className="lg:hidden mt-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                      >
                        &larr; Back to Menu
                      </button>
                    </div>
                  ) : (
                    cartList.map(item => (
                      <div key={item.cartKey} className="py-2.5 first:pt-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h5 className="font-bold text-xs text-slate-900 leading-snug truncate">
                              {item.name}
                            </h5>
                            {item.variantName && (
                              <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-semibold inline-block mt-0.5">
                                {item.variantName}
                              </span>
                            )}
                            <span className="text-[11px] font-medium text-slate-500 block mt-0.5">
                              ₹{item.price} each
                            </span>
                          </div>

                          {/* Large Quantity Stepper Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.cartKey, -1)}
                              className="w-8 h-8 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 transition"
                            >
                              <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                            <span className="w-6 text-center text-xs sm:text-sm font-black text-slate-900">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.cartKey, 1)}
                              className="w-8 h-8 rounded-lg bg-[#003b1b] text-white hover:bg-[#166534] flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 transition"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                            <span className="font-black text-xs sm:text-sm text-slate-900 ml-1.5 w-14 text-right">
                              ₹{item.price * item.quantity}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Customer Details, Single Overall Note & Checkout Footer */}
                <div className="p-3 sm:p-3.5 bg-slate-50/90 border-t border-slate-200 shrink-0 space-y-2.5">
                  
                  {/* Customer Inputs (Name & Phone) */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5 bg-white border border-slate-300 px-2.5 py-1.5 rounded-xl shadow-2xs focus-within:border-emerald-600 transition">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Customer Name (Optional - Guest User)"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="bg-transparent border-none outline-none w-full text-xs text-slate-800 font-medium placeholder:text-slate-400"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 bg-white border border-slate-300 px-2.5 py-1.5 rounded-xl shadow-2xs focus-within:border-emerald-600 transition">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <input
                        type="tel"
                        placeholder="Mobile No."
                        value={customerMobile}
                        onChange={(e) => setCustomerMobile(e.target.value)}
                        className="bg-transparent border-none outline-none w-full text-xs text-slate-800 font-medium placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Single Overall Order / KOT Note Input */}
                  <div className="flex items-center gap-1.5 bg-white border border-slate-300 px-2.5 py-1.5 rounded-xl shadow-2xs focus-within:border-emerald-600 transition">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder={orderMode === 'direct' ? 'Order note (optional)...' : 'Kitchen instruction / KOT Note (e.g. less spicy, pack separately)...'}
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="bg-transparent border-none outline-none w-full text-xs text-slate-800 font-medium placeholder:text-slate-400"
                    />
                  </div>

                  {/* Pricing Totals */}
                  <div className="space-y-1 pt-1 border-t border-slate-200 text-xs">
                    <div className="flex justify-between items-center text-slate-600 font-medium">
                      <span>Subtotal ({totalItemCount} items)</span>
                      <span>₹{totalAmount}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-900 font-black text-sm pt-0.5">
                      <span>Grand Total</span>
                      <span className="text-emerald-950 text-base sm:text-lg">₹{totalAmount}</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="button"
                    onClick={handleSubmitOrder}
                    disabled={submitting || cartList.length === 0}
                    className="w-full h-11 bg-[#003b1b] hover:bg-[#166534] disabled:opacity-40 text-white font-extrabold rounded-xl cursor-pointer text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
                  >
                    {submitting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{orderMode === 'direct' ? 'Saving bill...' : 'Dispatching KOT...'}</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>{orderMode === 'direct' ? 'Add order to Settle' : 'Submit KOT to Kitchen'} (₹{totalAmount})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Variant Selector Submodal */}
        {variantSelectorItem && (
          <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-4 shadow-xl border border-slate-200 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-extrabold text-sm text-slate-900">
                  Select Size for {variantSelectorItem.name}
                </h4>
                <button
                  type="button"
                  onClick={() => setVariantSelectorItem(null)}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {variantSelectorItem.variants.map((v, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAddToCart(variantSelectorItem, v)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/50 transition-colors text-left cursor-pointer active:scale-98"
                  >
                    <span className="font-bold text-xs text-slate-800">{v.name}</span>
                    <span className="font-black text-xs text-emerald-900">₹{v.price}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

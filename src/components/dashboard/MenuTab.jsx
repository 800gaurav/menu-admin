import React, { useState, useMemo } from 'react';
import {
  Pencil, Trash2, Copy, UtensilsCrossed, Plus, Search,
  Filter, Tag, EyeOff, CheckCircle2, XCircle, ChevronDown,
  Layers, DollarSign, SlidersHorizontal, Sparkles
} from 'lucide-react';
import { BACKEND_URL } from '../../api';

export default function MenuTab({
  categories = [],
  menuItems = [],
  tabLoading,
  setIsBulkModalOpen,
  setIsCategoryModalOpen,
  setIsItemModalOpen,
  setCatFormData,
  setItemFormData,
  handleToggleStock,
  handleDuplicateItem,
  handleDeleteItem,
  handleDeleteCategory
}) {
  const [selectedCatId, setSelectedCatId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'inStock' | 'outOfStock'
  const [tagFilter, setTagFilter] = useState('all'); // 'all' | 'Veg' | 'Non-Veg'

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      // Category filter
      if (selectedCatId !== 'all' && String(item.categoryId) !== String(selectedCatId)) {
        return false;
      }
      // Stock filter
      if (stockFilter === 'inStock' && !item.inStock) return false;
      if (stockFilter === 'outOfStock' && item.inStock) return false;
      // Tag filter
      if (tagFilter !== 'all' && !item.tags?.includes(tagFilter)) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }
      return true;
    });
  }, [menuItems, selectedCatId, stockFilter, tagFilter, searchQuery]);

  if (tabLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-emerald-700" />
        <p className="text-xs font-bold text-slate-500 mt-3">Loading menu catalog...</p>
      </div>
    );
  }

  const inStockCount = menuItems.filter(i => i.inStock).length;
  const outOfStockCount = menuItems.length - inStockCount;

  return (
    <div className="space-y-4 sm:space-y-5 text-left animate-fadeIn">

      {/* ── Page Header & Action Controls ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Menu Management</h1>
              <span className="px-2 py-0.5 text-[10px] sm:text-xs font-extrabold bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                {menuItems.length} items
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Organize food categories, prices, sizes, toppings and live inventory.
            </p>
          </div>

          {/* Action buttons (full width on small mobile, auto on desktop) */}
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="flex-1 sm:flex-none h-9 px-3 sm:px-3.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs whitespace-nowrap flex items-center justify-center gap-1.5"
            >
              <DollarSign className="w-3.5 h-3.5 text-amber-700" />
              <span>Bulk Price</span>
            </button>
            <button
              onClick={() => {
                setCatFormData({ name: '', isHidden: false, id: null });
                setIsCategoryModalOpen(true);
              }}
              className="flex-1 sm:flex-none h-9 px-3 sm:px-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs whitespace-nowrap flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-slate-500" />
              <span>Category</span>
            </button>
            <button
              onClick={() => {
                setItemFormData({
                  name: '',
                  description: '',
                  price: '',
                  categoryId: categories[0]?._id || '',
                  tags: ['Veg'],
                  badges: [],
                  image: '',
                  id: null,
                  hasVariants: false,
                  variants: [],
                  addons: [],
                  inStock: true
                });
                setIsItemModalOpen(true);
              }}
              className="flex-1 sm:flex-none h-9 px-3.5 sm:px-4 bg-[#003b1b] hover:bg-[#166534] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors whitespace-nowrap flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-emerald-300" />
              <span>Add Dish</span>
            </button>
          </div>
        </div>

        {/* ── Search & Filter Bar ── */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-3 border-t border-slate-100">
          {/* Search Input */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search dishes by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:ring-2 focus:ring-[#003b1b]/20 focus:border-[#003b1b] text-xs font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Stock Filter Pills */}
          <div className="sm:col-span-3 flex rounded-xl border border-slate-200 p-0.5 bg-slate-50 text-xs font-bold">
            <button
              onClick={() => setStockFilter('all')}
              className={`flex-1 py-1 rounded-lg transition-all cursor-pointer text-center truncate ${
                stockFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({menuItems.length})
            </button>
            <button
              onClick={() => setStockFilter('inStock')}
              className={`flex-1 py-1 rounded-lg transition-all cursor-pointer text-center truncate ${
                stockFilter === 'inStock' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              In ({inStockCount})
            </button>
            <button
              onClick={() => setStockFilter('outOfStock')}
              className={`flex-1 py-1 rounded-lg transition-all cursor-pointer text-center truncate ${
                stockFilter === 'outOfStock' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Out ({outOfStockCount})
            </button>
          </div>

          {/* Dietary Tag Filter */}
          <div className="sm:col-span-3">
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#003b1b]/20 focus:border-[#003b1b]"
            >
              <option value="all">Dietary: All Dishes</option>
              <option value="Veg">🟢 Veg Only</option>
              <option value="Non-Veg">🔴 Non-Veg Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Category Quick-Selector (Horizontal Scroll on Mobile) ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs">
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Categories</span>
          <button
            onClick={() => {
              setCatFormData({ name: '', isHidden: false, id: null });
              setIsCategoryModalOpen(true);
            }}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Category</span>
          </button>
        </div>

        {/* Scrollable pill container */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
          <button
            onClick={() => setSelectedCatId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
              selectedCatId === 'all'
                ? 'bg-[#003b1b] text-white border-[#003b1b] shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            All Categories ({menuItems.length})
          </button>

          {categories.map(c => {
            const count = menuItems.filter(i => String(i.categoryId) === String(c._id)).length;
            const isSelected = selectedCatId === c._id;
            return (
              <div
                key={c._id}
                className={`group flex items-center rounded-xl border shrink-0 transition-all ${
                  isSelected
                    ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400/40 text-emerald-900 font-extrabold shadow-2xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <button
                  onClick={() => setSelectedCatId(c._id)}
                  className="px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <span className={c.isHidden ? 'line-through opacity-60' : ''}>{c.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isSelected ? 'bg-emerald-200/80 text-emerald-900' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>

                {/* Edit / Delete Mini Action */}
                <div className="flex items-center pr-1 opacity-70 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCatFormData({ name: c.name, isHidden: c.isHidden, id: c._id });
                      setIsCategoryModalOpen(true);
                    }}
                    className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-800 hover:bg-slate-200 cursor-pointer"
                    title="Edit category"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCategory(c._id);
                    }}
                    className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="Delete category"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Main Menu Items Grid (Responsive Cards) ── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
            Dishes List ({filteredItems.length})
          </p>
          {(selectedCatId !== 'all' || searchQuery || stockFilter !== 'all' || tagFilter !== 'all') && (
            <button
              onClick={() => {
                setSelectedCatId('all');
                setSearchQuery('');
                setStockFilter('all');
                setTagFilter('all');
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {filteredItems.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 sm:p-14 text-center shadow-xs">
            <UtensilsCrossed className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No dishes match your filter</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try adjusting your search terms or category selection to view items.
            </p>
            <button
              onClick={() => {
                setSelectedCatId('all');
                setSearchQuery('');
                setStockFilter('all');
                setTagFilter('all');
              }}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
            {filteredItems.map(item => {
              const cat = categories.find(c => String(c._id) === String(item.categoryId));
              const isVeg = item.tags?.includes('Veg');

              return (
                <div
                  key={item._id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between group"
                >
                  <div>
                    {/* Media Thumbnail */}
                    <div className="h-36 sm:h-40 bg-slate-100 relative overflow-hidden">
                      {item.image ? (
                        <img
                          src={item.image.startsWith('http') ? item.image : `${BACKEND_URL}${item.image}`}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50">
                          <UtensilsCrossed className="w-8 h-8 text-slate-300 mb-1" />
                          <span className="text-[10px] text-slate-400 font-medium">No artwork uploaded</span>
                        </div>
                      )}

                      {/* Out of Stock Overlay */}
                      {!item.inStock && (
                        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-2xs flex items-center justify-center">
                          <span className="text-white text-[11px] font-black uppercase tracking-wider bg-rose-600 px-3 py-1 rounded-full shadow-md">
                            Out of Stock
                          </span>
                        </div>
                      )}

                      {/* Veg / Non-Veg Icon Badge */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs ${
                          isVeg
                            ? 'bg-emerald-500 text-white'
                            : 'bg-rose-600 text-white'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          {isVeg ? 'Veg' : 'Non-Veg'}
                        </span>
                      </div>

                      {/* Highlight Badge */}
                      {item.badges?.length > 0 && (
                        <span className="absolute top-2.5 right-0 bg-amber-400 text-slate-900 text-[10px] font-black px-2.5 py-0.5 rounded-l-full shadow-xs">
                          {item.badges[0].toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-3.5 sm:p-4">
                      {/* Name & Price */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-1">
                          {item.name}
                        </h4>
                        <span className="font-black text-[#003b1b] text-sm shrink-0 whitespace-nowrap">
                          {item.hasVariants && item.variants?.length > 0
                            ? `₹${Math.min(...item.variants.map(v => v.price))}+`
                            : `₹${item.price}`}
                        </span>
                      </div>

                      {/* Category Label */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[11px] font-bold text-slate-500 truncate">
                          {cat ? cat.name : 'Uncategorized'}
                        </span>
                        {item.hasVariants && (
                          <span className="ml-auto text-[10px] font-extrabold bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
                            {item.variants?.length || 0} Sizes
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed font-normal">
                        {item.description || 'No item description provided.'}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Inventory Toggle */}
                  <div className="px-3.5 py-2.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2">
                    {/* Toggle In Stock */}
                    <button
                      type="button"
                      onClick={() => handleToggleStock(item._id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        item.inStock
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      }`}
                      title={item.inStock ? 'Click to mark Out of Stock' : 'Click to mark In Stock'}
                    >
                      <span className={`w-2 h-2 rounded-full ${item.inStock ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                      <span>{item.inStock ? 'In Stock' : 'Out of Stock'}</span>
                    </button>

                    {/* Action Icon Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleDuplicateItem(item._id)}
                        className="w-7.5 h-7.5 flex items-center justify-center rounded-lg text-slate-500 hover:text-emerald-800 hover:bg-emerald-50 cursor-pointer transition-colors border border-transparent hover:border-emerald-200"
                        title="Duplicate dish"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setItemFormData({
                            name: item.name,
                            description: item.description,
                            price: (item.price || '').toString(),
                            categoryId: item.categoryId,
                            tags: item.tags,
                            badges: item.badges,
                            image: item.image,
                            id: item._id,
                            hasVariants: item.hasVariants || false,
                            variants: item.variants || [],
                            addons: item.addons || [],
                            inStock: item.inStock !== false
                          });
                          setIsItemModalOpen(true);
                        }}
                        className="w-7.5 h-7.5 flex items-center justify-center rounded-lg text-slate-500 hover:text-emerald-800 hover:bg-emerald-50 cursor-pointer transition-colors border border-transparent hover:border-emerald-200"
                        title="Edit dish"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item._id)}
                        className="w-7.5 h-7.5 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors border border-transparent hover:border-rose-200"
                        title="Delete dish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

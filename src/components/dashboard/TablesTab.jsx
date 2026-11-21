import React from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, Download, QrCode, ScanLine } from 'lucide-react';

export default function TablesTab({ tables, tabLoading, setIsTableModalOpen, setTableFormData, handleToggleTableActive, handleDeleteTable, api, restaurant }) {
  if (tabLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003b1b]" />
      </div>
    );
  }

  const activeTables = tables.filter(t => t.isActive).length;
  const maxTables = restaurant?.plan?.maxTables;
  const isLimitReached = typeof maxTables === 'number' && maxTables > 0 && tables.length >= maxTables;

  const handleAddTableClick = () => {
    if (isLimitReached) {
      alert(`Table limit reached (${maxTables} tables) for your "${restaurant?.plan?.name || restaurant?.package || 'Subscription'}" plan. Please contact Super Admin to upgrade your subscription plan to add more tables.`);
      return;
    }
    setTableFormData({ name: '', type: 'Table', id: null });
    setIsTableModalOpen(true);
  };

  return (
    <div className="space-y-5 text-left animate-fadeIn">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">Tables & QR Codes</h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Manage tables, toggle status, and download QR codes.</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <Link to="/admin/qr-generator" className="h-9 px-3.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs">
            <ScanLine className="w-3.5 h-3.5" />
            QR Studio
          </Link>
          <a href={api.tables.downloadZipUrl()} className="h-9 px-3.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50 transition-colors shadow-xs">
            <Download className="w-3.5 h-3.5" />
            Download ZIP
          </a>
          <button 
            onClick={handleAddTableClick} 
            className={`h-9 px-3.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors ${
              isLimitReached 
                ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                : 'bg-[#003b1b] hover:bg-[#166534] text-white'
            }`}
          >
            + Add Table
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-xs font-bold">
          {tables.length}{typeof maxTables === 'number' && maxTables > 0 ? ` / ${maxTables}` : ''} Total Tables
        </span>
        <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-bold">{activeTables} Active</span>
        {tables.length - activeTables > 0 && (
          <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-500 rounded-full text-xs font-bold">{tables.length - activeTables} Inactive</span>
        )}
        {isLimitReached && (
          <span className="px-3 py-1 bg-amber-100 border border-amber-200 text-amber-900 rounded-full text-xs font-black">
            Plan Table Limit Reached ({maxTables})
          </span>
        )}
      </div>

      {/* Grid */}
      {tables.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <QrCode className="w-6 h-6 text-slate-300" />
          </div>
          <h3 className="font-bold text-slate-700 text-sm">No tables yet</h3>
          <p className="text-slate-500 font-medium text-xs mt-1">Add a table to generate its QR code.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {tables.map(t => (
            <div key={t._id} className={`bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col items-center relative transition-all hover:shadow-md ${!t.isActive ? 'opacity-60 bg-slate-50/50' : ''}`}>

              {/* Type badge */}
              <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{t.type}</span>

              {/* Edit / Delete */}
              <div className="absolute top-2 right-2 flex gap-1">
                <button onClick={() => { setTableFormData({ name: t.name, type: t.type, id: t._id }); setIsTableModalOpen(true); }} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-[#003b1b] hover:bg-emerald-50 cursor-pointer transition-colors" title="Edit">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDeleteTable(t._id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors" title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <span className="font-bold text-slate-900 text-sm mt-6 mb-3 text-center">{t.name}</span>

              {/* QR */}
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center justify-center w-28 h-28 relative shadow-xs">
                {t.qrCodeData ? (
                  <img src={t.qrCodeData} alt={t.name} className="w-full h-full object-contain" />
                ) : (
                  <QrCode className="w-8 h-8 text-slate-300" />
                )}
                {!t.isActive && (
                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs rounded-xl flex items-center justify-center">
                    <span className="text-white text-[10px] font-black uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded">Inactive</span>
                  </div>
                )}
              </div>

              <div className="mt-3.5 flex items-center justify-between w-full pt-2 border-t border-slate-100">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 text-xs font-bold">
                  <input type="checkbox" className="rounded text-[#003b1b] focus:ring-[#003b1b] w-4 h-4 cursor-pointer" checked={t.isActive} onChange={() => handleToggleTableActive(t)} />
                  Active
                </label>
                {t.qrCodeData && (
                  <a href={t.qrCodeData} download={`${t.name}_QR.png`} className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 text-xs font-bold transition-colors">
                    <Download className="w-3.5 h-3.5" />
                    Save
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

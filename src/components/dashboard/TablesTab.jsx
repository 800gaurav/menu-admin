import React from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, Download, QrCode, ScanLine, Utensils, Check, CirclePause } from 'lucide-react';

export default function TablesTab({ tables, tabLoading, setIsTableModalOpen, setTableFormData, handleToggleTableActive, handleDeleteTable, api, restaurant }) {
  if (tabLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-emerald-100 border-t-[#003b1b]" />
      </div>
    );
  }

  const activeTables = tables.filter(t => t.isActive).length;
  const inactiveTables = tables.length - activeTables;
  const maxTables = restaurant?.plan?.maxTables;
  const isLimitReached = typeof maxTables === 'number' && maxTables > 0 && tables.length >= maxTables;
  const restaurantName = restaurant?.name?.trim() || 'Your Restaurant';

  const handleAddTableClick = () => {
    if (isLimitReached) {
      alert(`Table limit reached (${maxTables} tables) for your "${restaurant?.plan?.name || restaurant?.package || 'Subscription'}" plan. Please contact Super Admin to upgrade your subscription plan to add more tables.`);
      return;
    }
    setTableFormData({ name: '', type: 'Table', id: null });
    setIsTableModalOpen(true);
  };

  return (
    <div className="animate-fadeIn space-y-6 text-left">
      {/* Page heading */}
      <section className="relative isolate overflow-hidden rounded-3xl border border-emerald-950/10 bg-gradient-to-br from-[#073b25] via-[#0b5133] to-[#123c2d] px-5 py-6 text-white shadow-lg shadow-emerald-950/10 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-10 -top-20 -z-10 h-64 w-64 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-1/3 -z-10 h-48 w-48 rounded-full bg-lime-200/10 blur-3xl" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-emerald-50 backdrop-blur-sm">
              <Utensils className="h-3.5 w-3.5 shrink-0 text-emerald-200" />
              <span className="truncate">{restaurantName}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Tables & QR menus</h1>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-emerald-50/75">Set up your tables and give every guest a quick scan to your menu.</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link to="/admin/qr-generator" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 text-xs font-bold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/20">
              <ScanLine className="h-4 w-4" /> QR Studio
            </Link>
            <a href={api.tables.downloadZipUrl()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 text-xs font-bold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/20">
              <Download className="h-4 w-4" /> Download all
            </a>
            <button onClick={handleAddTableClick} className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-xs font-bold shadow-sm transition ${isLimitReached ? 'bg-amber-400 text-amber-950 hover:bg-amber-300' : 'bg-white text-[#073b25] hover:bg-emerald-50'}`}>
              + Add table
            </button>
          </div>
        </div>
      </section>

      {/* Summary */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.03]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Utensils className="h-5 w-5" /></div>
          <div><p className="text-xs font-semibold text-slate-500">Total tables</p><p className="mt-0.5 text-xl font-bold tracking-tight text-slate-900">{tables.length}<span className="ml-1 text-sm font-semibold text-slate-400">{typeof maxTables === 'number' && maxTables > 0 ? `/ ${maxTables}` : ''}</span></p></div>
        </div>
        <div className="flex items-center gap-3.5 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm shadow-slate-900/[0.03]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Check className="h-5 w-5" /></div>
          <div><p className="text-xs font-semibold text-slate-500">Active</p><p className="mt-0.5 text-xl font-bold tracking-tight text-slate-900">{activeTables}</p></div>
        </div>
        <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.03]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><CirclePause className="h-5 w-5" /></div>
          <div><p className="text-xs font-semibold text-slate-500">Inactive</p><p className="mt-0.5 text-xl font-bold tracking-tight text-slate-900">{inactiveTables}</p></div>
        </div>
      </section>

      {isLimitReached && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100"><CirclePause className="h-4 w-4" /></span>
          <span><strong className="font-bold">Plan table limit reached.</strong> Your plan includes {maxTables} tables.</span>
        </div>
      )}

      {/* Table QR cards */}
      {tables.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"><QrCode className="h-7 w-7" /></div>
          <h2 className="text-base font-bold text-slate-900">Your tables will show up here</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-slate-500">Add your first table to create its QR menu and make ordering easier for guests.</p>
          <button onClick={handleAddTableClick} className="mt-5 inline-flex h-10 items-center rounded-xl bg-[#073b25] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#0b5133]">+ Add your first table</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {tables.map(t => (
            <article key={t._id} className={`group relative overflow-hidden rounded-3xl border bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/[0.07] ${t.isActive ? 'border-slate-200/80' : 'border-slate-200 opacity-75'}`}>
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 pb-3 pt-4">
                <div className="min-w-0">
                  <p className="line-clamp-2 break-words text-[11px] font-bold uppercase leading-4 tracking-[0.12em] text-emerald-800" title={restaurantName}>{restaurantName}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <h2 className="max-w-full break-words text-lg font-bold leading-tight tracking-tight text-slate-900">{t.name}</h2>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500">{t.type}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => { setTableFormData({ name: t.name, type: t.type, id: t._id }); setIsTableModalOpen(true); }} className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-800" title="Edit table" aria-label={`Edit ${t.name}`}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDeleteTable(t._id)} className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="Delete table" aria-label={`Delete ${t.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="relative flex min-h-[220px] items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-50 via-slate-50 to-slate-100 px-5 py-5">
                <div className="absolute inset-0 opacity-[0.28]" style={{ backgroundImage: 'radial-gradient(#94a3b8 0.7px, transparent 0.7px)', backgroundSize: '12px 12px' }} />
                <div className="relative flex h-40 w-40 items-center justify-center rounded-2xl border border-white bg-white p-3 shadow-lg shadow-slate-900/10 ring-1 ring-slate-200/80">
                  {t.qrCodeData ? <img src={t.qrCodeData} alt={`${restaurantName} — ${t.name} QR code`} className="h-full w-full object-contain" /> : <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl bg-slate-50 text-slate-300"><QrCode className="h-10 w-10" /><span className="text-[10px] font-semibold text-slate-400">QR unavailable</span></div>}
                </div>
                {!t.isActive && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/25 backdrop-blur-[2px]"><span className="rounded-full border border-white/20 bg-slate-900/85 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">Inactive</span></div>}
              </div>

              <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
                  <input type="checkbox" className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-800 focus:ring-emerald-700" checked={t.isActive} onChange={() => handleToggleTableActive(t)} />
                  {t.isActive ? 'Available' : 'Paused'}
                </label>
                {t.qrCodeData && <a href={t.qrCodeData} download={`${t.name}_QR.png`} className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-50 px-3 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"><Download className="h-3.5 w-3.5" /> Save QR</a>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

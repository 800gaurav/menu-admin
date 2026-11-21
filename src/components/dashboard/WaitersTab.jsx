import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { Plus, Pencil, Trash2, X, Lock, UserCheck, TrendingUp, ShieldCheck, ShieldOff } from 'lucide-react';

export default function WaitersTab() {
  const [waiters, setWaiters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const fetchWaiters = async () => {
    try { setLoading(true); const data = await api.waiters.getPerformance(); setWaiters(data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchWaiters(); }, []);

  const handleOpenCreate = () => { setName(''); setPin(''); setEditingId(null); setError(''); setIsModalOpen(true); };
  const handleOpenEdit = (w) => { setName(w.name); setPin(w.pin); setEditingId(w._id); setError(''); setIsModalOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    if (!name || !pin || pin.length !== 4 || isNaN(pin)) { setError('Name and 4-digit numeric PIN required.'); return; }
    try {
      if (editingId) await api.waiters.updateWaiter(editingId, { name, pin });
      else await api.waiters.createWaiter({ name, pin });
      setIsModalOpen(false);
      fetchWaiters();
    } catch (err) { setError(err.message || 'Error saving.'); }
  };

  const handleToggleActive = async (id, current) => {
    try { await api.waiters.updateWaiter(id, { isActive: !current }); setWaiters(prev => prev.map(w => w._id === id ? { ...w, isActive: !current } : w)); }
    catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
    if (!await window.showConfirm('Delete this waiter account?')) return;
    try { await api.waiters.deleteWaiter(id); setWaiters(prev => prev.filter(w => w._id !== id)); }
    catch (err) { alert(err.message); }
  };

  const activeCount = waiters.filter(w => w.isActive).length;

  return (
    <div className="space-y-5 text-left animate-fadeIn">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">Waiter Staff</h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Manage waiter accounts, PINs, and order performance.</p>
        </div>
        <button onClick={handleOpenCreate} className="h-9 px-3.5 bg-[#003b1b] hover:bg-[#166534] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors self-start sm:self-auto">
          <Plus className="w-3.5 h-3.5" />
          Add Waiter
        </button>
      </div>

      {/* Stats */}
      {waiters.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-xs font-bold">{waiters.length} Total</span>
          <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-bold">{activeCount} Active</span>
          {waiters.length - activeCount > 0 && (
            <span className="px-3 py-1 bg-rose-50 border border-rose-200 text-rose-800 rounded-full text-xs font-bold">{waiters.length - activeCount} Disabled</span>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003b1b]" />
        </div>
      ) : waiters.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-12 h-12 bg-slate-50 border border-slate-200 flex items-center justify-center rounded-2xl mx-auto mb-3">
            <UserCheck className="w-6 h-6 text-slate-300" />
          </div>
          <h3 className="font-bold text-slate-700 text-sm">No waiters yet</h3>
          <p className="text-slate-500 font-medium text-xs mt-1 max-w-xs mx-auto">Add waiter accounts so staff can place orders using their PIN.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {waiters.map(waiter => (
            <div key={waiter._id} className={`bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col gap-3 hover:shadow-md transition-shadow ${!waiter.isActive ? 'opacity-60 bg-slate-50/50' : ''}`}>

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    <span className="font-black text-slate-800 text-base uppercase">{waiter.name?.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{waiter.name}</h3>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                      <Lock className="w-3 h-3 text-slate-400" />
                      PIN: <strong className="text-slate-800 font-mono font-bold ml-0.5">{waiter.pin}</strong>
                    </div>
                  </div>
                </div>
                <button onClick={() => handleToggleActive(waiter._id, waiter.isActive)} className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border cursor-pointer transition-colors ${waiter.isActive ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'}`}>
                  {waiter.isActive ? <><ShieldCheck className="w-3 h-3 text-emerald-600" /> Active</> : <><ShieldOff className="w-3 h-3 text-rose-600" /> Off</>}
                </button>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-1.5 text-[10.5px] text-slate-600 font-bold uppercase tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Performance
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 font-medium">Orders</span>
                  <span className="font-bold text-slate-900">{waiter.totalOrdersCount || 0}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-slate-200 pt-1.5">
                  <span className="text-slate-600 font-medium">Revenue</span>
                  <span className="font-black text-slate-900 text-sm">₹{(waiter.totalRevenue || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-1 border-t border-slate-100">
                <button onClick={() => handleOpenEdit(waiter)} className="flex-1 h-8 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => handleDelete(waiter._id)} className="flex-1 h-8 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 relative border border-slate-200">
            <button onClick={() => setIsModalOpen(false)} className="absolute right-4 top-4 w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-all">
              <X className="w-4 h-4" />
            </button>

            <div className="mb-5">
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
                {editingId ? 'Edit Account' : 'New Waiter'}
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-2">{editingId ? 'Edit Waiter' : 'Create Waiter Account'}</h2>
            </div>

            {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs font-semibold mb-4">{error}</div>}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramesh Kumar" className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#003b1b]/20 focus:border-[#003b1b] bg-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">4-Digit PIN</label>
                <input type="text" required maxLength="4" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="e.g. 3333" className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs font-mono font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#003b1b]/20 focus:border-[#003b1b] bg-white" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer transition-all">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-[#003b1b] hover:bg-[#166534] text-white font-bold rounded-xl text-xs cursor-pointer transition-all shadow-xs">{editingId ? 'Save Changes' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

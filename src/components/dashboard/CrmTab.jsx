import React from 'react';
import { Users, TrendingUp, RotateCcw, Cake, Download } from 'lucide-react';

export default function CrmTab({ customers = [], advancedAnalytics = {}, tabLoading, api }) {
  const totalCrmRevenue = customers.reduce((sum, c) => sum + (c.totalSpend || 0), 0);

  const metricCards = [
    { label: 'Total Customers', value: customers.length, icon: Users, color: 'text-violet-600', bg: 'bg-violet-500/10 border-violet-200/80' },
    { label: 'Total CRM Spend', value: `₹${totalCrmRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-200/80' },
    { label: 'Returning Guests', value: advancedAnalytics?.customerRetention?.returning || 0, icon: RotateCcw, color: 'text-blue-600', bg: 'bg-blue-500/10 border-blue-200/80' },
    { label: 'Birthdays Tracked', value: customers.filter(c => c.dateOfBirth).length, icon: Cake, color: 'text-rose-600', bg: 'bg-rose-500/10 border-rose-200/80' },
  ];

  return (
    <div className="space-y-5 animate-fadeIn text-left">
      {tabLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003b1b]" />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm">
            <div>
              <h1 className="text-lg font-extrabold text-slate-900">Customer CRM</h1>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Registered profiles, visit logs, and spend tracking.</p>
            </div>
            <a href={api.crm.exportCsvUrl()} className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-[#003b1b] hover:bg-[#166534] text-white rounded-xl text-xs font-bold shadow-xs transition-colors self-start sm:self-auto cursor-pointer">
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </a>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metricCards.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center gap-3.5 hover:shadow-md transition-shadow">
                <div className={`p-3 rounded-xl border ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">{label}</p>
                  <p className="text-xl font-black text-slate-900 mt-0.5">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    {['Customer', 'Contact', 'Total Spend', 'Last Visit'].map(h => (
                      <th key={h} className="px-5 py-3.5 text-[10.5px] font-bold text-slate-700 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-5 py-12 text-center text-slate-500 font-medium">No customer profiles yet.</td>
                    </tr>
                  ) : (
                    customers.map((c) => (
                      <tr key={c._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-slate-900">{c.name || 'Guest'}</td>
                        <td className="px-5 py-3.5 text-slate-600 font-mono font-semibold text-xs">{c.mobile || c.email || '—'}</td>
                        <td className="px-5 py-3.5 font-black text-emerald-700 text-sm">₹{(c.totalSpend || 0).toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-slate-500 font-medium">
                          {c.lastVisitAt ? new Date(c.lastVisitAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

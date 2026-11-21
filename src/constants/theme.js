/**
 * Reusable Design System Tokens & Utility Mappings for Admin Panel
 * Inspired by modern clean dashboard standards (Dhantag/CoreUI/Modern SaaS)
 * Focuses on high-contrast, crystal-clear readability, consistent spacing, and reusability.
 */

export const theme = {
  // Brand colors
  colors: {
    primary: '#003b1b',
    primaryHover: '#166534',
    background: '#f8fafc',
    surface: '#ffffff',
    text: {
      heading: 'text-slate-900',
      body: 'text-slate-800',
      secondary: 'text-slate-600',
      muted: 'text-slate-500',
      inverse: 'text-white',
    },
    border: 'border-slate-200',
    borderLight: 'border-slate-100',
  },

  // Reusable card container styles
  card: {
    base: 'bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow',
    flat: 'bg-white border border-slate-200 rounded-2xl p-5 shadow-sm',
    header: 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm',
  },

  // Typography helpers
  typography: {
    pageTitle: 'text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2',
    pageSubtitle: 'text-xs font-medium text-slate-500 mt-0.5',
    sectionHeader: 'text-xs font-bold uppercase tracking-wider text-slate-500',
    statValue: 'text-2xl font-black text-slate-900 tracking-tight',
    statLabel: 'text-xs font-semibold text-slate-500 uppercase tracking-wider',
  },

  // Status badge styles with rich contrast
  badges: {
    New: 'bg-amber-50 text-amber-800 border border-amber-200/90 font-bold',
    Accepted: 'bg-blue-50 text-blue-800 border border-blue-200/90 font-bold',
    Preparing: 'bg-indigo-50 text-indigo-800 border border-indigo-200/90 font-bold',
    Ready: 'bg-emerald-50 text-emerald-800 border border-emerald-200/90 font-bold',
    Served: 'bg-teal-50 text-teal-800 border border-teal-200/90 font-bold',
    Completed: 'bg-slate-100 text-slate-800 border border-slate-200 font-bold',
    Cancelled: 'bg-rose-50 text-rose-800 border border-rose-200/90 font-bold',
    Paid: 'bg-emerald-50 text-emerald-800 border border-emerald-200/90 font-bold',
    Unpaid: 'bg-amber-50 text-amber-800 border border-amber-200/90 font-bold',
    Rush: 'bg-rose-500 text-white font-black shadow-sm animate-pulse',
    High: 'bg-amber-400 text-slate-900 font-black',
    Normal: 'bg-slate-100 text-slate-700 font-bold',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200/90 font-bold',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200/90 font-bold',
    danger: 'bg-rose-50 text-rose-800 border border-rose-200/90 font-bold',
    info: 'bg-blue-50 text-blue-800 border border-blue-200/90 font-bold',
    neutral: 'bg-slate-100 text-slate-800 border border-slate-200 font-bold',
  },

  // Button styles
  buttons: {
    primary: 'h-8 px-3.5 bg-[#003b1b] hover:bg-[#166534] text-white rounded-xl text-xs font-bold shadow-sm transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95',
    secondary: 'h-8 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95',
    amber: 'h-8 px-3.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95',
    danger: 'h-8 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95',
    icon: 'w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center cursor-pointer transition-colors shrink-0',
    iconDanger: 'w-7 h-7 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 hover:text-rose-700 flex items-center justify-center cursor-pointer transition-colors shrink-0',
  },

  // Input & Form elements
  inputs: {
    text: 'h-8 bg-white border border-slate-200 rounded-xl px-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#003b1b]/20 focus:border-[#003b1b] transition-all',
    searchContainer: 'flex items-center bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl',
    select: 'h-8 px-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 text-xs font-medium outline-none focus:ring-2 focus:ring-[#003b1b]/20 focus:border-[#003b1b] transition-all',
  },

  // Table styling
  tables: {
    container: 'bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden',
    thead: 'bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10.5px] tracking-wider',
    th: 'px-4 py-3',
    row: 'hover:bg-slate-50/60 transition-colors border-b border-slate-100 text-slate-700 text-xs',
    td: 'px-4 py-3',
  }
};

export default theme;

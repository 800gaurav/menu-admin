import React from 'react';

export default function CategoryModal({
  isOpen,
  onClose,
  catFormData,
  setCatFormData,
  handleSaveCategory
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 text-xs">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-5 sm:p-6 relative text-left">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <h2 className="text-base sm:text-lg font-black text-slate-900 mb-4">
          {catFormData.id ? 'Edit Category' : 'Create Category'}
        </h2>

        <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Category Name</label>
            <input
              type="text"
              className="w-full h-10 px-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#003b1b]/20 focus:border-[#003b1b] text-xs font-semibold text-slate-800 bg-white placeholder:text-slate-400"
              placeholder="e.g. Starters, Main Course, Drinks..."
              value={catFormData.name}
              onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value })}
              required
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 pt-1 select-none">
            <input
              type="checkbox"
              className="rounded text-[#003b1b] focus:ring-[#003b1b] w-4 h-4 cursor-pointer"
              checked={catFormData.isHidden}
              onChange={(e) => setCatFormData({ ...catFormData, isHidden: e.target.checked })}
            />
            <span>Temporarily Hide Category (e.g. during specific hours)</span>
          </label>

          <button
            type="submit"
            className="w-full h-11 bg-[#003b1b] text-white font-bold rounded-xl mt-4 cursor-pointer hover:bg-[#166534] transition-colors"
          >
            {catFormData.id ? 'Save changes' : 'Create Category'}
          </button>
        </form>
      </div>
    </div>
  );
}

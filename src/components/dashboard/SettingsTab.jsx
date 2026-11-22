import React, { useState, useEffect } from 'react';
import { Trash2, ImagePlus, ShoppingCart, KeyRound, Palette, Globe, Smartphone, ShieldCheck } from 'lucide-react';
import { api, BACKEND_URL } from '../../api';

export default function SettingsTab({
  restaurant,
  setRestaurant,
  handleSaveBranding,
  handleSaveCustomerDataSettings,
  handleSaveActionButtons,
  setCustomerField,
  handleUploadLogo,
  handleUploadBanner,
  logoUploadStatus
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwStatus, setPwStatus] = useState({ type: '', message: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [iconUploadStatus, setIconUploadStatus] = useState({});

  const [kitchenPin, setKitchenPin] = useState(restaurant?.pins?.kitchen || '1111');
  const [counterPin, setCounterPin] = useState(restaurant?.pins?.counter || '2222');
  const [pinStatus, setPinStatus] = useState({ type: '', message: '' });
  const [pinLoading, setPinLoading] = useState(false);

  useEffect(() => {
    if (restaurant?.pins) {
      setKitchenPin(restaurant.pins.kitchen || '1111');
      setCounterPin(restaurant.pins.counter || '2222');
    }
  }, [restaurant?.pins]);

  const handleSavePins = async (e) => {
    e.preventDefault();
    setPinStatus({ type: '', message: '' });
    if (kitchenPin.length !== 4 || isNaN(kitchenPin)) {
      setPinStatus({ type: 'error', message: 'Kitchen PIN must be a 4-digit number.' });
      return;
    }
    if (counterPin.length !== 4 || isNaN(counterPin)) {
      setPinStatus({ type: 'error', message: 'Counter PIN must be a 4-digit number.' });
      return;
    }
    try {
      setPinLoading(true);
      const res = await api.restaurant.updateProfile({
        pins: {
          kitchen: kitchenPin,
          counter: counterPin
        }
      });
      setRestaurant(res);
      setPinStatus({ type: 'success', message: 'Access PINs updated successfully.' });
    } catch (err) {
      setPinStatus({ type: 'error', message: err.message || 'Failed to update PINs.' });
    } finally {
      setPinLoading(false);
    }
  };

  const validatePWAIcon = (file) => new Promise((resolve) => {
    if (file.type !== 'image/png') {
      resolve({ ok: false, error: 'Only PNG format allowed.' });
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;
      if (w !== h) { resolve({ ok: false, error: `Must be square. Yours is ${w}×${h}px.` }); return; }
      if (w < 192) { resolve({ ok: false, error: `Too small (${w}px). Min 192×192px.` }); return; }
      resolve({ ok: true, width: w, height: h });
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ ok: false, error: 'Cannot read file.' }); };
    img.src = url;
  });

  const handleUploadAppLogo = async (e, logoField) => {
    const file = e.target.files[0];
    if (!file) return;
    setIconUploadStatus(prev => ({ ...prev, [logoField]: { loading: true, error: null } }));
    const validation = await validatePWAIcon(file);
    if (!validation.ok) {
      setIconUploadStatus(prev => ({ ...prev, [logoField]: { loading: false, error: validation.error } }));
      e.target.value = '';
      return;
    }
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await api.restaurant.uploadImage(formData);
      setRestaurant({ ...restaurant, brandingSettings: { ...(restaurant.brandingSettings || {}), [logoField]: res.imageUrl } });
      setIconUploadStatus(prev => ({ ...prev, [logoField]: { loading: false, error: null, success: `${validation.width}×${validation.height}px — Uploaded!` } }));
    } catch {
      setIconUploadStatus(prev => ({ ...prev, [logoField]: { loading: false, error: 'Upload failed.' } }));
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwStatus({ type: '', message: '' });
    if (newPassword !== confirmPassword) { setPwStatus({ type: 'error', message: 'Passwords do not match.' }); return; }
    if (newPassword.length < 5) { setPwStatus({ type: 'error', message: 'Minimum 5 characters required.' }); return; }
    try {
      setPwLoading(true);
      const res = await api.restaurant.changePassword({ currentPassword, newPassword });
      setPwStatus({ type: 'success', message: res.message || 'Password updated.' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      setPwStatus({ type: 'error', message: err.message || 'Failed to update password.' });
    } finally {
      setPwLoading(false);
    }
  };

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500 text-sm bg-white rounded-2xl border border-slate-200 shadow-sm gap-3">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#003b1b]" />
        Loading settings...
      </div>
    );
  }

  const inputCls = "w-full h-9 px-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#003b1b]/20 focus:border-[#003b1b] bg-white transition-all";
  const labelCls = "block text-xs font-bold text-slate-700 mb-1";
  const sectionCls = "bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4";

  const actionTypes = ['googleReview','instagram','facebook','whatsapp','call','website','shareMenu','addToHomeScreen','feedback','loyalty','callWaiter'];
  const typeLabels = { googleReview:'Review Us', instagram:'Instagram', facebook:'Facebook', whatsapp:'WhatsApp', call:'Call Us', website:'Website', shareMenu:'Share Menu', addToHomeScreen:'Install App', feedback:'Feedback', loyalty:'Loyalty Club', callWaiter:'Call Waiter' };
  const typeIcons = { googleReview:'reviews', instagram:'photo_camera', facebook:'facebook', whatsapp:'forum', call:'call', website:'language', shareMenu:'share', addToHomeScreen:'download', feedback:'rate_review', loyalty:'loyalty', callWaiter:'notifications_active' };

  return (
    <div className="space-y-5 animate-fadeIn max-w-4xl text-left">

      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm">
        <h1 className="text-lg font-extrabold text-slate-900">Settings</h1>
        <p className="text-xs font-medium text-slate-500 mt-0.5">Manage branding, PWA setup, action buttons, and account security.</p>
      </div>

      {/* ── Branding + Preview ── */}
      <form onSubmit={handleSaveBranding} className="grid grid-cols-1 md:grid-cols-3 gap-5">

        <div className="md:col-span-2 space-y-5">

          {/* Basic Info */}
          <div className={sectionCls}>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Palette className="w-4 h-4 text-[#003b1b]" />
              <h2 className="text-sm font-semibold text-slate-800">Branding & Identity</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Restaurant Name</label>
                <input type="text" className={inputCls} value={restaurant?.name || ''} onChange={(e) => setRestaurant({ ...restaurant, name: e.target.value })} required />
                <p className="text-xs text-slate-500 mt-1 font-medium">Used as PWA app name for diners.</p>
              </div>

              <div>
                <label className={labelCls}>Brand Accent Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" className="w-9 h-9 border border-slate-200 rounded-lg p-0.5 cursor-pointer bg-white" value={restaurant?.brandColor || '#003b1b'} onChange={(e) => setRestaurant({ ...restaurant, brandColor: e.target.value })} />
                  <span className="font-mono text-xs text-slate-600 font-semibold">{restaurant?.brandColor}</span>
                </div>
              </div>

              <div>
                <label className={labelCls}>Tagline</label>
                <input type="text" className={inputCls} value={restaurant?.brandingSettings?.tagline || ''} onChange={(e) => setRestaurant({ ...restaurant, brandingSettings: { ...(restaurant?.brandingSettings || {}), tagline: e.target.value } })} placeholder="e.g. Delicious food, every time" />
              </div>

              <div>
                <label className={labelCls}>Browser Page Title</label>
                <input type="text" className={inputCls} value={restaurant?.brandingSettings?.pageTitle || ''} onChange={(e) => setRestaurant({ ...restaurant, brandingSettings: { ...(restaurant?.brandingSettings || {}), pageTitle: e.target.value } })} />
              </div>

              <div className="sm:col-span-2">
                <label className={labelCls}>Footer Text</label>
                <input type="text" className={inputCls} value={restaurant?.brandingSettings?.footerText || ''} onChange={(e) => setRestaurant({ ...restaurant, brandingSettings: { ...(restaurant?.brandingSettings || {}), footerText: e.target.value } })} />
              </div>
            </div>

            {/* Logo Upload */}
            <div>
              <label className={labelCls}>Logo (PNG, Square, Min 192×192)</label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                  {restaurant?.logo ? (
                    <img src={restaurant.logo.startsWith('http') ? restaurant.logo : `${BACKEND_URL}${restaurant.logo}`} alt="logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-400 text-xl">🏢</span>
                  )}
                </div>
                <div>
                  <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer text-xs font-semibold shadow-xs transition-colors ${logoUploadStatus?.loading ? 'bg-slate-300 text-white' : 'bg-[#003b1b] hover:bg-[#166534] text-white'}`}>
                    {logoUploadStatus?.loading ? '⏳ Uploading...' : '📁 Choose PNG'}
                    <input type="file" accept="image/png" onChange={handleUploadLogo} className="hidden" disabled={!!logoUploadStatus?.loading} />
                  </label>
                  {logoUploadStatus?.error && <p className="text-xs text-rose-600 mt-1 font-semibold">⚠️ {logoUploadStatus.error}</p>}
                  {logoUploadStatus?.success && <p className="text-xs text-emerald-700 mt-1 font-semibold">✅ {logoUploadStatus.success}</p>}
                  {!logoUploadStatus?.error && !logoUploadStatus?.success && <p className="text-xs text-slate-500 mt-1 font-medium">Square PNG, 1:1 ratio for best results.</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Banner Slider */}
          <div className={sectionCls}>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <ImagePlus className="w-4 h-4 text-[#003b1b]" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">Menu Banner Slider</h2>
                <p className="text-xs text-slate-500 font-medium">Images shown as carousel on customer menu. Use 16:9 ratio.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {(restaurant?.banners || []).map((ban, idx) => (
                <div key={idx} className="relative h-20 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 group">
                  <img src={ban.startsWith('http') ? ban : `${BACKEND_URL}${ban}`} alt={`Banner ${idx}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setRestaurant({ ...restaurant, banners: restaurant.banners.filter((_, i) => i !== idx) })} className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <label className="h-20 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 cursor-pointer transition-all">
                <ImagePlus className="w-5 h-5 text-slate-400" />
                <span className="text-[10px] text-slate-600 font-bold mt-1">Add</span>
                <input type="file" accept="image/*" multiple onChange={handleUploadBanner} className="hidden" />
              </label>
            </div>
          </div>

          {/* App Names */}
          <div className={sectionCls}>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Smartphone className="w-4 h-4 text-[#003b1b]" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">White-Label App Names</h2>
                <p className="text-xs text-slate-500 font-medium">Custom names for each terminal PWA.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'pwaName', label: 'Diner Menu App' },
                { key: 'waiterAppName', label: 'Waiter Terminal' },
                { key: 'kitchenAppName', label: 'Kitchen Display (KDS)' },
                { key: 'adminAppName', label: 'Admin Portal' },
                { key: 'counterAppName', label: 'Counter POS' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className={labelCls}>{label}</label>
                  <input type="text" className={inputCls} value={restaurant?.brandingSettings?.[key] || ''} onChange={(e) => setRestaurant({ ...restaurant, brandingSettings: { ...(restaurant?.brandingSettings || {}), [key]: e.target.value } })} placeholder={`e.g. Spice ${label}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Socials */}
          <div className={sectionCls}>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Globe className="w-4 h-4 text-[#003b1b]" />
              <h2 className="text-sm font-semibold text-slate-800">Social Links & Reviews</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Google Review Link', field: 'reviewLink', type: 'url', direct: true },
                { label: 'Instagram', field: 'instagram', type: 'url' },
                { label: 'Facebook', field: 'facebook', type: 'url' },
                { label: 'WhatsApp Number', field: 'whatsapp', type: 'text' },
              ].map(({ label, field, type, direct }) => (
                <div key={field}>
                  <label className={labelCls}>{label}</label>
                  <input
                    type={type}
                    className={inputCls}
                    value={direct ? (restaurant?.[field] || '') : (restaurant?.socialLinks?.[field] || '')}
                    onChange={(e) => direct
                      ? setRestaurant({ ...restaurant, [field]: e.target.value })
                      : setRestaurant({ ...restaurant, socialLinks: { ...(restaurant?.socialLinks || {}), [field]: e.target.value } })
                    }
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {[
                { key: 'showGoogleReview', label: 'Show Google Review Badge' },
                { key: 'showInstagram', label: 'Show Instagram Link' },
                { key: 'showFacebook', label: 'Show Facebook Link' },
                { key: 'showWhatsapp', label: 'Show WhatsApp Button' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                  <input type="checkbox" className="rounded text-[#003b1b] focus:ring-[#003b1b] w-3.5 h-3.5" checked={!!restaurant?.brandingSettings?.[key]} onChange={(e) => setRestaurant({ ...restaurant, brandingSettings: { ...(restaurant?.brandingSettings || {}), [key]: e.target.checked } })} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="w-full h-10 bg-[#003b1b] hover:bg-[#166534] text-white font-semibold rounded-xl cursor-pointer shadow-sm transition-colors text-sm">
            Save Branding
          </button>
        </div>

        {/* Live Preview */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col items-center">
          <p className="text-xs font-semibold text-slate-600 mb-4">Live Preview</p>
          <div className="w-52 h-[380px] border-[7px] border-slate-800 rounded-[26px] overflow-hidden flex flex-col bg-slate-50 shadow-inner text-[10px]">
            <div className="bg-white px-2.5 py-2.5 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full overflow-hidden bg-[#003b1b] flex items-center justify-center text-white text-[8px] font-bold">
                  {restaurant?.logo ? <img src={restaurant.logo.startsWith('http') ? restaurant.logo : `${BACKEND_URL}${restaurant.logo}`} alt="L" className="w-full h-full object-cover" /> : 'S'}
                </div>
                <span className="font-semibold text-slate-800 truncate max-w-[80px]">{restaurant?.name || 'Restaurant'}</span>
              </div>
              <ShoppingCart className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="p-2.5 flex-grow space-y-2.5">
              <div className="h-14 w-full bg-slate-200 rounded-lg" />
              <div className="bg-white p-2 rounded-lg border border-slate-200 flex gap-2">
                <div className="w-8 h-8 bg-slate-100 rounded-md shrink-0" />
                <div className="flex-grow min-w-0">
                  <span className="font-semibold text-slate-800 block text-[9px] truncate">Paneer Tikka</span>
                  <span className="text-[9px] font-bold mt-0.5 block" style={{ color: restaurant?.brandColor || '#003b1b' }}>₹325</span>
                </div>
                <button type="button" className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] shrink-0" style={{ backgroundColor: restaurant?.brandColor || '#003b1b' }}>+</button>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 flex gap-2">
                <div className="w-8 h-8 bg-slate-100 rounded-md shrink-0" />
                <div className="flex-grow min-w-0">
                  <span className="font-semibold text-slate-800 block text-[9px] truncate">Dal Makhani</span>
                  <span className="text-[9px] font-bold mt-0.5 block" style={{ color: restaurant?.brandColor || '#003b1b' }}>₹220</span>
                </div>
                <button type="button" className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] shrink-0" style={{ backgroundColor: restaurant?.brandColor || '#003b1b' }}>+</button>
              </div>
            </div>
            <div className="p-2 bg-white border-t border-slate-100">
              <div className="py-2 px-2.5 rounded-lg text-white flex justify-between items-center" style={{ backgroundColor: restaurant?.brandColor || '#003b1b' }}>
                <span className="font-semibold text-[8px]">View Cart</span>
                <span className="font-semibold text-[8px]">₹545</span>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* ── Floating Action Buttons ── */}
      <div className={sectionCls}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Smart Floating Actions</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Quick action buttons shown on customer menu.</p>
          </div>
          <button
            type="button"
            onClick={() => setRestaurant({ ...restaurant, actionButtons: [...(restaurant.actionButtons || []), { type: 'shareMenu', label: 'Share', icon: 'share', enabled: true, order: (restaurant.actionButtons || []).length }] })}
            className="h-8 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
          >
            + Add Action
          </button>
        </div>

        <div className="space-y-2.5">
          {(restaurant.actionButtons || []).map((action, index) => (
            <div key={`${action.type}-${index}`} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
                <select
                  value={action.type}
                  onChange={(e) => {
                    const next = [...(restaurant.actionButtons || [])];
                    const t = e.target.value;
                    next[index] = { ...action, type: t, icon: typeIcons[t] || 'bolt', label: typeLabels[t] || t };
                    setRestaurant({ ...restaurant, actionButtons: next });
                  }}
                  className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none"
                >
                  {actionTypes.map(t => <option key={t} value={t}>{typeLabels[t] || t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Label</label>
                <input value={action.label || ''} onChange={(e) => { const next = [...(restaurant.actionButtons || [])]; next[index] = { ...action, label: e.target.value }; setRestaurant({ ...restaurant, actionButtons: next }); }} placeholder="Button label" className="w-full h-8 rounded-lg border border-slate-200 px-2.5 bg-white text-xs text-slate-700 outline-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">URL / Phone</label>
                {['addToHomeScreen', 'callWaiter', 'shareMenu'].includes(action.type) ? (
                  <input disabled placeholder="Auto-handled" className="w-full h-8 rounded-lg border border-slate-200 bg-slate-100 px-2.5 text-xs text-slate-500 cursor-not-allowed" />
                ) : (
                  <input value={action.url || ''} onChange={(e) => { const next = [...(restaurant.actionButtons || [])]; next[index] = { ...action, url: e.target.value }; setRestaurant({ ...restaurant, actionButtons: next }); }} placeholder="https:// or tel:" className="w-full h-8 rounded-lg border border-slate-200 px-2.5 bg-white text-xs text-slate-700 outline-none" />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Order</label>
                <input type="number" value={action.order || 0} onChange={(e) => { const next = [...(restaurant.actionButtons || [])]; next[index] = { ...action, order: Number(e.target.value) }; setRestaurant({ ...restaurant, actionButtons: next }); }} className="w-full h-8 rounded-lg border border-slate-200 px-2.5 bg-white text-xs text-slate-700 outline-none" />
              </div>

              <div className="flex items-end gap-3 pb-0.5">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                  <input type="checkbox" className="rounded text-[#003b1b] focus:ring-[#003b1b] w-3.5 h-3.5" checked={!!action.enabled} onChange={(e) => { const next = [...(restaurant.actionButtons || [])]; next[index] = { ...action, enabled: e.target.checked }; setRestaurant({ ...restaurant, actionButtons: next }); }} />
                  Enabled
                </label>
                <button type="button" onClick={() => { const next = (restaurant.actionButtons || []).filter((_, i) => i !== index); setRestaurant({ ...restaurant, actionButtons: next }); }} className="text-rose-500 hover:text-rose-700 cursor-pointer transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button onClick={handleSaveActionButtons} className="h-9 px-4 rounded-lg bg-[#003b1b] hover:bg-[#166534] text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer">
          Save Action Buttons
        </button>
      </div>

      {/* ── Change Password & PINs Security Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Change Password Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
            <KeyRound className="w-4 h-4 text-rose-500" />
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Change Password</h2>
              <p className="text-[10px] text-slate-400">Update your admin account credentials.</p>
            </div>
          </div>

          {pwStatus.message && (
            <div className={`p-3 rounded-xl border text-xs font-semibold mb-4 ${pwStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
              {pwStatus.message}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3">
            {[
              { label: 'Current Password', val: currentPassword, set: setCurrentPassword, ph: '••••••••' },
              { label: 'New Password', val: newPassword, set: setNewPassword, ph: 'Min 5 characters' },
              { label: 'Confirm New Password', val: confirmPassword, set: setConfirmPassword, ph: '••••••••' },
            ].map(({ label, val, set, ph }) => (
              <div key={label}>
                <label className={labelCls}>{label}</label>
                <input type="password" required className={inputCls} value={val} onChange={(e) => set(e.target.value)} placeholder={ph} />
              </div>
            ))}
            <button type="submit" disabled={pwLoading} className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 mt-1">
              {pwLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Access PINs Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Terminal Access PINs</h2>
              <p className="text-[11px] font-medium text-slate-500">Configure security PINs for Kitchen and Counter terminals.</p>
            </div>
          </div>

          {pinStatus.message && (
            <div className={`p-3 rounded-xl border text-xs font-semibold mb-4 ${pinStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
              {pinStatus.message}
            </div>
          )}

          <form onSubmit={handleSavePins} className="space-y-3">
            <div>
              <label className={labelCls}>Kitchen Panel (KDS) PIN</label>
              <input 
                type="text" 
                maxLength={4} 
                pattern="\d{4}" 
                required 
                className={inputCls} 
                value={kitchenPin} 
                onChange={(e) => setKitchenPin(e.target.value)} 
                placeholder="e.g. 1111" 
              />
              <p className="text-[10px] text-slate-500 mt-1 font-semibold">Must be exactly a 4-digit code.</p>
            </div>

            <div>
              <label className={labelCls}>Counter POS Panel PIN</label>
              <input 
                type="text" 
                maxLength={4} 
                pattern="\d{4}" 
                required 
                className={inputCls} 
                value={counterPin} 
                onChange={(e) => setCounterPin(e.target.value)} 
                placeholder="e.g. 2222" 
              />
              <p className="text-[10px] text-slate-500 mt-1 font-semibold">Must be exactly a 4-digit code.</p>
            </div>

            <button 
              type="submit" 
              disabled={pinLoading} 
              className="w-full h-9 bg-[#003b1b] hover:bg-[#166534] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 mt-1"
            >
              {pinLoading ? 'Saving...' : 'Save PIN settings'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

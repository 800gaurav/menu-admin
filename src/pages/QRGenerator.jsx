import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { api } from '../api';
import { ArrowLeft, Download, QrCode, LayoutTemplate, AlignJustify } from 'lucide-react';

export default function QRGenerator() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  
  const [restaurant, setRestaurant] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loading, setLoading] = useState(true);

  // QR Design States
  const [template, setTemplate] = useState('tent'); // 'minimal' | 'tent' | 'banner'
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [accentColor, setAccentColor] = useState('#003b1b');
  const [label, setLabel] = useState('SCAN TO ORDER');
  const [footerLabel, setFooterLabel] = useState('Table');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [profile, tableList] = await Promise.all([
        api.restaurant.getProfile(),
        api.tables.getTables()
      ]);
      setRestaurant(profile);
      setTables(tableList);
      if (profile.brandColor) {
        setAccentColor(profile.brandColor);
      }
      if (tableList.length > 0) {
        setSelectedTable(tableList[0]);
      }
    } catch (err) {
      console.error(err);
      navigate('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  // Redraw Canvas whenever states change
  useEffect(() => {
    if (!loading && selectedTable) {
      drawQRCanvas();
    }
  }, [loading, selectedTable, template, fgColor, bgColor, accentColor, label, footerLabel, restaurant]);

  const drawQRCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // 1. Resolve Target URL
    const userUrl = (import.meta.env.VITE_USER_URL || window.location.origin).replace(/\/+$/, '');
    const targetUrl = selectedTable.targetUrl || `${userUrl}/menu/${restaurant.slug}?table=${encodeURIComponent(selectedTable.name)}`;

    const drawRoundedRect = (c, x, y, width, height, radius) => {
      c.beginPath();
      c.moveTo(x + radius, y);
      c.lineTo(x + width - radius, y);
      c.quadraticCurveTo(x + width, y, x + width, y + radius);
      c.lineTo(x + width, y + height - radius);
      c.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      c.lineTo(x + radius, y + height);
      c.quadraticCurveTo(x, y + height, x, y + height - radius);
      c.lineTo(x, y + radius);
      c.quadraticCurveTo(x, y, x + radius, y);
      c.closePath();
    };

    const drawFittedText = (c, value, x, y, maxWidth, size, weight = '700') => {
      const text = String(value || '').trim();
      let fontSize = size;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `${weight} ${fontSize}px system-ui, -apple-system, sans-serif`;
      while (fontSize > 12 && c.measureText(text).width > maxWidth) {
        fontSize -= 1;
        c.font = `${weight} ${fontSize}px system-ui, -apple-system, sans-serif`;
      }
      let fitted = text;
      while (fitted.length > 3 && c.measureText(fitted).width > maxWidth) fitted = `${fitted.slice(0, -4)}...`;
      c.fillText(fitted, x, y);
    };

    try {
      // 2. Generate raw QR code image in memory (using high error correction for framing)
      const qrDataUrl = await QRCode.toDataURL(targetUrl, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 320,
        color: {
          dark: fgColor,
          light: '#ffffff'
        }
      });

      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      
      qrImg.onload = () => {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (template === 'minimal') {
          // Minimal Template: just the QR code
          canvas.width = 320;
          canvas.height = 320;
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(qrImg, 10, 10, 300, 300);
        }
        else if (template === 'tent') {
          // Portrait table tent: clean, high contrast, and easy to scan at a glance.
          canvas.width = 440;
          canvas.height = 660;
          ctx.fillStyle = '#f4f7f5';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.fillStyle = accentColor;
          drawRoundedRect(ctx, 16, 16, 408, 628, 28);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          drawRoundedRect(ctx, 22, 22, 396, 616, 24);
          ctx.fill();
          ctx.fillStyle = accentColor;
          drawRoundedRect(ctx, 22, 22, 396, 178, 24);
          ctx.fill();
          ctx.fillRect(22, 170, 396, 30);

          ctx.fillStyle = 'rgba(255,255,255,.16)';
          drawRoundedRect(ctx, 185, 48, 70, 4, 2);
          ctx.fill();
          ctx.fillStyle = '#d9f4e5';
          ctx.font = '700 12px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('WELCOME TO', canvas.width / 2, 78);
          ctx.fillStyle = '#ffffff';
          drawFittedText(ctx, restaurant?.name || 'Your Restaurant', canvas.width / 2, 119, 350, 30, '800');
          ctx.fillStyle = 'rgba(255,255,255,.78)';
          ctx.font = '600 12px system-ui, -apple-system, sans-serif';
          ctx.fillText('GOOD FOOD. GREAT MOMENTS.', canvas.width / 2, 158);

          ctx.fillStyle = '#eef5f0';
          drawRoundedRect(ctx, 91, 218, 258, 48, 16);
          ctx.fill();
          ctx.fillStyle = accentColor;
          drawFittedText(ctx, `${footerLabel}: ${selectedTable.name}`, canvas.width / 2, 242, 226, 17, '800');

          ctx.fillStyle = '#ffffff';
          drawRoundedRect(ctx, 68, 286, 304, 304, 24);
          ctx.fill();
          ctx.strokeStyle = '#e7ece8';
          ctx.lineWidth = 2;
          drawRoundedRect(ctx, 68, 286, 304, 304, 24);
          ctx.stroke();
          ctx.drawImage(qrImg, 91, 309, 258, 258);

          ctx.fillStyle = '#17231c';
          drawFittedText(ctx, label || 'SCAN TO ORDER', canvas.width / 2, 611, 350, 19, '800');
          ctx.fillStyle = '#748178';
          ctx.font = '500 11px system-ui, -apple-system, sans-serif';
          ctx.fillText('Scan with your camera - No app needed', canvas.width / 2, 626);
        }
        else if (template === 'banner') {
          // Landscape counter stand: clear welcome message on the left, QR on the right.
          canvas.width = 760;
          canvas.height = 480;
          ctx.fillStyle = '#f2f5f3';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = accentColor;
          drawRoundedRect(ctx, 16, 16, 728, 448, 30);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          drawRoundedRect(ctx, 22, 22, 716, 436, 25);
          ctx.fill();

          ctx.fillStyle = '#f5f8f6';
          drawRoundedRect(ctx, 40, 40, 386, 400, 22);
          ctx.fill();
          ctx.fillStyle = accentColor;
          drawRoundedRect(ctx, 40, 40, 386, 12, 6);
          ctx.fill();
          ctx.fillStyle = '#6b7b70';
          ctx.font = '700 13px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText('WELCOME TO', 72, 94);
          ctx.fillStyle = accentColor;
          ctx.textAlign = 'left';
          let brandSize = 31;
          const brandName = String(restaurant?.name || 'Your Restaurant').trim();
          ctx.font = `800 ${brandSize}px system-ui, -apple-system, sans-serif`;
          while (brandSize > 16 && ctx.measureText(brandName).width > 320) {
            brandSize -= 1;
            ctx.font = `800 ${brandSize}px system-ui, -apple-system, sans-serif`;
          }
          let fittedBrand = brandName;
          while (fittedBrand.length > 3 && ctx.measureText(fittedBrand).width > 320) fittedBrand = `${fittedBrand.slice(0, -4)}...`;
          ctx.fillText(fittedBrand, 72, 140);
          ctx.fillStyle = '#647168';
          ctx.font = '500 15px system-ui, -apple-system, sans-serif';
          ctx.fillText('Browse the menu and order your favorites.', 72, 178);

          ctx.fillStyle = accentColor;
          drawRoundedRect(ctx, 72, 226, 320, 60, 16);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          drawFittedText(ctx, `${footerLabel}: ${selectedTable.name}`, 232, 256, 280, 19, '800');

          ctx.fillStyle = '#334238';
          ctx.font = '700 14px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('A better way to order', 72, 332);
          ctx.fillStyle = '#718078';
          ctx.font = '500 13px system-ui, -apple-system, sans-serif';
          ctx.fillText('1. Open your camera', 72, 362);
          ctx.fillText('2. Scan the code to see our menu', 72, 386);
          ctx.fillText('3. Order from your table', 72, 410);

          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = 'rgba(15, 23, 42, .10)';
          ctx.shadowBlur = 18;
          ctx.shadowOffsetY = 6;
          drawRoundedRect(ctx, 448, 40, 272, 400, 22);
          ctx.fill();
          ctx.shadowColor = 'transparent';
          ctx.shadowOffsetY = 0;
          ctx.fillStyle = '#f7faf8';
          drawRoundedRect(ctx, 472, 62, 224, 224, 18);
          ctx.fill();
          ctx.drawImage(qrImg, 486, 76, 196, 196);
          ctx.fillStyle = '#1c2920';
          drawFittedText(ctx, label || 'SCAN TO ORDER', 584, 324, 230, 18, '800');
          ctx.fillStyle = '#748178';
          ctx.font = '500 12px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Scan with your camera - No app needed', 584, 351);
          ctx.fillStyle = '#a0aaa3';
          ctx.font = '600 10px system-ui, -apple-system, sans-serif';
          ctx.fillText('DIGITAL MENU', 584, 398);
        }
      };
    } catch (err) {
      console.error('Canvas compilation error:', err);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `QR_${selectedTable?.name || 'Stitch'}_${template}.png`;
    link.click();
  };

  const TEMPLATES = [
    { id: 'minimal', label: 'Minimal', detail: 'QR only', icon: QrCode },
    { id: 'tent', label: 'Tent card', detail: 'Portrait table display', icon: LayoutTemplate },
    { id: 'banner', label: 'Table stand', detail: 'Landscape counter display', icon: AlignJustify },
  ];
  const selectedTemplate = TEMPLATES.find(item => item.id === template) || TEMPLATES[1];

  return (
    <div className="min-h-screen bg-[#f4f6f4] font-sans text-left text-[#191c1e] flex flex-col md:flex-row">

      {/* ── Settings Panel ── */}
      <aside className="z-10 flex w-full flex-col overflow-y-auto border-r border-slate-200 bg-white shadow-xl shadow-slate-900/[0.04] md:w-[360px]">

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <button
            onClick={() => navigate('/admin')}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-slate-900">QR Design Studio</h1>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Make your menu stand out</p>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#003b1b]"></div>
          </div>
        ) : (
          <div className="flex-1 space-y-6 p-5 text-xs">

            {/* Table Select */}
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Table / Location</label>
              <select
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-800 focus:bg-white focus:ring-4 focus:ring-emerald-900/10"
                value={selectedTable?._id || ''}
                onChange={(e) => setSelectedTable(tables.find(t => t._id === e.target.value))}
              >
                {tables.map(t => <option key={t._id} value={t._id}>{t.name} ({t.type})</option>)}
              </select>
            </div>

            {/* Template */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Choose a layout</label>
                <span className="text-[10px] font-medium text-slate-400">3 styles</span>
              </div>
              <div className="space-y-2">
                {TEMPLATES.map(({ id, label: templateLabel, detail, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setTemplate(id)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                      template === id
                        ? 'border-emerald-900/25 bg-emerald-50/70 text-emerald-950 shadow-sm ring-1 ring-emerald-900/5'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                    aria-pressed={template === id}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${template === id ? 'bg-emerald-900 text-white' : 'bg-slate-100 text-slate-500'}`}><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold">{templateLabel}</span>
                      <span className={`mt-0.5 block text-[10px] font-medium ${template === id ? 'text-emerald-800/70' : 'text-slate-400'}`}>{detail}</span>
                    </span>
                    <span className={`h-4 w-4 shrink-0 rounded-full border-[5px] ${template === id ? 'border-emerald-800 bg-white' : 'border-slate-300 bg-white'}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Labels */}
            {template !== 'minimal' && (
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Scan callout text</label>
                  <input
                    type="text"
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700 outline-none focus:border-emerald-800 focus:ring-4 focus:ring-emerald-900/10"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Table label prefix</label>
                  <input
                    type="text"
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700 outline-none focus:border-emerald-800 focus:ring-4 focus:ring-emerald-900/10"
                    value={footerLabel}
                    onChange={(e) => setFooterLabel(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5">
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Brand color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color" value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                  />
                  <span className="font-mono text-[10px] text-slate-500 uppercase">{accentColor}</span>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">QR color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color" value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                  />
                  <span className="font-mono text-[10px] text-slate-500 uppercase">{fgColor}</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Download Button */}
        <div className="sticky bottom-0 border-t border-slate-100 bg-white p-5">
          <button
            onClick={handleDownload}
            disabled={!selectedTable}
            className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#073b25] text-sm font-bold text-white shadow-lg shadow-emerald-950/15 transition hover:bg-[#0b5133] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Download PNG
          </button>
        </div>
      </aside>

      {/* ── Canvas Preview ── */}
      <main className="flex min-h-[70vh] flex-1 flex-col items-center justify-center gap-5 overflow-auto bg-[#e9eeeb] p-5 sm:p-8">
        <div className="flex w-full max-w-4xl items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Live preview</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{selectedTemplate.label} <span className="font-normal text-slate-500">· {selectedTable?.name || 'Select a table'}</span></p>
          </div>
          <span className="rounded-full border border-white bg-white/80 px-3 py-1.5 text-[10px] font-semibold text-slate-500 shadow-sm">PNG export · High resolution</span>
        </div>
        <div className="flex min-h-[340px] w-full max-w-4xl items-center justify-center overflow-auto rounded-3xl border border-white/80 bg-[linear-gradient(135deg,#f8faf9_0%,#e8efea_100%)] p-5 shadow-inner sm:p-8">
          <canvas
            ref={canvasRef}
            className="max-h-[72vh] max-w-full rounded-xl bg-white shadow-2xl shadow-slate-900/20"
          />
        </div>
        <p className="text-center text-[10px] font-medium text-slate-500">Preview updates as you customize - download the PNG when ready</p>
      </main>
    </div>
  );
}

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
    const targetUrl = selectedTable.targetUrl || `http://localhost:5173/menu/${restaurant.slug}?table=${encodeURIComponent(selectedTable.name)}`;

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
          // Tent Card / Portrait Standee Template (PhonePe / Paytm style)
          canvas.width = 400;
          canvas.height = 600;
          
          // Background Color (Soft neutral grey/slate background)
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Outer Border
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 14;
          ctx.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);
          
          // Top Header Header Block (Deep rich gradient)
          const grad = ctx.createLinearGradient(14, 14, canvas.width - 24, 140);
          grad.addColorStop(0, accentColor);
          grad.addColorStop(1, '#0f172a');
          ctx.fillStyle = grad;
          ctx.fillRect(14, 14, canvas.width - 28, 146);

          // Top Header Tagline/Brand Text
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.font = '900 24px system-ui, -apple-system, sans-serif';
          ctx.fillText(restaurant?.name?.toUpperCase() || 'STITCH CAFE', canvas.width / 2, 70);

          ctx.fillStyle = '#f1f5f9';
          ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
          // ctx.fillText((restaurant?.phone || restaurant?.email || 'SCAN TO ORDER ONLINE').toUpperCase(), canvas.width / 2, 105);

          // Draw a soft separator line
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(40, 120);
          ctx.lineTo(canvas.width - 40, 120);
          ctx.stroke();

          // Main QR White Card Container (with soft shadow)
          ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
          ctx.shadowBlur = 15;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 8;

          ctx.fillStyle = '#ffffff';
          drawRoundedRect(ctx, 35, 140, 330, 390, 24);
          ctx.fill();

          // Disable shadow for inner drawings
          ctx.shadowColor = 'transparent';

          // Table / Node Pill badge above QR
          ctx.fillStyle = accentColor;
          drawRoundedRect(ctx, 110, 165, 180, 42, 12);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.font = '900 14px system-ui, -apple-system, sans-serif';
          ctx.fillText(`${footerLabel.toUpperCase()}: ${selectedTable.name.toUpperCase()}`, canvas.width / 2, 191);

          // Draw the QR Code image inside the card
          ctx.drawImage(qrImg, 75, 225, 250, 250);

          // Instruction Text below QR
          ctx.fillStyle = '#475569';
          ctx.textAlign = 'center';
          ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
          ctx.fillText(label.toUpperCase(), canvas.width / 2, 502);

          // Bottom Bar details
          ctx.fillStyle = '#64748b';
          ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
          ctx.fillText('NO APP REQUIRED • SCAN TO BROWSE & PAY', canvas.width / 2, 555);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '900 10px system-ui, -apple-system, sans-serif';
     
        }
        else if (template === 'banner') {
          // Banner / Landscape POS Standee Template
          canvas.width = 640;
          canvas.height = 400;

          // Background
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Outer Border
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 14;
          ctx.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);

          // Left Rounded Card Panel (Info panel)
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.05)';
          ctx.shadowBlur = 10;
          drawRoundedRect(ctx, 30, 30, 310, 340, 20);
          ctx.fill();
          ctx.shadowColor = 'transparent';

          // Left Panel Header
          ctx.fillStyle = accentColor;
          ctx.font = '900 22px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(restaurant?.name?.toUpperCase() || 'STITCH CAFE', 55, 80);

          // Line separator
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(55, 105);
          ctx.lineTo(315, 105);
          ctx.stroke();

          // Left Panel Instructions
          ctx.fillStyle = '#1e293b';
          ctx.font = '900 13px system-ui, -apple-system, sans-serif';
          ctx.fillText('EASY TO ORDER:', 55, 135);

          ctx.fillStyle = '#475569';
          ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
          ctx.fillText('1. Open your phone camera or QR scanner', 55, 175);
          ctx.fillText('2. Scan the code to view the live menu', 55, 205);
          ctx.fillText('3. Add your favorite dishes to basket', 55, 235);
          ctx.fillText('4. Confirm order, chef begins cooking!', 55, 265);

          // Table badge inside Left panel
          ctx.fillStyle = accentColor;
          drawRoundedRect(ctx, 55, 300, 260, 46, 12);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = '900 14px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${footerLabel.toUpperCase()} - ${selectedTable.name.toUpperCase()}`, 185, 329);

          // Right Rounded Card Panel (QR panel)
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.05)';
          ctx.shadowBlur = 10;
          drawRoundedRect(ctx, 365, 30, 245, 340, 20);
          ctx.fill();
          ctx.shadowColor = 'transparent';

          // Border for QR card
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 3;
          drawRoundedRect(ctx, 365, 30, 245, 340, 20);
          ctx.stroke();

          // QR Code Image
          ctx.drawImage(qrImg, 382, 50, 210, 210);

          // Scanner calls
          ctx.fillStyle = '#1e293b';
          ctx.textAlign = 'center';
          ctx.font = '900 13px system-ui, -apple-system, sans-serif';
          ctx.fillText(label.toUpperCase(), 488, 295);

          ctx.fillStyle = '#64748b';
          ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
          ctx.fillText('Scan with Camera / No App Required', 488, 320);

          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
          ctx.fillText('POWERED BY STITCH MENU', 488, 345);
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
    { id: 'minimal', label: 'Minimal', icon: QrCode },
    { id: 'tent',    label: 'Tent Card', icon: LayoutTemplate },
    { id: 'banner',  label: 'Table Stand', icon: AlignJustify },
  ];

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e] font-sans flex flex-col md:flex-row text-left">

      {/* ── Settings Panel ── */}
      <aside className="w-full md:w-[340px] bg-white border-r border-slate-200 flex flex-col overflow-y-auto">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <button
            onClick={() => navigate('/admin')}
            className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-bold text-sm text-slate-800">QR Design Studio</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Canvas Generator</p>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#003b1b]"></div>
          </div>
        ) : (
          <div className="flex-1 p-5 space-y-5 text-xs">

            {/* Table Select */}
            <div>
              <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Table / Location</label>
              <select
                className="w-full h-9 px-3 border border-slate-200 rounded-lg outline-none bg-white text-slate-700 font-medium text-xs focus:ring-1 focus:ring-[#003b1b]"
                value={selectedTable?._id || ''}
                onChange={(e) => setSelectedTable(tables.find(t => t._id === e.target.value))}
              >
                {tables.map(t => <option key={t._id} value={t._id}>{t.name} ({t.type})</option>)}
              </select>
            </div>

            {/* Template */}
            <div>
              <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Layout Template</label>
              <div className="grid grid-cols-3 gap-2">
                {TEMPLATES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setTemplate(id)}
                    className={`py-2.5 px-1 border rounded-xl font-semibold flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                      template === id
                        ? 'border-[#003b1b] bg-[#003b1b]/5 text-[#003b1b]'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[9px]">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Labels */}
            {template !== 'minimal' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Scan Callout Text</label>
                  <input
                    type="text"
                    className="w-full h-9 px-3 border border-slate-200 rounded-lg outline-none text-slate-700 font-medium focus:ring-1 focus:ring-[#003b1b]"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Table Label Prefix</label>
                  <input
                    type="text"
                    className="w-full h-9 px-3 border border-slate-200 rounded-lg outline-none text-slate-700 font-medium focus:ring-1 focus:ring-[#003b1b]"
                    value={footerLabel}
                    onChange={(e) => setFooterLabel(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Colors */}
            <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">Brand Color</label>
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
                <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">QR Color</label>
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
        <div className="p-5 border-t border-slate-100">
          <button
            onClick={handleDownload}
            disabled={!selectedTable}
            className="w-full h-10 bg-[#003b1b] hover:bg-[#166534] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download PNG
          </button>
        </div>
      </aside>

      {/* ── Canvas Preview ── */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-900 overflow-auto gap-4">
        <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest">Live Preview</p>
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700/50 shadow-2xl flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="max-w-full rounded-xl shadow-lg bg-white"
            style={{ maxHeight: '72vh' }}
          />
        </div>
        <p className="text-slate-600 text-[10px]">Updates in real-time · Exported PNG matches canvas 1:1</p>
      </main>
    </div>
  );
}

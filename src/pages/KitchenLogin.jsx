import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ChefHat, Delete } from 'lucide-react';

export default function KitchenLogin() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleKeyPress = (num) => {
    if (error) setError('');
    if (pin.length < 4) {
      setPin(prev => prev + num);
    }
  };

  const handleClear = () => {
    setPin('');
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (pin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    try {
      setLoading(true);
      setError('');
      // Perform pin login for role: kitchen
      const res = await api.auth.pinLogin(slug, 'kitchen', pin);
      localStorage.setItem('kitchen_token', res.token);
      localStorage.setItem('kitchen_slug', res.restaurantSlug);
      localStorage.setItem('restaurant_id', res.restaurantId);
      localStorage.setItem('restaurant_slug', res.restaurantSlug);
      
      // Navigate to kitchen panel
      navigate(`/admin/kitchen/${slug}`);
    } catch (err) {
      setError(err.message || 'Incorrect PIN. Please try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when 4 digits are entered
  React.useEffect(() => {
    if (pin.length === 4) {
      handleSubmit();
    }
  }, [pin]);

  return (
    <div className="min-h-screen bg-[#0b1329] text-white flex flex-col justify-between p-6 select-none font-sans">
      <div className="flex-grow flex flex-col justify-center items-center max-w-sm mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mx-auto mb-4">
            <ChefHat className="w-7 h-7 text-orange-500 animate-bounce" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-100">Kitchen Display (KDS)</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">{slug?.replace('-', ' ')}</p>
        </div>

        {/* PIN Indicators */}
        <div className="flex justify-center gap-4 mb-8">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                pin.length > index
                  ? 'bg-orange-500 border-orange-500 scale-110 shadow-[0_0_8px_rgba(249,115,22,0.5)]'
                  : 'border-slate-700 bg-transparent'
              }`}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-red-400 text-xs font-bold mb-4 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl text-center w-full animate-shake">
            {error}
          </p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              disabled={loading}
              className="h-16 rounded-full bg-slate-900 hover:bg-slate-800 active:scale-95 text-xl font-bold flex items-center justify-center transition-all border border-slate-800/50 shadow-sm cursor-pointer text-slate-200"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-16 rounded-full bg-slate-900/40 text-slate-400 hover:text-white active:scale-95 text-xs font-bold flex items-center justify-center transition-all cursor-pointer"
          >
            CLEAR
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            disabled={loading}
            className="h-16 rounded-full bg-slate-900 hover:bg-slate-800 active:scale-95 text-xl font-bold flex items-center justify-center transition-all border border-slate-800/50 shadow-sm cursor-pointer text-slate-200"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-16 rounded-full bg-slate-900/40 text-slate-400 hover:text-white active:scale-95 flex items-center justify-center transition-all cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="text-center text-[10px] text-slate-500 font-medium pb-2">
        Stitch Digital Menu SaaS • Kitchen Security Panel
      </div>
    </div>
  );
}

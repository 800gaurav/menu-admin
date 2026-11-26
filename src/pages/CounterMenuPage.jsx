import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { optimizeMenuItemImage } from '../utils/imageOptimizer';
import MenuTab from '../components/dashboard/MenuTab';
import MenuItemModal from '../components/dashboard/MenuItemModal';

const emptyItem = () => ({ name: '', description: '', price: '', categoryId: '', tags: ['Veg'], badges: [], image: '', id: null, hasVariants: false, variants: [], inStock: true });

export default function CounterMenuPage({ embedded = false }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemFormData, setItemFormData] = useState(emptyItem());

  const refresh = async () => {
    setLoading(true);
    try {
      const [cats, items] = await Promise.all([api.menu.getCategories(), api.menu.getItems()]);
      setCategories(Array.isArray(cats) ? cats : []);
      setMenuItems(Array.isArray(items) ? items : []);
    } catch (error) {
      window.alert(error.message || 'Could not load menu');
    } finally { setLoading(false); }
  };
  useEffect(() => {
    let mounted = true;
    Promise.all([api.menu.getCategories(), api.menu.getItems()])
      .then(([cats, items]) => {
        if (!mounted) return;
        setCategories(Array.isArray(cats) ? cats : []);
        setMenuItems(Array.isArray(items) ? items : []);
      })
      .catch(error => { if (mounted) window.alert(error.message || 'Could not load menu'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const handleSaveItem = async (event) => {
    event.preventDefault();
    const payload = { ...itemFormData, inStock: itemFormData.inStock !== false, price: itemFormData.hasVariants ? undefined : parseFloat(itemFormData.price || 0), variants: itemFormData.hasVariants ? itemFormData.variants.map(v => ({ name: v.name, price: parseFloat(v.price || 0) })) : [] };
    try {
      if (itemFormData.id) await api.menu.updateItem(itemFormData.id, payload); else await api.menu.createItem(payload);
      setIsItemModalOpen(false); setItemFormData(emptyItem()); await refresh();
    } catch (error) { window.alert(error.message || 'Error saving menu item'); }
  };
  const handleUploadItemImageForm = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const optimized = await optimizeMenuItemImage(file); const data = new FormData(); data.append('image', optimized.file);
      const result = await api.restaurant.uploadImage(data); setItemFormData(prev => ({ ...prev, image: result.imageUrl }));
    } catch (error) { window.alert(`Image upload failed: ${error.message}`); }
    finally { event.target.value = ''; }
  };
  if (embedded) {
    return (
      <div className="w-full text-slate-800 text-left animate-fadeIn">
        <MenuTab categories={categories} menuItems={menuItems} tabLoading={loading} setIsItemModalOpen={setIsItemModalOpen} setItemFormData={setItemFormData} counterMode />
        <MenuItemModal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} itemFormData={itemFormData} setItemFormData={setItemFormData} categories={categories} handleSaveItem={handleSaveItem} handleUploadItemImageForm={handleUploadItemImageForm} />
      </div>
    );
  }

  return <div className="min-h-screen bg-slate-50 pb-8 text-slate-800">
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6">
      <button onClick={() => navigate(`/admin/counter/${slug}`)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition" aria-label="Back to counter"><ArrowLeft size={18} /></button>
      <div className="min-w-0"><h1 className="font-extrabold text-slate-900">Manage menu</h1><p className="text-xs text-slate-500">Add dishes, update products and availability</p></div>
    </header>
    <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
      <MenuTab categories={categories} menuItems={menuItems} tabLoading={loading} setIsItemModalOpen={setIsItemModalOpen} setItemFormData={setItemFormData} counterMode />
    </main>
    <MenuItemModal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} itemFormData={itemFormData} setItemFormData={setItemFormData} categories={categories} handleSaveItem={handleSaveItem} handleUploadItemImageForm={handleUploadItemImageForm} />
  </div>;
}

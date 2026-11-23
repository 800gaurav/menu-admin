import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { api, removeRestaurantToken } from './api';

// Import Admin/Counter/Kitchen pages
import RestaurantAdminLogin from './pages/RestaurantAdminLogin';
import RestaurantAdminDashboard from './pages/RestaurantAdminDashboard';
import QRGenerator from './pages/QRGenerator';
import CounterPanel from './pages/CounterPanel';
import KitchenPanel from './pages/KitchenPanel';
import KitchenLogin from './pages/KitchenLogin';
import BillPrint from './pages/BillPrint';

let restaurantAuthCheck = null;

const validateRestaurantSession = () => {
  if (restaurantAuthCheck) return restaurantAuthCheck;

  restaurantAuthCheck = api.restaurant.getProfile()
    .then(() => true)
    .catch((error) => {
      if (error.status === 401 || error.status === 403) {
        removeRestaurantToken();
        return false;
      }
      // A temporary network/server error should not erase a valid session.
      return true;
    })
    .finally(() => {
      restaurantAuthCheck = null;
    });

  return restaurantAuthCheck;
};

const RequireRestaurantAuth = ({ children }) => {
  const [authorized, setAuthorized] = React.useState(false);
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      localStorage.setItem('restaurant_token', tokenParam);
      const idParam = params.get('restaurant_id');
      const slugParam = params.get('restaurant_slug');
      if (idParam) localStorage.setItem('restaurant_id', idParam);
      if (slugParam) localStorage.setItem('restaurant_slug', slugParam);

      const cleanUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
      window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    }

    if (!localStorage.getItem('restaurant_token')) {
      setChecked(true);
      return;
    }

    let active = true;
    validateRestaurantSession().then((isAuthorized) => {
      if (!active) return;
      setAuthorized(isAuthorized);
      setChecked(true);
    });

    return () => { active = false; };
  }, []);

  if (!checked) {
    return <div className="min-h-screen bg-[#0F172A]" aria-label="Checking session" />;
  }
  return authorized ? children : <Navigate to="/admin/login" replace />;
};

const RequireCounterAuth = ({ children }) => {
  const { slug } = useParams();
  const token = localStorage.getItem('restaurant_token');
  const tokenSlug = localStorage.getItem('restaurant_slug');

  if (token && tokenSlug === slug) {
    return children;
  }

  // Clear if mismatched
  localStorage.removeItem('restaurant_token');
  localStorage.removeItem('restaurant_id');
  localStorage.removeItem('restaurant_slug');
  return <Navigate to="/admin/login" replace />;
};

const RequireKitchenAuth = ({ children }) => {
  const { slug } = useParams();
  const kitchenToken = localStorage.getItem('kitchen_token');
  const kitchenSlug = localStorage.getItem('kitchen_slug');

  if (kitchenToken && kitchenSlug === slug) {
    return children;
  }

  const adminToken = localStorage.getItem('restaurant_token');
  const adminSlug = localStorage.getItem('restaurant_slug');

  if (adminToken && adminSlug === slug) {
    return children;
  }

  // Clear mismatched kitchen token, but don't touch admin token
  localStorage.removeItem('kitchen_token');
  localStorage.removeItem('kitchen_slug');
  return <Navigate to={`/kitchen/${slug}/login`} replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Restaurant Admin Routes */}
        <Route path="/admin/login" element={<RestaurantAdminLogin />} />
        <Route path="/admin/wizard" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<RequireRestaurantAuth><RestaurantAdminDashboard /></RequireRestaurantAuth>} />
        <Route path="/admin/qr-generator" element={<RequireRestaurantAuth><QRGenerator /></RequireRestaurantAuth>} />

        {/* Counter Billing Panel */}
        <Route path="/counter/:slug" element={<RequireCounterAuth><CounterPanel /></RequireCounterAuth>} />

        {/* Kitchen Panel View */}
        <Route path="/kitchen/:slug" element={<RequireKitchenAuth><KitchenPanel /></RequireKitchenAuth>} />
        <Route path="/kitchen/:slug/login" element={<KitchenLogin />} />

        {/* Invoice Bill Print */}
        <Route path="/bill-print/:orderId" element={<BillPrint />} />

        {/* Fallbacks */}
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

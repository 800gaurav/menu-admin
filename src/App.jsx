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
import PinLogin from './pages/PinLogin';
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
      restaurantAuthCheck = null; // Clear cached check if incoming new token
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

  if (token && (!tokenSlug || tokenSlug === slug)) {
    return children;
  }

  // Clear if mismatched
  if (tokenSlug && tokenSlug !== slug) {
    localStorage.removeItem('restaurant_token');
    localStorage.removeItem('restaurant_id');
    localStorage.removeItem('restaurant_slug');
  }
  return <Navigate to={`/admin/counter/${slug}/login`} replace />;
};

const CounterRedirect = () => {
  const slug = localStorage.getItem('restaurant_slug');
  if (slug) {
    return <Navigate to={`/admin/counter/${slug}`} replace />;
  }
  return <Navigate to="/admin/login" replace />;
};

const ScopedCounterRouteRedirect = ({ login = false }) => {
  const { slug } = useParams();
  if (!slug) {
    const savedSlug = localStorage.getItem('restaurant_slug');
    if (savedSlug) {
      return <Navigate to={`/admin/counter/${savedSlug}${login ? '/login' : ''}`} replace />;
    }
    return <Navigate to="/admin/login" replace />;
  }
  return <Navigate to={`/admin/counter/${slug}${login ? '/login' : ''}`} replace />;
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
  return <Navigate to={`/admin/kitchen/${slug}/login`} replace />;
};

const ScopedKitchenRouteRedirect = ({ login = false }) => {
  const { slug } = useParams();
  return <Navigate to={`/admin/kitchen/${slug}${login ? '/login' : ''}`} replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Restaurant Admin Routes */}
        <Route path="/admin/login" element={<RestaurantAdminLogin />} />
        <Route path="/admin/wizard" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<RequireRestaurantAuth><RestaurantAdminDashboard /></RequireRestaurantAuth>} />
        <Route path="/admin/" element={<RequireRestaurantAuth><RestaurantAdminDashboard /></RequireRestaurantAuth>} />
        <Route path="/admin/qr-generator" element={<RequireRestaurantAuth><QRGenerator /></RequireRestaurantAuth>} />

        {/* Counter Billing Panel - In PWA Scope /admin/ */}
        <Route path="/admin/counter/:slug" element={<RequireCounterAuth><CounterPanel /></RequireCounterAuth>} />
        <Route path="/admin/counter/:slug/:view" element={<RequireCounterAuth><CounterPanel /></RequireCounterAuth>} />
        <Route path="/admin/counter/:slug/login" element={<PinLogin role="counter" />} />
        <Route path="/admin/counter" element={<CounterRedirect />} />
        <Route path="/admin/counter/" element={<CounterRedirect />} />

        {/* Keep legacy /counter URLs working while moving Counter into the PWA scope */}
        <Route path="/counter/:slug" element={<ScopedCounterRouteRedirect />} />
        <Route path="/counter/:slug/login" element={<ScopedCounterRouteRedirect login />} />
        <Route path="/counter" element={<ScopedCounterRouteRedirect />} />
        <Route path="/counter/" element={<ScopedCounterRouteRedirect />} />

        {/* Kitchen Panel View */}
        <Route path="/admin/kitchen/:slug" element={<RequireKitchenAuth><KitchenPanel /></RequireKitchenAuth>} />
        <Route path="/admin/kitchen/:slug/login" element={<KitchenLogin />} />
        {/* Keep old kitchen URLs working while moving KDS into the PWA scope. */}
        <Route path="/kitchen/:slug" element={<ScopedKitchenRouteRedirect />} />
        <Route path="/kitchen/:slug/login" element={<ScopedKitchenRouteRedirect login />} />

        {/* Invoice Bill Print */}
        <Route path="/bill-print/:orderId" element={<BillPrint />} />

        {/* Fallbacks */}
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

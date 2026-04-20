import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import ScanPage from './pages/ScanPage';
import HomePage from './pages/HomePage';
import StallPage from './pages/StallPage';
import OrderPage from './pages/OrderPage';
import ProfilePage from './pages/ProfilePage';

import VendorDashboard from './pages/VendorDashboard';
import VendorStallSelection from './pages/VendorStallSelection';
import GlobalLoader from './components/GlobalLoader';


// 🔐 FIXED PROTECTED ROUTE (NO CONFLICTS)
function ProtectedRoute({ children, requireRole = 'customer', requireStall = false }) {
  const { isAuthenticated, loading, user } = useAuth();

  // ⏳ Wait for auth to load FIRST
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary-500/30 border-t-primary-400 animate-spin" />
      </div>
    );
  }

  // 🚫 Not authenticated → always go to scan
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // 🧠 Vendor flow
  if (user?.role === 'vendor') {
    // If trying to access customer pages → redirect
    if (requireRole === 'customer') {
      return <Navigate to={user?.stall_id ? "/vendor" : "/vendor/select-stall"} replace />;
    }

    // If vendor but no stall → force selection
    if (requireStall && !user?.stall_id) {
      return <Navigate to="/vendor/select-stall" replace />;
    }
  }

  // 🧠 Customer trying vendor route
  if (requireRole === 'vendor' && user?.role !== 'vendor') {
    return <Navigate to="/home" replace />;
  }

  return children;
}


// 🧭 ROUTES
function AppRoutes() {
  return (
    <Routes>
      {/* Entry point */}
      <Route path="/" element={<ScanPage />} />

      {/* Customer */}
      <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/stall/:id" element={<ProtectedRoute><StallPage /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><OrderPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

      {/* Vendor */}
      <Route
        path="/vendor/select-stall"
        element={
          <ProtectedRoute requireRole="vendor">
            <VendorStallSelection />
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendor"
        element={
          <ProtectedRoute requireRole="vendor" requireStall>
            <VendorDashboard />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}


// 🚀 MAIN APP
function AppContent() {
  const { backendReady } = useAuth();

  if (!backendReady) {
    return <GlobalLoader />;
  }

  return (
    <div className="animate-fade-in">
      <AppRoutes />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1e1b2e',
            color: '#f8fafc',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#1e1b2e' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#1e1b2e' },
          },
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
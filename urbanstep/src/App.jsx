import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { CartProvider } from './contexts/CartContext';
import { ShiftProvider } from './contexts/ShiftContext';
import { Layout } from './layout/Layout';
import { ProtectedRoute } from './routes/ProtectedRoute';

// Pages
const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const POS = lazy(() => import('./pages/POS'));
const CashierTerminal = lazy(() => import('./pages/CashierTerminal'));
const Products = lazy(() => import('./pages/Products'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Customers = lazy(() => import('./pages/Customers'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const Delivery = lazy(() => import('./pages/Delivery'));
const Purchases = lazy(() => import('./pages/Purchases'));

export const App = () => {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <AuthProvider>
          <CartProvider>
            <ShiftProvider>
              <BrowserRouter>
                <Suspense fallback={<div role="status" aria-live="polite" className="min-h-screen flex items-center justify-center text-sm text-gray-500">Cargando…</div>}>
                <Routes>
                  <Route path="/landing" element={<Landing />} />
                  <Route path="/login" element={<Navigate to="/landing?login=true" replace />} />
                  {/* Dedicated Fullscreen Cashier Terminal */}
                  <Route path="/cashier" element={<ProtectedRoute module="pos"><CashierTerminal /></ProtectedRoute>} />
                  {/* Admin & Management Layout */}
                  <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                    <Route index element={<ProtectedRoute module="dashboard"><Dashboard /></ProtectedRoute>} />
                    <Route path="pos" element={<ProtectedRoute module="pos"><POS /></ProtectedRoute>} />
                    <Route path="products" element={<ProtectedRoute module="products"><Products /></ProtectedRoute>} />
                    <Route path="inventory" element={<ProtectedRoute module="inventory"><Inventory /></ProtectedRoute>} />
                    <Route path="purchases" element={<ProtectedRoute module="purchases"><Purchases /></ProtectedRoute>} />
                    <Route path="customers" element={<ProtectedRoute module="customers"><Customers /></ProtectedRoute>} />
                    <Route path="delivery" element={<ProtectedRoute module="delivery"><Delivery /></ProtectedRoute>} />
                    <Route path="reports" element={<ProtectedRoute module="reports"><Reports /></ProtectedRoute>} />
                    <Route path="settings" element={<ProtectedRoute module="settings"><Settings /></ProtectedRoute>} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                </Suspense>
              </BrowserRouter>
              <Toaster position="top-right" />
            </ShiftProvider>
          </CartProvider>
        </AuthProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
};

export default App;
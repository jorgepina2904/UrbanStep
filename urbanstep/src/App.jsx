import React from 'react';
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
import Login from './pages/Login';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import CashierTerminal from './pages/CashierTerminal';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Delivery from './pages/Delivery';

export const App = () => {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <AuthProvider>
          <CartProvider>
            <ShiftProvider>
              <BrowserRouter>
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
                    <Route path="customers" element={<ProtectedRoute module="customers"><Customers /></ProtectedRoute>} />
                    <Route path="delivery" element={<ProtectedRoute module="delivery"><Delivery /></ProtectedRoute>} />
                    <Route path="reports" element={<ProtectedRoute module="reports"><Reports /></ProtectedRoute>} />
                    <Route path="settings" element={<ProtectedRoute module="settings"><Settings /></ProtectedRoute>} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
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
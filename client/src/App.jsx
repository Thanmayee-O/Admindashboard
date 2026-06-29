import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import SellerLogin from './pages/SellerLogin';
import SellerDashboard from './pages/SellerDashboard';
import SellerOrderDetail from './pages/SellerOrderDetail';
import MyOrders from './pages/MyOrders';
import CustomerOrderDetail from './pages/CustomerOrderDetail';
import ShippingLogin from './pages/ShippingLogin';
import ShippingDashboard from './pages/ShippingDashboard';
import ShippingOrderDetail from './pages/ShippingOrderDetail';
import './App.css';

function App() {
  return (
    <Router>
      <CartProvider>
        <div className="App" style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
          <Navbar />
          
          <main style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '0 1.5rem' }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetails />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/orders" element={<Navigate to="/my-orders" replace />} />
              <Route path="/my-orders" element={<MyOrders />} />
              <Route path="/order/:id" element={<CustomerOrderDetail />} />
              <Route path="/seller/login" element={<SellerLogin />} />
              <Route path="/seller/dashboard" element={<SellerDashboard />} />
              <Route path="/seller/orders" element={<SellerDashboard />} />
              <Route path="/seller/order/:id" element={<SellerOrderDetail />} />
              <Route path="/seller/earnings" element={<SellerDashboard />} />
              <Route path="/shipping/login" element={<ShippingLogin />} />
              <Route path="/shipping/dashboard" element={<ShippingDashboard />} />
              <Route path="/shipping/orders" element={<ShippingDashboard />} />
              <Route path="/shipping/order/:id" element={<ShippingOrderDetail />} />
            </Routes>
          </main>
        </div>
      </CartProvider>
    </Router>
  );
}

export default App;

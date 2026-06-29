import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

const API_PAYMENT_URL = 'https://admindashboard-13rm.onrender.com/api/v1/payments';

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = () => {
    fetch(`${API_PAYMENT_URL}/orders`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOrders(data.orders);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch orders:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000); // Auto-poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <Toaster position="top-right" />
      <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 700, margin: 0 }}>🛒 My Orders</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>Track and manage your order history.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {[1, 2].map((i) => (
            <div key={i} className="skeleton-pulse" style={{ width: '100%', height: '120px', borderRadius: '12px', background: '#F9FAFB' }}></div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <span style={{ fontSize: '3rem' }}>🛍️</span>
          <h3 style={{ margin: '1rem 0 0.5rem 0' }}>No orders found</h3>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 1.5rem 0' }}>You haven't placed any orders yet.</p>
          <Link to="/products" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-block' }}>
            Browse Catalog
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {orders.map((order) => (
            <div key={order._id} className="glass-card" style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="order-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Order Reference</span>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>#{order._id}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Placed On</span>
                  <div style={{ fontSize: '0.85rem' }}>{new Date(order.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount Charged</span>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-secondary)', fontFamily: 'var(--font-mono)' }}>
                    ₹{(order.totalAmount / 100).toFixed(2)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px',
                    background: order.paymentStatus === 'Paid' ? 'rgba(46, 125, 50, 0.08)' : 'rgba(211, 47, 47, 0.08)',
                    color: order.paymentStatus === 'Paid' ? 'var(--color-success)' : 'var(--color-error)'
                  }}>
                    {order.paymentStatus}
                  </span>
                  <span style={{
                    fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px',
                    background: ['Completed', 'Confirmed'].includes(order.orderStatus) ? 'rgba(46, 125, 50, 0.08)' : order.orderStatus === 'Rejected' || order.orderStatus === 'Delivery Failed' ? 'rgba(211, 47, 47, 0.08)' : 'rgba(255, 152, 0, 0.08)',
                    color: ['Completed', 'Confirmed'].includes(order.orderStatus) ? 'var(--color-success)' : order.orderStatus === 'Rejected' || order.orderStatus === 'Delivery Failed' ? 'var(--color-error)' : 'var(--color-secondary)'
                  }}>
                    {order.orderStatus}
                  </span>
                </div>
              </div>

              <div className="order-footer-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {order.items.length} {order.items.length === 1 ? 'item' : 'items'}: {order.items.map(i => `${i.name} (${i.quantity})`).join(', ')}
                </div>
                <Link to={`/order/${order._id}`} className="btn-secondary order-track-link" style={{ fontSize: '0.8rem', padding: '0.4rem 1rem', textDecoration: 'none' }}>
                  Track Order & Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrders;

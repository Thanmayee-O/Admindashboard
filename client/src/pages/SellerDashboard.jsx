import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

const API_PAYMENT_URL = 'http://localhost:3000/api/v1/payments';

const SellerDashboard = () => {
  const navigate = useNavigate();
  const [seller, setSeller] = useState(null);
  const [orders, setOrders] = useState([]);
  const [earningsData, setEarningsData] = useState({ sellerStats: null, ledgers: [], payoutLogs: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders'); // orders, earnings
  const [processingId, setProcessingId] = useState(null);

  // Authenticate seller locally on mount
  useEffect(() => {
    const localSeller = localStorage.getItem('seller');
    if (!localSeller) {
      toast.error('Merchant session required.');
      navigate('/seller/login');
      return;
    }
    setSeller(JSON.parse(localSeller));
  }, [navigate]);

  const fetchDashboardData = () => {
    if (!seller) return;
    
    const token = localStorage.getItem('sellerToken');
    if (!token) {
      localStorage.removeItem('seller');
      localStorage.removeItem('sellerToken');
      navigate('/seller/login');
      return;
    }

    const authHeaders = { 'Authorization': `Bearer ${token}` };

    // Fetch orders & stats
    const fetchOrders = fetch(`${API_PAYMENT_URL}/seller/orders`, { headers: authHeaders, credentials: 'include' })
      .then((res) => {
        if (res.status === 401) throw new Error('UNAUTHORIZED');
        if (!res.ok) throw new Error('Orders fetch failed');
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          setOrders(data.orders);
        }
      });

    // Fetch balances and earnings
    const fetchEarnings = fetch(`${API_PAYMENT_URL}/sellers/${seller._id}/dashboard`, { headers: authHeaders, credentials: 'include' })
      .then((res) => {
        if (res.status === 401) throw new Error('UNAUTHORIZED');
        if (!res.ok) throw new Error('Earnings fetch failed');
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          setEarningsData({
            sellerStats: data.seller,
            ledgers: data.ledgers,
            payoutLogs: data.payoutLogs
          });
        }
      });

    Promise.all([fetchOrders, fetchEarnings])
      .catch((err) => {
        console.error('Fetch error:', err);
        if (err.message === 'UNAUTHORIZED') {
          toast.error('Session expired. Logging out.');
          localStorage.removeItem('seller');
          localStorage.removeItem('sellerToken');
          navigate('/seller/login');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (seller) {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 5000); // Poll dashboard data every 5 seconds
      return () => clearInterval(interval);
    }
  }, [seller]);

  const handleLogout = () => {
    localStorage.removeItem('seller');
    localStorage.removeItem('sellerToken');
    toast.success('Signed out.');
    navigate('/seller/login');
  };

  const handleAcceptOrder = async (orderId) => {
    setProcessingId(orderId);
    toast.loading('Accepting order & booking logistics...', { id: 'decision' });

    try {
      const token = localStorage.getItem('sellerToken');
      const res = await fetch(`${API_PAYMENT_URL}/seller/orders/${orderId}/accept`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Order accepted! Shipping booked.', { id: 'decision' });
        fetchDashboardData();
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      toast.error(err.message || 'Action failed.', { id: 'decision' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectOrder = async (orderId) => {
    setProcessingId(orderId);
    toast.loading('Rejecting order & initiating customer refund...', { id: 'decision' });

    try {
      const token = localStorage.getItem('sellerToken');
      const res = await fetch(`${API_PAYMENT_URL}/seller/orders/${orderId}/reject`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Order rejected. Refund initiated.', { id: 'decision' });
        fetchDashboardData();
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      toast.error(err.message || 'Action failed.', { id: 'decision' });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading || !seller) {
    return (
      <div style={{ textAlign: 'center', marginTop: '6rem' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem auto', width: '40px', height: '40px' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading Merchant Portal...</p>
      </div>
    );
  }

  // Calculate order stats
  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter(o => o.orderStatus === 'Pending Seller Confirmation').length;
  const confirmedOrdersCount = orders.filter(o => ['Confirmed', 'Preparing Shipment', 'Shipment Created', 'Shipped', 'Out for Delivery', 'Completed'].includes(o.orderStatus)).length;
  const rejectedOrdersCount = orders.filter(o => o.orderStatus === 'Rejected').length;
  const revenueSummary = orders.filter(o => o.paymentStatus === 'Paid').reduce((acc, o) => acc + o.totalAmount, 0);

  const stats = earningsData.sellerStats || seller;

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <Toaster position="top-right" />
      
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 700, margin: 0 }}>🏪 Merchant Portal</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>Welcome back, <strong>{seller.name}</strong></p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn-secondary" style={{ padding: '0.65rem 1.25rem', color: 'var(--color-primary)' }} onClick={() => { fetchDashboardData(); toast.success('Data refreshed!'); }}>
            🔄 Refresh Data
          </button>
          <button className="btn-secondary" style={{ padding: '0.65rem 1.25rem', color: 'var(--color-error)' }} onClick={handleLogout}>
            Sign Out Portal
          </button>
        </div>
      </div>

      {/* Grid of stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
        {/* Revenue */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Gross Revenue</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-secondary)', fontFamily: 'var(--font-mono)' }}>
            ₹{(revenueSummary / 100).toFixed(2)}
          </div>
        </div>

        {/* Escrow balance */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Escrow Pending</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
            ₹{(stats.pendingBalance / 100).toFixed(2)}
          </div>
        </div>

        {/* Available Balance */}
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Available Balance</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>
            ₹{(stats.availableBalance / 100).toFixed(2)}
          </div>
        </div>

        {/* Orders summary */}
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Orders Stats</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span>Pending Decision: <strong style={{ color: '#fbbf24' }}>{pendingOrdersCount}</strong></span>
            <span>Confirmed: <strong style={{ color: 'var(--color-success)' }}>{confirmedOrdersCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Tabs selectors */}
      <div className="dashboard-tab-bar" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('orders')}
          className={`btn-secondary ${activeTab === 'orders' ? 'active-tab' : ''}`}
          style={{
            background: activeTab === 'orders' ? 'rgba(46, 125, 50, 0.1)' : 'transparent',
            borderColor: activeTab === 'orders' ? 'var(--color-primary)' : 'var(--border-color)',
            color: activeTab === 'orders' ? 'var(--color-primary)' : 'var(--text-muted)'
          }}
        >
          📋 Received Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('earnings')}
          className={`btn-secondary ${activeTab === 'earnings' ? 'active-tab' : ''}`}
          style={{
            background: activeTab === 'earnings' ? 'rgba(46, 125, 50, 0.1)' : 'transparent',
            borderColor: activeTab === 'earnings' ? 'var(--color-primary)' : 'var(--border-color)',
            color: activeTab === 'earnings' ? 'var(--color-primary)' : 'var(--text-muted)'
          }}
        >
          💰 Ledger Splits & Payouts
        </button>
      </div>

      {/* TAB 1: Received Orders */}
      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {orders.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <span style={{ fontSize: '2.5rem' }}>📭</span>
              <h3 style={{ margin: '1rem 0 0.5rem 0' }}>No Orders Yet</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto' }}>
                Orders for <strong>{seller.name}</strong> will appear here once customers complete checkout.
                If you placed a test order, make sure you are logged in as the seller assigned to the products you purchased.
              </p>
            </div>
          ) : (
            orders.map((o) => (
              <div key={o._id} className="glass-card" style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Upper Metadata header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Order ID</span>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>#{o._id}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date</span>
                    <div style={{ fontSize: '0.85rem' }}>{new Date(o.createdAt).toLocaleString()}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Amount</span>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-secondary)', fontFamily: 'var(--font-mono)' }}>
                      ₹{(o.totalAmount / 100).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px',
                      background: o.orderStatus === 'Confirmed' || o.orderStatus === 'Completed' ? 'rgba(46, 125, 50, 0.08)' : o.orderStatus === 'Rejected' ? 'rgba(211, 47, 47, 0.08)' : 'rgba(255, 152, 0, 0.08)',
                      color: o.orderStatus === 'Confirmed' || o.orderStatus === 'Completed' ? 'var(--color-success)' : o.orderStatus === 'Rejected' ? 'var(--color-error)' : 'var(--color-secondary)'
                    }}>{o.orderStatus}</span>
                    <Link to={`/seller/order/${o._id}`} className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', textDecoration: 'none' }}>
                      Details →
                    </Link>
                  </div>
                </div>

                {/* Main section: flex-wrap for responsive */}
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  {/* Products */}
                  <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                    <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem' }}>Items</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {o.items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span>{item.name} x {item.quantity}</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>₹{((item.price * item.quantity)/100).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Customer details & address */}
                  <div style={{ flex: '1 1 200px', minWidth: 0, background: '#F9FAFB', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                    <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '0.85rem' }}>🚚 Shipping Address Details</h5>
                    {o.shippingAddress ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div><strong>Name:</strong> {o.shippingAddress.fullName}</div>
                        <div><strong>Phone:</strong> {o.shippingAddress.phone}</div>
                        <div><strong>Address:</strong> {o.shippingAddress.address}, {o.shippingAddress.city}, {o.shippingAddress.state} - {o.shippingAddress.pincode}</div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No address data.</span>
                    )}
                  </div>
                </div>

                {/* Seller Confirmation Controls */}
                {o.orderStatus === 'Pending Seller Confirmation' && (
                  <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                    <button
                      className="btn-pay"
                      style={{ padding: '0.5rem 1.5rem', background: 'var(--color-success)', width: 'auto', fontSize: '0.85rem', boxShadow: 'none' }}
                      onClick={() => handleAcceptOrder(o._id)}
                      disabled={processingId !== null}
                    >
                      Accept Order
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ padding: '0.5rem 1.5rem', color: 'var(--color-error)', border: '1px solid var(--color-error)', background: 'transparent' }}
                      onClick={() => handleRejectOrder(o._id)}
                      disabled={processingId !== null}
                    >
                      Reject Order
                    </button>
                  </div>
                )}

              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: Earnings ledgers */}
      {activeTab === 'earnings' && (
        <div>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-heading)' }}>📜 Escrow Ledgers Registry</h4>
          <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '3rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Order Reference</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Gross Sales</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Platform Share</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Processing Fee</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Net Escrow</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {earningsData.ledgers.length === 0 ? (
                   <tr><td colSpan="6" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>No ledger records.</td></tr>
                ) : (
                  earningsData.ledgers.map(l => (
                    <tr key={l._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)' }}>{l.orderId?._id || l.orderId}</td>
                      <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)' }}>₹{(l.grossSales/100).toFixed(2)}</td>
                      <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)' }}>₹{(l.platformCommission/100).toFixed(2)}</td>
                      <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)' }}>₹{(l.paymentGatewayFees/100).toFixed(2)}</td>
                      <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-success)' }}>₹{(l.netPayout/100).toFixed(2)}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <span style={{
                          fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '3px',
                          background: l.status === 'Released' ? 'rgba(46, 125, 50, 0.08)' : l.status === 'Failed' ? 'rgba(211, 47, 47, 0.08)' : 'rgba(255, 152, 0, 0.08)',
                          color: l.status === 'Released' ? 'var(--color-success)' : l.status === 'Failed' ? 'var(--color-error)' : 'var(--color-secondary)'
                        }}>{l.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-heading)' }}>💸 Released Bank Payout Transfers</h4>
          <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Transfer ID</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Released Amount</th>
                  <th style={{ padding: '0.6rem 0.75rem' }}>Release Date</th>
                </tr>
              </thead>
              <tbody>
                {earningsData.payoutLogs.length === 0 ? (
                  <tr><td colSpan="3" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>No payouts transferred yet. Cron worker releases escrows after 3 minutes!</td></tr>
                ) : (
                  earningsData.payoutLogs.map(p => (
                    <tr key={p._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)' }}>{p._id}</td>
                      <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-secondary)' }}>₹{(p.amount/100).toFixed(2)}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>{new Date(p.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default SellerDashboard;

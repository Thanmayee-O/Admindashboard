import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

const API_LOGISTICS_URL = 'https://admindashboard-13rm.onrender.com/api/v1/logistics';

const ShippingDashboard = () => {
  const navigate = useNavigate();
  const [partner, setPartner] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [confirmedOrders, setConfirmedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders'); // orders | shipments

  // Authenticate session locally
  useEffect(() => {
    const localPartner = localStorage.getItem('shippingPartner');
    if (!localPartner) {
      toast.error('Logistics session required.');
      navigate('/shipping/login');
      return;
    }
    setPartner(JSON.parse(localPartner));
  }, [navigate]);

  const fetchData = () => {
    if (!partner) return;

    const token = localStorage.getItem('shippingToken');
    if (!token) {
      localStorage.removeItem('shippingPartner');
      localStorage.removeItem('shippingToken');
      navigate('/shipping/login');
      return;
    }

    const authHeaders = { 'Authorization': `Bearer ${token}` };

    // Fetch active shipments
    const fetchShipments = fetch(`${API_LOGISTICS_URL}/shipping/orders`, { headers: authHeaders, credentials: 'include' })
      .then((res) => {
        if (res.status === 401) throw new Error('UNAUTHORIZED');
        if (!res.ok) throw new Error('Shipments fetch failed');
        return res.json();
      })
      .then((data) => {
        if (data.success) setShipments(data.shipments);
      });

    // Fetch all confirmed/accepted orders for full pipeline visibility
    const fetchOrders = fetch(`${API_LOGISTICS_URL}/shipping/all-orders`, { headers: authHeaders, credentials: 'include' })
      .then((res) => {
        if (res.status === 401) throw new Error('UNAUTHORIZED');
        if (!res.ok) throw new Error('Orders fetch failed');
        return res.json();
      })
      .then((data) => {
        if (data.success) setConfirmedOrders(data.orders);
      });

    Promise.all([fetchShipments, fetchOrders])
      .catch((err) => {
        console.error('Fetch error:', err);
        if (err.message === 'UNAUTHORIZED') {
          toast.error('Session expired. Logging out.');
          localStorage.removeItem('shippingPartner');
          localStorage.removeItem('shippingToken');
          navigate('/shipping/login');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (partner) {
      fetchData();
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [partner]);

  const handleLogout = () => {
    localStorage.removeItem('shippingPartner');
    localStorage.removeItem('shippingToken');
    toast.success('Signed out.');
    navigate('/shipping/login');
  };

  if (loading || !partner) {
    return (
      <div style={{ textAlign: 'center', marginTop: '6rem' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem auto', width: '40px', height: '40px' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading Logistics Portal...</p>
      </div>
    );
  }

  // Stats
  const deliveredCount = shipments.filter(s => s.shipmentStatus === 'DELIVERED').length;
  const inTransitCount = shipments.filter(s => ['IN_TRANSIT', 'PICKED_UP'].includes(s.shipmentStatus)).length;
  const outForDeliveryCount = shipments.filter(s => s.shipmentStatus === 'OUT_FOR_DELIVERY').length;
  const failedCount = shipments.filter(s => s.shipmentStatus === 'FAILED').length;

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <Toaster position="top-right" />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 700, margin: 0 }}>🚚 Logistics Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>Welcome, <strong>{partner.name}</strong></p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn-secondary" style={{ padding: '0.65rem 1.25rem', color: 'var(--color-primary)' }} onClick={() => { fetchData(); toast.success('Shipments updated!'); }}>
            🔄 Refresh Data
          </button>
          <button className="btn-secondary" style={{ padding: '0.65rem 1.25rem', color: 'var(--color-error)' }} onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Total Orders</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'var(--font-mono)' }}>{confirmedOrders.length}</div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Active Shipments</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-secondary)', fontFamily: 'var(--font-mono)' }}>{shipments.length}</div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>In Transit</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d97706', fontFamily: 'var(--font-mono)' }}>{inTransitCount}</div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Out for Delivery</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-secondary)', fontFamily: 'var(--font-mono)' }}>{outForDeliveryCount}</div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Delivered</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>{deliveredCount}</div>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Failed</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-error)', fontFamily: 'var(--font-mono)' }}>{failedCount}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="dashboard-tab-bar" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '2px solid var(--border-color)', marginBottom: '2rem', overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '0.75rem 1.5rem', border: 'none', background: 'transparent', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.95rem',
            borderBottom: activeTab === 'orders' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'orders' ? 'var(--color-primary)' : 'var(--text-muted)',
            marginBottom: '-2px'
          }}
        >
          📦 All Orders ({confirmedOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('shipments')}
          style={{
            padding: '0.75rem 1.5rem', border: 'none', background: 'transparent', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.95rem',
            borderBottom: activeTab === 'shipments' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'shipments' ? 'var(--color-primary)' : 'var(--text-muted)',
            marginBottom: '-2px'
          }}
        >
          🚚 Active Shipments ({shipments.length})
        </button>
      </div>

      {/* TAB: All Orders (confirmed by seller, visible to shipping) */}
      {activeTab === 'orders' && (
        <div>
          {confirmedOrders.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <span style={{ fontSize: '2.5rem' }}>📭</span>
              <h3 style={{ margin: '1rem 0 0.5rem 0' }}>No Confirmed Orders Yet</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                Orders will appear here once sellers confirm them. New customer orders start as "Pending Seller Confirmation".
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {confirmedOrders.map((order) => (
                <div key={order._id} className="glass-card" style={{ padding: '1.5rem 2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Order ID</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>#{order._id}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{new Date(order.createdAt).toLocaleString()}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontWeight: 600,
                        background: order.orderStatus === 'Confirmed' ? 'rgba(46,125,50,0.08)' : order.orderStatus === 'Completed' ? 'rgba(46,125,50,0.12)' : 'rgba(255,152,0,0.08)',
                        color: ['Confirmed', 'Completed'].includes(order.orderStatus) ? 'var(--color-success)' : 'var(--color-secondary)',
                        border: '1px solid var(--border-color)'
                      }}>
                        Order: {order.orderStatus}
                      </span>
                      <span style={{
                        fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontWeight: 600,
                        background: '#F9FAFB', color: 'var(--text-muted)', border: '1px solid var(--border-color)'
                      }}>
                        Shipping: {order.shippingStatus}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
                    <div style={{ background: '#F9FAFB', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: '0.35rem' }}>🏪 Seller</div>
                      <div style={{ color: 'var(--text-muted)' }}>{order.sellerId?.name || 'Unknown'}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{order.sellerId?.email}</div>
                    </div>
                    <div style={{ background: '#F9FAFB', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: '0.35rem' }}>📍 Deliver To</div>
                      <div style={{ color: 'var(--text-muted)' }}>{order.shippingAddress?.fullName} (📞 {order.shippingAddress?.phone})</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {order.shippingAddress?.address}, {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode}
                      </div>
                    </div>
                    <div style={{ background: '#F9FAFB', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: '0.35rem' }}>📦 Items</div>
                      {order.items?.map((item, idx) => (
                        <div key={idx} style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {item.name} × {item.quantity}
                        </div>
                      ))}
                      <div style={{ color: 'var(--color-primary)', fontWeight: 700, marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
                        ₹{(order.totalAmount / 100).toFixed(2)}
                      </div>
                    </div>
                    {order.trackingNumber && (
                      <div style={{ background: '#F9FAFB', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: '0.35rem' }}>🔖 Tracking</div>
                          <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{order.trackingNumber}</div>
                          <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>AWB: {order.awbNumber}</div>
                        </div>
                        {order.shipmentId && (
                          <Link to={`/shipping/order/${order.shipmentId}`} className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', textDecoration: 'none', textAlign: 'center', marginTop: '0.5rem' }}>
                            Update Status →
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Active Shipments */}
      {activeTab === 'shipments' && (
        <div>
          {shipments.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <span style={{ fontSize: '2.5rem' }}>📭</span>
              <h3 style={{ margin: '1rem 0 0.5rem 0' }}>No Active Shipments</h3>
              <p style={{ color: 'var(--text-muted)' }}>
                Shipments are created when sellers confirm orders. Check the "All Orders" tab to see the full pipeline.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {shipments.map((s) => (
                <div key={s._id} className="glass-card" style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Meta details */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>AWB Number</span>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{s.awbNumber}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tracking Number</span>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{s.trackingNumber}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assigned Date</span>
                      <div style={{ fontSize: '0.85rem' }}>{new Date(s.createdAt).toLocaleString()}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px',
                        background: s.shipmentStatus === 'DELIVERED' ? 'rgba(46, 125, 50, 0.08)' : s.shipmentStatus === 'FAILED' ? 'rgba(211, 47, 47, 0.08)' : 'rgba(255, 152, 0, 0.08)',
                        color: s.shipmentStatus === 'DELIVERED' ? 'var(--color-success)' : s.shipmentStatus === 'FAILED' ? 'var(--color-error)' : 'var(--color-secondary)'
                      }}>{s.shipmentStatus}</span>
                      
                      <Link to={`/shipping/order/${s._id}`} className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', textDecoration: 'none' }}>
                        Update Status →
                      </Link>
                    </div>
                  </div>

                  {/* Sub details: flex-wrap responsive */}
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                    {/* Sender details */}
                    <div style={{ flex: '1 1 200px', minWidth: 0, background: '#F9FAFB', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                      <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '0.85rem' }}>🏪 Sender (Seller) Info</h5>
                      {s.orderId?.sellerId ? (
                        <div style={{ color: 'var(--text-muted)' }}>
                          <div><strong>Store:</strong> {s.orderId.sellerId.name}</div>
                          <div><strong>Email:</strong> {s.orderId.sellerId.email}</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Seller information not available</span>
                      )}
                    </div>

                    {/* Recipient Address */}
                    <div style={{ flex: '1 1 200px', minWidth: 0, background: '#F9FAFB', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                      <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '0.85rem' }}>📍 Destination (Customer) Address</h5>
                      {s.orderId?.shippingAddress ? (
                        <div style={{ color: 'var(--text-muted)' }}>
                          <div><strong>Recipient:</strong> {s.orderId.shippingAddress.fullName} (📞 {s.orderId.shippingAddress.phone})</div>
                          <div><strong>Address:</strong> {s.orderId.shippingAddress.address}, {s.orderId.shippingAddress.city}, {s.orderId.shippingAddress.state} - {s.orderId.shippingAddress.pincode}</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>No destination address provided.</span>
                      )}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ShippingDashboard;

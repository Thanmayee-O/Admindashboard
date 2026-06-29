import React, { useState, useEffect } from 'react';

const API_PAYMENT_URL = 'http://localhost:3000/api/v1/payments';

const MOCK_ORDERS = [
  {
    _id: 'mock_order_1001',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
    totalAmount: 2998, // $29.98
    paymentStatus: 'Paid',
    orderStatus: 'Completed',
    shippingStatus: 'Delivered',
    trackingNumber: 'TRK_FEDEX_9988776655',
    shippingLabelUrl: '#',
    items: [
      { productId: '000000000000000000000001', name: 'Essence Mascara Lash Princess', quantity: 2, price: 999 }
    ]
  },
  {
    _id: 'mock_order_1002',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    totalAmount: 1999, // $19.99
    paymentStatus: 'Paid',
    orderStatus: 'Shipped',
    shippingStatus: 'Shipped',
    trackingNumber: 'TRK_FEDEX_1122334455',
    shippingLabelUrl: '#',
    items: [
      { productId: '000000000000000000000002', name: 'Eyeshadow Palette with Mirror', quantity: 1, price: 1999 }
    ]
  }
];

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_PAYMENT_URL}/orders`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.orders.length > 0) {
          setOrders(data.orders);
        } else {
          // Fallback to mock data if DB empty
          setOrders(MOCK_ORDERS);
        }
      })
      .catch(() => {
        // Fallback to mock data on network error
        setOrders(MOCK_ORDERS);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '2.5rem' }}>Order History</h1>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {[1, 2].map((i) => (
            <div key={i} className="skeleton-pulse" style={{ width: '100%', height: '150px', borderRadius: '12px', background: '#F9FAFB' }}></div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {orders.map((order) => (
            <div key={order._id} className="glass-card" style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Order Metadata Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Order ID</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-heading)' }}>#{order._id}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Date Placed</div>
                  <div style={{ fontSize: '0.95rem' }}>{new Date(order.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Charge</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-secondary)', fontFamily: 'var(--font-mono)' }}>
                    ₹{(order.totalAmount / 100).toFixed(2)}
                  </div>
                </div>
                
                {/* Badges */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 600,
                    background: order.paymentStatus === 'Paid' ? 'rgba(46, 125, 50, 0.08)' : 'rgba(255, 152, 0, 0.08)',
                    color: order.paymentStatus === 'Paid' ? 'var(--color-success)' : 'var(--color-secondary)',
                    border: `1px solid ${order.paymentStatus === 'Paid' ? 'rgba(46, 125, 50, 0.2)' : 'rgba(255, 152, 0, 0.2)'}`
                  }}>
                    💳 {order.paymentStatus}
                  </span>
                  
                  <span style={{
                    fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 600,
                    background: order.orderStatus === 'Completed' ? 'rgba(46, 125, 50, 0.08)' : order.orderStatus === 'Cancelled' ? 'rgba(211, 47, 47, 0.08)' : 'rgba(46, 125, 50, 0.08)',
                    color: order.orderStatus === 'Completed' ? 'var(--color-success)' : order.orderStatus === 'Cancelled' ? 'var(--color-error)' : 'var(--color-primary)',
                    border: `1px solid ${order.orderStatus === 'Completed' ? 'rgba(46, 125, 50, 0.2)' : order.orderStatus === 'Cancelled' ? 'rgba(211, 47, 47, 0.2)' : 'rgba(46, 125, 50, 0.2)'}`
                  }}>
                    📦 {order.orderStatus}
                  </span>
                </div>
              </div>

              {/* Items Summary and Carrier Tracker */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', alignItems: 'start', flexWrap: 'wrap' }}>
                {/* Items List */}
                <div>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Items</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {order.items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span>{item.name} <span style={{ color: 'var(--text-muted)' }}>x{item.quantity}</span></span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>₹{((item.price * item.quantity) / 100).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping Address & Timeline details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Shipping Address info */}
                  <div style={{ background: '#F9FAFB', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', fontSize: '0.85rem' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-heading)' }}>📍 Shipping Address</h4>
                    {order.shippingAddress ? (
                      <div style={{ color: 'var(--text-muted)' }}>
                        <div>{order.shippingAddress.fullName} (📞 {order.shippingAddress.phone})</div>
                        <div>{order.shippingAddress.address}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Default Address</span>
                    )}
                  </div>

                  {/* Timeline Tracker */}
                  <div style={{ background: '#F9FAFB', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: 'var(--text-heading)' }}>
                      🚚 Shipment Tracking: <span style={{ color: 'var(--color-secondary)' }}>{order.shippingStatus || 'Pending'}</span>
                    </h4>
                    {order.trackingNumber && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                        Tracking #: {order.trackingNumber}
                      </div>
                    )}
                    
                    {/* Timeline visualization */}
                    {order.shippingStatus === 'Rejected' ? (
                      <div style={{ color: 'var(--color-error)', fontSize: '0.85rem', fontWeight: 600 }}>
                        ❌ Order Rejected by Merchant. Refund Status: {order.refundStatus || 'Pending'}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.35rem', flexDirection: 'column', fontSize: '0.8rem' }}>
                        {[
                          { label: 'Pending Confirmation', match: ['Pending', 'Waiting for Seller Confirmation'] },
                          { label: 'Confirmed by Seller', match: ['Confirmed', 'Preparing Shipment'] },
                          { label: 'Shipment Created', match: ['Shipment Created'] },
                          { label: 'Shipped (In Transit)', match: ['Shipped'] },
                          { label: 'Out for Delivery', match: ['Out for Delivery'] },
                          { label: 'Delivered', match: ['Delivered'] }
                        ].map((step, stepIdx, stepArr) => {
                          const currentIdx = stepArr.findIndex(s => s.match.includes(order.shippingStatus));
                          const isActive = stepIdx <= currentIdx;
                          return (
                            <div key={stepIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{
                                width: '10px', height: '10px', borderRadius: '50%',
                                background: isActive ? 'var(--color-secondary)' : '#E5E7EB'
                              }}></div>
                              <span style={{ color: isActive ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;

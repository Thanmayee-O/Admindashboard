import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

const API_PAYMENT_URL = 'http://localhost:3000/api/v1/payments';

const CustomerOrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOrderDetail = () => {
    fetch(`${API_PAYMENT_URL}/orders/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Order not found');
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          setOrder(data.order);
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error('Failed to fetch order details.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrderDetail();
    const interval = setInterval(fetchOrderDetail, 5000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '6rem' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem auto', width: '40px', height: '40px' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', marginTop: '4rem' }}>
        <span style={{ fontSize: '3rem' }}>🔍</span>
        <h3 style={{ margin: '1rem 0 0.5rem 0' }}>Order not found</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>We couldn't retrieve details for this order.</p>
        <Link to="/my-orders" className="btn-secondary" style={{ textDecoration: 'none' }}>
          Back to My Orders
        </Link>
      </div>
    );
  }

  const steps = [
    { label: 'Payment Paid', match: ['Paid', 'Pending Seller Confirmation'] },
    { label: 'Order Confirmed', match: ['Confirmed', 'Preparing Shipment'] },
    { label: 'Picked Up', match: ['Picked Up'] },
    { label: 'In Transit', match: ['In Transit'] },
    { label: 'Out for Delivery', match: ['Out for Delivery', 'Out For Delivery'] },
    { label: 'Delivered', match: ['Delivered', 'Completed'] }
  ];

  const getActiveStepIndex = () => {
    if (order.shippingStatus === 'Rejected' || order.shippingStatus === 'Not Shipped' || order.orderStatus === 'Rejected') return -1;
    if (order.shippingStatus === 'Delivery Failed' || order.orderStatus === 'Delivery Failed') return -2;
    let activeIdx = 0;
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].match.includes(order.shippingStatus) || steps[i].match.includes(order.orderStatus)) {
        activeIdx = i;
      }
    }
    return activeIdx;
  };

  const activeIdx = getActiveStepIndex();

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <Toaster position="top-right" />

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <Link to="/my-orders" style={{ color: 'var(--color-secondary)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
            ← Back to Orders
          </Link>
          <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 700, margin: 0 }}>Order Detail</h1>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', margin: '0.25rem 0 0 0', wordBreak: 'break-all' }}>#{order._id}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignSelf: 'flex-start' }}>
          <span className="badge-sandbox" style={{ height: 'fit-content' }}>
            {order.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'}
          </span>
          <span style={{
            fontSize: '0.75rem', padding: '0.25rem 0.65rem', borderRadius: '9999px', fontWeight: 600,
            background: order.orderStatus === 'Completed' || order.orderStatus === 'Confirmed' ? 'rgba(46, 125, 50, 0.08)' : order.orderStatus === 'Rejected' || order.orderStatus === 'Delivery Failed' ? 'rgba(211, 47, 47, 0.08)' : 'rgba(255, 152, 0, 0.08)',
            color: order.orderStatus === 'Completed' || order.orderStatus === 'Confirmed' ? 'var(--color-success)' : order.orderStatus === 'Rejected' || order.orderStatus === 'Delivery Failed' ? 'var(--color-error)' : 'var(--color-secondary)',
            border: '1px solid var(--border-color)', whiteSpace: 'nowrap'
          }}>
            {order.orderStatus}
          </span>
        </div>
      </div>

      {/* Responsive flex-wrap layout */}
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Left Column */}
        <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>

          {/* Delivery Timeline */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.15rem' }}>🚚 Delivery Timeline</h3>

            {activeIdx === -1 ? (
              <div style={{ padding: '1.25rem', background: 'rgba(211, 47, 47, 0.08)', borderRadius: '10px', border: '1px solid rgba(211, 47, 47, 0.2)', textAlign: 'center', color: 'var(--color-error)' }}>
                <strong style={{ fontSize: '1rem' }}>Order Rejected by Merchant</strong>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>The seller could not confirm this order. Your payment will be refunded. Refund Status: <strong>{order.refundStatus || 'Pending'}</strong></p>
              </div>
            ) : activeIdx === -2 ? (
              <div style={{ padding: '1.25rem', background: 'rgba(211, 47, 47, 0.08)', borderRadius: '10px', border: '1px solid rgba(211, 47, 47, 0.2)', textAlign: 'center', color: 'var(--color-error)' }}>
                <strong style={{ fontSize: '1rem' }}>Delivery Failed</strong>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>Our shipping partner attempted delivery but it failed. Please contact customer service.</p>
              </div>
            ) : (
              /* Scrollable horizontal timeline */
              <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', minWidth: '480px', margin: '1.5rem 0', padding: '0 1rem' }}>
                  {/* Background bar */}
                  <div style={{ position: 'absolute', top: '15px', left: '10%', right: '10%', height: '4px', background: '#E5E7EB', zIndex: 1 }}></div>
                  {/* Progress bar */}
                  <div style={{
                    position: 'absolute', top: '15px', left: '10%', height: '4px',
                    background: 'var(--color-primary)',
                    width: `${(activeIdx / (steps.length - 1)) * 80}%`,
                    zIndex: 2, transition: 'width 0.5s ease'
                  }}></div>
                  {steps.map((step, idx) => {
                    const completed = idx <= activeIdx;
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', position: 'relative', zIndex: 3, minWidth: '70px' }}>
                        <div style={{
                          width: '30px', height: '30px', borderRadius: '50%',
                          background: completed ? 'var(--color-primary)' : 'var(--bg-main)',
                          border: `2px solid ${completed ? 'var(--color-primary)' : 'var(--border-color)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 'bold', fontSize: '0.8rem', color: completed ? '#fff' : 'var(--text-muted)'
                        }}>
                          {completed ? '✓' : idx + 1}
                        </div>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: completed ? 600 : 400,
                          color: completed ? 'var(--text-heading)' : 'var(--text-muted)',
                          textAlign: 'center', whiteSpace: 'nowrap'
                        }}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tracking info below timeline */}
            {order.trackingNumber && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.88rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Tracking Number: </span><strong style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{order.trackingNumber}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Air Waybill (AWB): </span><strong style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{order.awbNumber || 'Generating...'}</strong></div>
              </div>
            )}
          </div>

          {/* Ordered Products */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>📦 Ordered Products</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {order.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.9rem', gap: '1rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontWeight: 500, color: 'var(--text-heading)', display: 'block' }}>{item.name}</span>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Quantity: {item.quantity} | Unit: ₹{(item.price / 100).toFixed(2)}</div>
                  </div>
                  <strong style={{ fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>₹{((item.price * item.quantity) / 100).toFixed(2)}</strong>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Subtotal:</span><span>₹{((order.totalAmount - 850) / 100).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Shipping Fee:</span><span>₹8.50</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-heading)', borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem', marginTop: '0.1rem' }}>
                  <span>Total Amount Paid:</span>
                  <span style={{ color: 'var(--color-secondary)', fontFamily: 'var(--font-mono)' }}>₹{(order.totalAmount / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>

          {/* Delivery Address */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>📍 Delivery Address</h4>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div><strong style={{ color: 'var(--text-heading)' }}>Name:</strong> {order.shippingAddress.fullName}</div>
              <div><strong style={{ color: 'var(--text-heading)' }}>Phone:</strong> {order.shippingAddress.phone}</div>
              <div><strong style={{ color: 'var(--text-heading)' }}>Email:</strong> {order.shippingAddress.email}</div>
              <div><strong style={{ color: 'var(--text-heading)' }}>Address:</strong> {order.shippingAddress.address}</div>
              <div><strong style={{ color: 'var(--text-heading)' }}>City/State:</strong> {order.shippingAddress.city}, {order.shippingAddress.state}</div>
              <div><strong style={{ color: 'var(--text-heading)' }}>Country/Pincode:</strong> {order.shippingAddress.country} - {order.shippingAddress.pincode}</div>
            </div>
          </div>

          {/* Seller Info */}
          {order.sellerId && (
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>🏪 Seller Information</h4>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div><strong style={{ color: 'var(--text-heading)' }}>Store Name:</strong> {order.sellerId.name}</div>
                <div><strong style={{ color: 'var(--text-heading)' }}>Support Email:</strong> {order.sellerId.email}</div>
                <div><strong style={{ color: 'var(--text-heading)' }}>Status:</strong> {order.sellerId.accountStatus}</div>
              </div>
            </div>
          )}

          {/* Razorpay Transaction */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>💳 Razorpay Transaction</h4>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div><strong style={{ color: 'var(--text-heading)' }}>Order ID:</strong></div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', wordBreak: 'break-all' }}>{order.razorpayOrderId}</div>
              <div><strong style={{ color: 'var(--text-heading)' }}>Payment ID:</strong></div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', wordBreak: 'break-all' }}>{order.razorpayPaymentId || 'N/A'}</div>
              <div><strong style={{ color: 'var(--text-heading)' }}>Verification:</strong></div>
              <div style={{ color: 'var(--color-success)' }}>✓ Signature Authenticated</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerOrderDetail;

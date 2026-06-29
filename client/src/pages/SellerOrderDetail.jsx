import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

const API_PAYMENT_URL = 'http://localhost:3000/api/v1/payments';

const SellerOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [seller, setSeller] = useState(null);

  useEffect(() => {
    const localSeller = localStorage.getItem('seller');
    if (!localSeller) {
      toast.error('Merchant session required.');
      navigate('/seller/login');
      return;
    }
    setSeller(JSON.parse(localSeller));
  }, [navigate]);

  const fetchOrderDetail = () => {
    if (!seller) return;
    fetch(`${API_PAYMENT_URL}/orders/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Order not found');
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          if (data.order.sellerId._id !== seller._id && data.order.sellerId !== seller._id) {
            toast.error('Unauthorized access to this order.');
            navigate('/seller/dashboard');
            return;
          }
          setOrder(data.order);
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error('Failed to retrieve order details.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (seller) {
      fetchOrderDetail();
      const interval = setInterval(fetchOrderDetail, 5000);
      return () => clearInterval(interval);
    }
  }, [id, seller]);

  const handleAcceptOrder = async () => {
    setProcessing(true);
    toast.loading('Accepting order & booking logistics...', { id: 'seller-decision' });
    try {
      const token = localStorage.getItem('sellerToken');
      const res = await fetch(`${API_PAYMENT_URL}/seller/orders/${id}/accept`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Order accepted! Shipping booked and tracking generated.', { id: 'seller-decision' });
        fetchOrderDetail();
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      toast.error(err.message || 'Action failed.', { id: 'seller-decision' });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectOrder = async () => {
    setProcessing(true);
    toast.loading('Rejecting order & initiating customer refund...', { id: 'seller-decision' });
    try {
      const token = localStorage.getItem('sellerToken');
      const res = await fetch(`${API_PAYMENT_URL}/seller/orders/${id}/reject`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Order rejected. Refund initiated.', { id: 'seller-decision' });
        fetchOrderDetail();
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      toast.error(err.message || 'Action failed.', { id: 'seller-decision' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading || !seller) {
    return (
      <div style={{ textAlign: 'center', marginTop: '6rem' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem auto', width: '40px', height: '40px' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading Merchant Order Details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', marginTop: '4rem' }}>
        <span style={{ fontSize: '3rem' }}>🔍</span>
        <h3 style={{ margin: '1rem 0 0.5rem 0' }}>Order not found</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>We couldn't retrieve this merchant order.</p>
        <Link to="/seller/dashboard" className="btn-secondary" style={{ textDecoration: 'none' }}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <Toaster position="top-right" />

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <Link to="/seller/dashboard" style={{ color: 'var(--color-secondary)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
            ← Back to Dashboard
          </Link>
          <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 700, margin: 0 }}>🏪 Merchant Order Details</h1>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', margin: '0.25rem 0 0 0', wordBreak: 'break-all' }}>#{order._id}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignSelf: 'flex-start' }}>
          <span style={{
            fontSize: '0.75rem', padding: '0.25rem 0.65rem', borderRadius: '9999px', fontWeight: 600,
            background: order.orderStatus === 'Confirmed' || order.orderStatus === 'Completed' ? 'rgba(46, 125, 50, 0.08)' : order.orderStatus === 'Rejected' ? 'rgba(211, 47, 47, 0.08)' : 'rgba(255, 152, 0, 0.08)',
            color: order.orderStatus === 'Confirmed' || order.orderStatus === 'Completed' ? 'var(--color-success)' : order.orderStatus === 'Rejected' ? 'var(--color-error)' : 'var(--color-secondary)',
            border: '1px solid var(--border-color)', whiteSpace: 'nowrap'
          }}>
            {order.orderStatus}
          </span>
          <span style={{
            fontSize: '0.75rem', padding: '0.25rem 0.65rem', borderRadius: '9999px', fontWeight: 600,
            background: '#F9FAFB', color: 'var(--text-main)', border: '1px solid var(--border-color)', whiteSpace: 'nowrap'
          }}>
            {order.shippingStatus}
          </span>
        </div>
      </div>

      {/* Action Required Card (full width) */}
      {order.orderStatus === 'Pending Seller Confirmation' && (
        <div className="glass-card" style={{ padding: '1.5rem', border: '1px dashed var(--color-secondary)', background: 'rgba(255, 152, 0, 0.04)', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-secondary)', fontSize: '1.1rem' }}>⚠️ Action Required: Confirm Order</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Please confirm stock availability and shipping capabilities. Accepting will automatically book shipping and generate the AWB.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              className="btn-pay"
              style={{ width: 'auto', flex: '1 1 120px', background: 'var(--color-primary)', borderColor: 'var(--color-primary)', padding: '0.65rem 1.5rem', fontSize: '0.9rem', boxShadow: 'none' }}
              onClick={handleAcceptOrder}
              disabled={processing}
            >
              Accept Order
            </button>
            <button
              className="btn-secondary"
              style={{ flex: '1 1 120px', color: 'var(--color-error)', border: '1px solid var(--color-error)', background: '#FFFFFF', padding: '0.65rem 1.5rem', fontSize: '0.9rem', boxShadow: 'none' }}
              onClick={handleRejectOrder}
              disabled={processing}
            >
              Reject Order
            </button>
          </div>
        </div>
      )}

      {/* Responsive flex-wrap 2-column layout */}
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Left Column */}
        <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>

          {/* Ordered Items */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>📦 Ordered Items</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {order.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.9rem', gap: '1rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontWeight: 500, color: 'var(--text-heading)', display: 'block' }}>{item.name}</span>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Qty: {item.quantity} | Unit: ₹{(item.price / 100).toFixed(2)}</div>
                  </div>
                  <strong style={{ fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>₹{((item.price * item.quantity) / 100).toFixed(2)}</strong>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700 }}>
                <span>Subtotal (excl. shipping):</span>
                <span style={{ color: 'var(--color-secondary)', fontFamily: 'var(--font-mono)' }}>₹{((order.totalAmount - 850) / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Tracking & Waybill */}
          {order.trackingNumber && (
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>🚚 Shipping & Tracking</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', fontSize: '0.88rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Tracking Number:</span>
                  <strong style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{order.trackingNumber}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>AWB Number:</span>
                  <strong style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{order.awbNumber || 'Pending AWB...'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Carrier Partner:</span>
                  <strong>FedEx Ground Sandbox</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Shipping Status:</span>
                  <strong>{order.shippingStatus}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>

          {/* Customer Shipping Details */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>👤 Customer Shipping Details</h4>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div><strong style={{ color: 'var(--text-heading)' }}>Name:</strong> {order.shippingAddress.fullName}</div>
              <div><strong style={{ color: 'var(--text-heading)' }}>Phone:</strong> {order.shippingAddress.phone}</div>
              <div><strong style={{ color: 'var(--text-heading)' }}>Email:</strong> {order.shippingAddress.email}</div>
              <div><strong style={{ color: 'var(--text-heading)' }}>Address:</strong> {order.shippingAddress.address}</div>
              <div><strong style={{ color: 'var(--text-heading)' }}>City/State:</strong> {order.shippingAddress.city}, {order.shippingAddress.state}</div>
              <div><strong style={{ color: 'var(--text-heading)' }}>Country/Pincode:</strong> {order.shippingAddress.country} - {order.shippingAddress.pincode}</div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>💳 Payment Details</h4>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div><strong style={{ color: 'var(--text-heading)' }}>Total Gross Sales:</strong> ₹{(order.totalAmount / 100).toFixed(2)}</div>
              <div><strong style={{ color: 'var(--text-heading)' }}>Payment Method:</strong> Razorpay Gateway</div>
              <div><strong style={{ color: 'var(--text-heading)' }}>Razorpay Payment ID:</strong></div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', wordBreak: 'break-all' }}>{order.razorpayPaymentId || 'N/A'}</div>
              <div><strong style={{ color: 'var(--text-heading)' }}>Payment Status:</strong> {order.paymentStatus}</div>
              {order.refundStatus && order.refundStatus !== 'None' && (
                <div><strong style={{ color: 'var(--text-heading)' }}>Refund Status:</strong> <span style={{ color: 'var(--color-error)' }}>{order.refundStatus}</span></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerOrderDetail;

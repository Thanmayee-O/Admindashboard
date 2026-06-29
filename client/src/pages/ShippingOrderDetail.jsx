import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

const API_LOGISTICS_URL = 'https://admindashboard-13rm.onrender.com/api/v1/logistics';

const ShippingOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [partner, setPartner] = useState(null);

  // Load and verify local partner session
  useEffect(() => {
    const localPartner = localStorage.getItem('shippingPartner');
    if (!localPartner) {
      toast.error('Logistics session required.');
      navigate('/shipping/login');
      return;
    }
    setPartner(JSON.parse(localPartner));
  }, [navigate]);

  const fetchShipmentDetail = () => {
    if (!partner) return;
    
    const token = localStorage.getItem('shippingToken');
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    fetch(`${API_LOGISTICS_URL}/shipping/orders/${id}`, { headers: authHeaders, credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Shipment not found');
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          setShipment(data.shipment);
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error('Failed to retrieve shipment details.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (partner) {
      fetchShipmentDetail();
      const interval = setInterval(fetchShipmentDetail, 5000);
      return () => clearInterval(interval);
    }
  }, [id, partner]);

  const handleStatusUpdate = async (statusKey) => {
    setUpdating(true);
    toast.loading(`Updating shipment status to: ${statusKey}...`, { id: 'status-update' });

    try {
      const token = localStorage.getItem('shippingToken');
      const res = await fetch(`${API_LOGISTICS_URL}/shipping/orders/${id}/status`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({ status: statusKey }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Shipment updated! Status: ${statusKey}`, { id: 'status-update' });
        fetchShipmentDetail();
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      toast.error(err.message || 'Status update failed.', { id: 'status-update' });
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !partner) {
    return (
      <div style={{ textAlign: 'center', marginTop: '6rem' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem auto', width: '40px', height: '40px' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading Shipment Details...</p>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', marginTop: '4rem' }}>
        <span style={{ fontSize: '3rem' }}>🔍</span>
        <h3 style={{ margin: '1rem 0 0.5rem 0' }}>Shipment not found</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>We couldn't retrieve details for this shipment.</p>
        <Link to="/shipping/dashboard" className="btn-secondary" style={{ textDecoration: 'none' }}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const order = shipment.orderId;

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <Toaster position="top-right" />

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <Link to="/shipping/dashboard" style={{ color: 'var(--color-secondary)', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
            ← Back to Dashboard
          </Link>
          <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 700, margin: 0 }}>🚚 Shipment Manager</h1>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', margin: '0.25rem 0 0 0', wordBreak: 'break-all' }}>AWB: {shipment.awbNumber}</p>
        </div>
        <span style={{
          fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontWeight: 600,
          background: shipment.shipmentStatus === 'DELIVERED' ? 'rgba(46, 125, 50, 0.08)' : shipment.shipmentStatus === 'FAILED' ? 'rgba(211, 47, 47, 0.08)' : 'rgba(255, 152, 0, 0.08)',
          color: shipment.shipmentStatus === 'DELIVERED' ? 'var(--color-success)' : shipment.shipmentStatus === 'FAILED' ? 'var(--color-error)' : 'var(--color-secondary)',
          border: '1px solid var(--border-color)', alignSelf: 'flex-start', whiteSpace: 'nowrap'
        }}>
          Shipment Status: {shipment.shipmentStatus}
        </span>
      </div>

      {/* Responsive 2-column layout using flex-wrap */}
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Left Column */}
        <div style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>

          {/* Status Update Card */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.1rem' }}>⚡ Update Transit Status</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Select the current state of the delivery. Statuses are synchronized to the customer and seller dashboards in real-time.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
              {[
                { key: 'PICKED_UP', label: 'Picked Up' },
                { key: 'IN_TRANSIT', label: 'In Transit' },
                { key: 'OUT_FOR_DELIVERY', label: 'Out For Delivery' },
                { key: 'DELIVERED', label: '✓ Delivered', successColor: true },
                { key: 'DELIVERY_FAILED', label: '✗ Delivery Failed', errorColor: true },
              ].map(({ key, label, successColor, errorColor }) => {
                const statusMatchKey = key === 'DELIVERY_FAILED' ? 'FAILED' : key;
                const isActive = shipment.shipmentStatus === statusMatchKey;
                return (
                  <button
                    key={key}
                    className="btn-secondary"
                    style={{
                      background: isActive
                        ? (errorColor ? 'rgba(211,47,47,0.1)' : 'rgba(46,125,50,0.1)')
                        : '',
                      borderColor: isActive
                        ? (errorColor ? 'var(--color-error)' : successColor ? 'var(--color-success)' : 'var(--color-primary)')
                        : '',
                      color: isActive
                        ? (errorColor ? 'var(--color-error)' : successColor ? 'var(--color-success)' : 'var(--color-primary)')
                        : '',
                      fontSize: '0.82rem',
                      padding: '0.55rem 0.5rem',
                    }}
                    onClick={() => handleStatusUpdate(key)}
                    disabled={updating || ['DELIVERED', 'FAILED'].includes(shipment.shipmentStatus)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Parcel Specs */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>📦 Parcel Specifications</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', fontSize: '0.88rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Parcel Weight:</span>
                <strong>{shipment.parcelWeight} kg</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Dimensions:</span>
                <strong>{shipment.parcelLength} x {shipment.parcelWidth} x {shipment.parcelHeight} inches</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Origin Zip:</span>
                <strong>{shipment.originZipCode}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Destination Zip:</span>
                <strong>{shipment.destinationZipCode}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Carrier Rate:</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>₹{(shipment.shippingRate / 100).toFixed(2)}</strong>
              </div>
            </div>
          </div>

          {/* Items in Shipment */}
          {order && (
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Items Inside Shipment</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem' }}>
                {order.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                    <span>{item.name}</span>
                    <strong style={{ whiteSpace: 'nowrap' }}>Qty: {item.quantity}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>

          {/* Recipient Address */}
          {order && (
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>📍 Recipient Address Details</h4>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div><strong style={{ color: 'var(--text-heading)' }}>Name:</strong> {order.shippingAddress.fullName}</div>
                <div><strong style={{ color: 'var(--text-heading)' }}>Phone:</strong> {order.shippingAddress.phone}</div>
                <div><strong style={{ color: 'var(--text-heading)' }}>Email:</strong> {order.shippingAddress.email}</div>
                <div><strong style={{ color: 'var(--text-heading)' }}>Address:</strong> {order.shippingAddress.address}</div>
                <div><strong style={{ color: 'var(--text-heading)' }}>City/State:</strong> {order.shippingAddress.city}, {order.shippingAddress.state}</div>
                <div><strong style={{ color: 'var(--text-heading)' }}>Country/Pincode:</strong> {order.shippingAddress.country} - {order.shippingAddress.pincode}</div>
              </div>
            </div>
          )}

          {/* Merchant Details */}
          {order?.sellerId && (
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>🏪 Merchant (Sender) Details</h4>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div><strong style={{ color: 'var(--text-heading)' }}>Store Name:</strong> {order.sellerId.name}</div>
                <div><strong style={{ color: 'var(--text-heading)' }}>Contact Email:</strong> {order.sellerId.email}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShippingOrderDetail;

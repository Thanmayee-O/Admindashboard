import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { useCart } from '../context/CartContext';

const API_PAYMENT_URL = 'http://localhost:3000/api/v1/payments';

// ─── Load Razorpay Script ─────────────────────────────────────────────────────
const loadRazorpayScript = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout script. Check your internet connection.'));
    document.body.appendChild(script);
  });

const Checkout = () => {
  const { cart, cartSubtotal, shippingFee, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const rzpRef = useRef(null); // keep reference to prevent GC during payment

  // ── Step state (1: Shipping, 2: Review, 3: Success/Failure)
  const [step, setStep] = useState(1);

  const [shippingAddress, setShippingAddress] = useState({
    fullName: 'John Doe',
    phone: '9876543210',
    email: 'john@example.com',
    address: 'Flat 401, Acme Heights, Tech Park Road',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    pincode: '560001',
  });

  const [paymentState, setPaymentState] = useState('idle'); // idle | loading | success | failed | cancelled
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState({ orderId: '', paymentId: '' });
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptError, setScriptError] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');

  // ── Preload Razorpay script as soon as the page mounts
  useEffect(() => {
    loadRazorpayScript()
      .then(() => setScriptReady(true))
      .catch((err) => {
        console.error('[Razorpay]', err.message);
        setScriptError(err.message);
      });
    setIdempotencyKey(`idem_rzp_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`);
  }, []);

  // ── Redirect if cart is empty
  useEffect(() => {
    if (cart.length === 0 && step === 1) {
      navigate('/products');
    }
  }, [cart, step, navigate]);

  // ── Shipping form validation
  const validateShipping = () => {
    const a = shippingAddress;
    if (!a.fullName.trim()) return 'Full Name is required.';
    if (!/^\d{10}$/.test(a.phone.trim())) return 'Enter a valid 10-digit phone number.';
    if (!/\S+@\S+\.\S+/.test(a.email.trim())) return 'Enter a valid email address.';
    if (!a.address.trim()) return 'Street address is required.';
    if (!a.city.trim()) return 'City is required.';
    if (!a.state.trim()) return 'State is required.';
    if (!a.country.trim()) return 'Country is required.';
    if (!/^\d{6}$/.test(a.pincode.trim())) return 'Enter a valid 6-digit pincode.';
    return null;
  };

  const handleShippingSubmit = (e) => {
    e.preventDefault();
    const err = validateShipping();
    if (err) { toast.error(err); return; }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Map frontend cart items (numeric IDs) to padded 24-char ObjectIds
  const buildCartPayload = () =>
    cart.map((item) => ({
      productId: item.id.toString().padStart(24, '0'),
      quantity: item.quantity,
    }));

  // ── Main payment handler
  const handlePay = async () => {
    if (paymentState === 'loading') return;

    // Guard: script must be ready
    if (!scriptReady) {
      toast.error(scriptError || 'Razorpay is still loading. Please wait a moment and try again.');
      return;
    }

    setPaymentState('loading');
    const cartPayload = buildCartPayload();

    try {
      // ── 1. Create Razorpay order on backend
      const createRes = await fetch(`${API_PAYMENT_URL}/razorpay/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          cartItems: cartPayload,
          userId: shippingAddress.email,
          shippingAddress,
        }),
      });

      const createData = await createRes.json();

      if (!createRes.ok || !createData.success) {
        throw new Error(createData.message || 'Could not create payment order. Please try again.');
      }

      // ── 2. Handle idempotency re-hit (already paid)
      if (createData.paymentStatus === 'Paid') {
        clearCart();
        setSuccessData({ orderId: createData.orderId, paymentId: '' });
        setPaymentState('success');
        setStep(3);
        return;
      }

      const { keyId, amount, currency, razorpayOrderId, orderId } = createData;

      const activeKey = (keyId && keyId !== 'mock' && keyId !== 'rzp_test_placeholder')
        ? keyId
        : import.meta.env.VITE_RAZORPAY_KEY_ID;

      if (!activeKey || activeKey === 'rzp_test_placeholder') {
        throw new Error(
          'Razorpay API key is not configured. Please add RAZORPAY_KEY_ID to server/.env or VITE_RAZORPAY_KEY_ID to client/.env'
        );
      }

      // ── 3. Open Razorpay popup
      const options = {
        key: activeKey,
        amount,
        currency: currency || 'INR',
        name: 'PawMart',
        description: 'Secure Checkout',
        image: 'https://cdn-icons-png.flaticon.com/512/3048/3048127.png',
        order_id: razorpayOrderId,
        prefill: {
          name: shippingAddress.fullName,
          email: shippingAddress.email,
          contact: shippingAddress.phone,
        },
        theme: { color: '#2E7D32' },
        modal: {
          backdropclose: false,
          escape: true,
          ondismiss: () => {
            // User closed the modal without paying
            setPaymentState('idle');
            toast('Payment cancelled. You can try again.', { icon: '⚠️' });
          },
        },
        handler: async (response) => {
          // ── 4. Payment captured — verify on backend
          try {
            const verifyRes = await fetch(`${API_PAYMENT_URL}/razorpay/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                cartItems: cartPayload,
                userId: shippingAddress.email,
                shippingAddress,
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.message || 'Payment verification failed.');
            }

            // ── 5. Success
            clearCart();
            setSuccessData({ orderId, paymentId: response.razorpay_payment_id });
            setPaymentState('success');
            setStep(3);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } catch (verifyErr) {
            setErrorMessage(verifyErr.message);
            setPaymentState('failed');
            setStep(3);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzpRef.current = rzp;

      rzp.on('payment.failed', (response) => {
        const msg = response.error?.description || 'Payment failed. Please try a different payment method.';
        setErrorMessage(msg);
        setPaymentState('failed');
        setStep(3);
        toast.error(msg);
      });

      rzp.open();

    } catch (err) {
      console.error('[Checkout Error]', err);
      toast.error(err.message);
      setErrorMessage(err.message);
      setPaymentState('failed');
      setStep(3);
    }
  };

  const handleRetry = () => {
    setPaymentState('idle');
    setErrorMessage('');
    setSuccessData({ orderId: '', paymentId: '' });
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isProcessing = paymentState === 'loading';

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: '4rem' }}>
      <Toaster position="top-right" />

      {/* Progress bar */}
      <div style={{ marginBottom: '2rem' }}>
        <div className="checkout-progress-bar" style={{ display: 'flex', alignItems: 'center', gap: '0', maxWidth: '480px', margin: '0 auto' }}>
          {['Shipping', 'Review', 'Done'].map((label, idx) => {
            const stepNum = idx + 1;
            const done = step > stepNum;
            const active = step === stepNum;
            return (
              <React.Fragment key={label}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.85rem',
                    background: done ? 'var(--color-primary)' : active ? 'var(--color-primary)' : '#E5E7EB',
                    color: done || active ? '#fff' : '#9CA3AF',
                  }}>
                    {done ? '✓' : stepNum}
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: active ? 700 : 400, color: active ? 'var(--color-primary)' : 'var(--text-muted)' }}>
                    {label}
                  </span>
                </div>
                {idx < 2 && (
                  <div style={{ flex: 1, height: '2px', background: step > stepNum ? 'var(--color-primary)' : '#E5E7EB', margin: '0 0.25rem', marginBottom: '1.2rem' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── STEP 1: Shipping ─────────────────────────────────────── */}
      {step === 1 && (
        <div className="checkout-step-grid" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '2rem', alignItems: 'start' }}>
          {/* Shipping form */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', color: 'var(--text-heading)' }}>
              🚚 Shipping Address
            </h3>
            <form onSubmit={handleShippingSubmit}>
              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="fullName">Full Name</label>
                  <input id="fullName" type="text" className="form-input" value={shippingAddress.fullName}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, fullName: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input id="phone" type="tel" className="form-input" value={shippingAddress.phone}
                    onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); if (v.length <= 10) setShippingAddress({ ...shippingAddress, phone: v }); }}
                    placeholder="10-digit number" maxLength={10} required />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="emailAddr">Email Address</label>
                <input id="emailAddr" type="email" className="form-input" value={shippingAddress.email}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, email: e.target.value })} required />
              </div>

              <div className="form-group">
                <label htmlFor="address">Street Address</label>
                <input id="address" type="text" className="form-input" value={shippingAddress.address}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value })} required />
              </div>

              <div className="form-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label htmlFor="city">City</label>
                  <input id="city" type="text" className="form-input" value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label htmlFor="state">State</label>
                  <input id="state" type="text" className="form-input" value={shippingAddress.state}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label htmlFor="pincode">Pincode</label>
                  <input id="pincode" type="text" className="form-input" value={shippingAddress.pincode}
                    onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); if (v.length <= 6) setShippingAddress({ ...shippingAddress, pincode: v }); }}
                    placeholder="6-digit" maxLength={6} required />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="country">Country</label>
                <input id="country" type="text" className="form-input" value={shippingAddress.country}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })} required />
              </div>

              <button type="submit" className="btn-pay" style={{ marginTop: '1rem' }}>
                Continue to Review →
              </button>
            </form>
          </div>

          {/* Cart summary */}
          <div className="glass-card" style={{ padding: '1.75rem', height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: 'var(--text-heading)' }}>🛒 Cart Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {cart.map((item) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                    <img src={item.thumbnail} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-heading)', lineHeight: 1.3 }}>{item.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Qty: {item.quantity}</div>
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <span>Subtotal</span><span>₹{cartSubtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <span>Shipping</span><span>₹{shippingFee.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                <span>Total</span><span style={{ color: 'var(--color-primary)' }}>₹{cartTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Review & Pay ─────────────────────────────────── */}
      {step === 2 && (
        <div className="checkout-step-grid" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '2rem', alignItems: 'start' }}>
          {/* Left: review */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Shipping summary */}
            <div className="glass-card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-heading)' }}>📍 Shipping Address</h3>
                <button className="btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setStep(1)}>
                  Edit
                </button>
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--text-heading)' }}>{shippingAddress.fullName}</strong><br />
                📞 {shippingAddress.phone} &nbsp;|&nbsp; ✉️ {shippingAddress.email}<br />
                {shippingAddress.address},<br />
                {shippingAddress.city}, {shippingAddress.state} — {shippingAddress.pincode},<br />
                {shippingAddress.country}
              </div>
            </div>

            {/* Items */}
            <div className="glass-card" style={{ padding: '1.75rem' }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: 'var(--text-heading)' }}>📦 Order Items</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {cart.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', padding: '3px', background: '#fff' }}>
                        <img src={item.thumbnail} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-heading)' }}>{item.title}</div>
                        <div style={{ fontSize: '0.77rem', color: 'var(--text-muted)' }}>₹{item.price.toFixed(2)} × {item.quantity}</div>
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Razorpay test card hint */}
            <div style={{
              background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '10px',
              padding: '0.9rem 1.2rem', fontSize: '0.82rem', color: '#92400e'
            }}>
              <strong>🧪 Razorpay Test Mode:</strong> Use card <span style={{ fontFamily: 'monospace' }}>4718 6006 9996 7520</span> — Expiry: <span style={{ fontFamily: 'monospace' }}>12/26</span> — CVV: <span style={{ fontFamily: 'monospace' }}>123</span> — OTP: <span style={{ fontFamily: 'monospace' }}>1234</span>.
              Or select <strong>UPI</strong> and enter <span style={{ fontFamily: 'monospace' }}>success@razorpay</span> to simulate a successful payment.
            </div>

            {/* Script error warning */}
            {scriptError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '0.9rem 1.2rem', fontSize: '0.85rem', color: '#991B1B' }}>
                ⚠️ <strong>Razorpay script failed to load:</strong> {scriptError}
              </div>
            )}

            {/* CTA buttons */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-secondary" style={{ padding: '0.85rem 1.5rem' }} onClick={() => setStep(1)} disabled={isProcessing}>
                ← Back
              </button>
              <button
                id="pay-btn"
                className="btn-pay"
                style={{ margin: 0, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                onClick={handlePay}
                disabled={isProcessing || !!scriptError}
              >
                {isProcessing ? (
                  <><div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> Processing…</>
                ) : (
                  `🔒 Pay ₹${cartTotal.toFixed(2)} with Razorpay`
                )}
              </button>
            </div>
          </div>

          {/* Right: price breakdown */}
          <div className="glass-card" style={{ padding: '1.75rem', height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: 'var(--text-heading)' }}>💰 Price Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                <span>Items Subtotal</span><span>₹{cartSubtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                <span>Standard Shipping</span><span>₹{shippingFee.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.25rem', borderTop: '2px solid var(--border-color)', paddingTop: '0.85rem', marginTop: '0.35rem' }}>
                <span>Total</span>
                <span style={{ color: 'var(--color-primary)' }}>₹{cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', background: '#F9FAFB', borderRadius: '8px', padding: '0.85rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              🔒 Payments are processed securely via <strong>Razorpay</strong>.<br />
              Your card details are never stored on our servers.
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: Success ──────────────────────────────────────── */}
      {step === 3 && paymentState === 'success' && (
        <div className="glass-card checkout-result-card" style={{ maxWidth: '540px', margin: '0 auto', padding: '3rem 2.5rem', textAlign: 'center' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(46,125,50,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', fontSize: '2rem' }}>
            ✅
          </div>
          <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-primary)', fontSize: '1.75rem' }}>Payment Successful!</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 2rem 0', lineHeight: 1.6 }}>
            Your order has been placed and is <strong>Pending Seller Confirmation</strong>.<br />
            You'll receive updates as the seller processes your order.
          </p>

          <div style={{ background: '#F9FAFB', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.85rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Order ID</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8rem' }}>{successData.orderId}</span>
            </div>
            {successData.paymentId && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Payment ID</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8rem' }}>{successData.paymentId}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn-pay" style={{ width: 'auto', padding: '0.7rem 1.75rem' }} onClick={() => navigate('/my-orders')}>
              View My Orders
            </button>
            <button className="btn-secondary" onClick={() => navigate('/products')}>
              Continue Shopping
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Failure ──────────────────────────────────────── */}
      {step === 3 && (paymentState === 'failed' || paymentState === 'cancelled') && (
        <div className="glass-card checkout-result-card" style={{ maxWidth: '540px', margin: '0 auto', padding: '3rem 2.5rem', textAlign: 'center' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(220,38,38,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', fontSize: '2rem' }}>
            ❌
          </div>
          <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-error)', fontSize: '1.75rem' }}>Payment Failed</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 2rem 0', maxWidth: '360px', margin: '0 auto 2rem auto' }}>
            {errorMessage || 'Something went wrong during payment. No charges have been made.'}
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn-pay" style={{ width: 'auto', padding: '0.7rem 1.75rem' }} onClick={handleRetry}>
              Try Again
            </button>
            <button className="btn-secondary" onClick={() => navigate('/products')}>
              Continue Shopping
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;

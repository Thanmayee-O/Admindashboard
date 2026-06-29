import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

const DEMO_ACCOUNT = {
  name: 'Global Express Logistics',
  email: 'shipping@partner.com',
  password: 'shipping123',
};

const ShippingLogin = () => {
  const [email, setEmail] = useState(DEMO_ACCOUNT.email);
  const [password, setPassword] = useState(DEMO_ACCOUNT.password);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('https://admindashboard-13rm.onrender.com/api/v1/logistics/shipping/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Welcome, ${data.shippingPartner.name}!`);
        localStorage.setItem('shippingPartner', JSON.stringify(data.shippingPartner));
        localStorage.setItem('shippingToken', data.token);
        setTimeout(() => navigate('/shipping/dashboard'), 700);
      } else {
        throw new Error(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail(DEMO_ACCOUNT.email);
    setPassword(DEMO_ACCOUNT.password);
    toast('Filled demo account', { icon: '✏️', duration: 1500 });
  };

  return (
    <div style={{ maxWidth: '480px', margin: '3rem auto 0 auto', padding: '0 1rem' }}>
      <Toaster position="top-right" />

      {/* Demo account banner */}
      <div style={{
        background: '#F0FDF4',
        border: '1px solid #BBF7D0',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1rem' }}>🧪</span>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#166534' }}>Demo Account — Click to Fill</span>
        </div>
        <p style={{ fontSize: '0.78rem', color: '#16a34a', margin: '0 0 0.85rem 0' }}>
          Any shipping partner in the database can log in. This demo account is pre-seeded for evaluation.
        </p>
        <button
          type="button"
          onClick={fillDemo}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#FFFFFF', border: '1px solid #BBF7D0', borderRadius: '8px',
            padding: '0.6rem 0.9rem', cursor: 'pointer', width: '100%',
            transition: 'box-shadow 0.15s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(22,163,74,0.15)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
        >
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1F2937' }}>
              🚚 {DEMO_ACCOUNT.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', fontFamily: 'monospace' }}>
              {DEMO_ACCOUNT.email} / {DEMO_ACCOUNT.password}
            </div>
          </div>
          <span style={{
            fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.55rem',
            borderRadius: '9999px', background: '#2E7D32', color: '#fff'
          }}>
            Active
          </span>
        </button>
      </div>

      {/* Login card */}
      <div className="glass-card login-card" style={{ padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🚚</div>
          <h2 style={{ margin: '0 0 0.4rem 0', fontSize: '1.6rem', color: 'var(--text-heading)' }}>
            Shipping Partner Portal
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
            Sign in to manage shipments and update delivery statuses.
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="shipping-email">Partner Email</label>
            <input
              id="shipping-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter partner email"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="shipping-password">Password</label>
            <input
              id="shipping-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn-pay"
            style={{ marginTop: '1.5rem' }}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ShippingLogin;

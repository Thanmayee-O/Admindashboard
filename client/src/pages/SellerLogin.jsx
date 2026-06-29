import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

const DEMO_ACCOUNTS = [
  { name: 'Acme Electronics', email: 'acme.payouts@example.com', password: 'seller123', status: 'Active', badge: '#2E7D32' },
  { name: 'Restricted Goods Corp', email: 'restricted.corp@example.com', password: 'seller123', status: 'Restricted', badge: '#d97706' },
];

const SellerLogin = () => {
  const [email, setEmail] = useState(DEMO_ACCOUNTS[0].email);
  const [password, setPassword] = useState(DEMO_ACCOUNTS[0].password);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('https://admindashboard-13rm.onrender.com/api/v1/payments/seller/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Welcome back, ${data.seller.name}!`);
        localStorage.setItem('seller', JSON.stringify(data.seller));
        localStorage.setItem('sellerToken', data.token);
        setTimeout(() => navigate('/seller/dashboard'), 700);
      } else {
        throw new Error(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillAccount = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    toast(`Filled: ${account.name}`, { icon: '✏️', duration: 1500 });
  };

  return (
    <div style={{ maxWidth: '480px', margin: '3rem auto 0 auto', padding: '0 1rem' }}>
      <Toaster position="top-right" />

      {/* Demo accounts banner */}
      <div style={{
        background: '#EFF6FF',
        border: '1px solid #BFDBFE',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1rem' }}>🧪</span>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e40af' }}>Demo Accounts — Click to Fill</span>
        </div>
        <p style={{ fontSize: '0.78rem', color: '#3b82f6', margin: '0 0 0.85rem 0' }}>
          Any seller in the database can log in. These demo accounts are pre-seeded for evaluation.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => fillAccount(acc)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#FFFFFF', border: '1px solid #BFDBFE', borderRadius: '8px',
                padding: '0.6rem 0.9rem', cursor: 'pointer', width: '100%',
                transition: 'box-shadow 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(59,130,246,0.15)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1F2937' }}>{acc.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', fontFamily: 'monospace' }}>{acc.email} / {acc.password}</div>
              </div>
              <span style={{
                fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.55rem',
                borderRadius: '9999px', color: '#fff',
                background: acc.badge
              }}>
                {acc.status}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Login card */}
      <div className="glass-card login-card" style={{ padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏪</div>
          <h2 style={{ margin: '0 0 0.4rem 0', fontSize: '1.6rem', color: 'var(--text-heading)' }}>Merchant Portal</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
            Sign in to manage orders and track earnings.
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="seller-email">Seller Email</label>
            <input
              id="seller-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter seller email"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="seller-password">Password</label>
            <input
              id="seller-password"
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

export default SellerLogin;

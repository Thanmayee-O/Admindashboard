import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const Navbar = () => {
  const { cartCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinkStyle = ({ isActive }) => ({
    color: isActive ? 'var(--color-primary)' : 'var(--text-main)',
    textDecoration: 'none',
    fontWeight: 500,
    fontSize: '0.95rem',
    transition: 'var(--transition-smooth)',
  });

  const links = [
    { to: '/', label: 'Home', end: true },
    { to: '/products', label: 'Catalog' },
    { to: '/my-orders', label: 'My Orders' },
    { to: '/seller/dashboard', label: 'Seller Dashboard' },
    { to: '/shipping/dashboard', label: 'Shipping Dashboard' },
  ];

  return (
    <nav className="navbar glass-card" style={{ padding: '0.75rem 1.5rem', marginBottom: '2rem', borderRadius: '0 0 16px 16px', borderTop: 'none' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Top row: brand + desktop links + hamburger */}
        <div className="navbar-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" className="brand" style={{ textDecoration: 'none' }}>
            <span className="brand-logo" style={{ fontSize: '1.5rem' }}>Enterprise Shop</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="nav-links nav-links-desktop" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            {links.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} style={navLinkStyle}>
                {label}
              </NavLink>
            ))}
            <NavLink
              to="/cart"
              style={({ isActive }) => ({
                ...navLinkStyle({ isActive }),
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              })}
            >
              🛒 Cart
              {cartCount > 0 && (
                <span
                  style={{
                    background: 'var(--color-primary)',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    borderRadius: '50%',
                    minWidth: '18px',
                    height: '18px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {cartCount}
                </span>
              )}
            </NavLink>
          </div>

          {/* Hamburger button (mobile only) */}
          <button
            className="navbar-hamburger"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        <div className={`nav-mobile-menu${menuOpen ? ' open' : ''}`}>
          {links.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-mobile-link${isActive ? ' active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </NavLink>
          ))}
          <NavLink
            to="/cart"
            className={({ isActive }) => `nav-mobile-link${isActive ? ' active' : ''}`}
            onClick={() => setMenuOpen(false)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            🛒 Cart
            {cartCount > 0 && (
              <span
                style={{
                  background: 'var(--color-primary)',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  borderRadius: '50%',
                  minWidth: '18px',
                  height: '18px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {cartCount}
              </span>
            )}
          </NavLink>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

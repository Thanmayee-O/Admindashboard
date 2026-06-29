import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const Cart = () => {
  const { cart, updateQuantity, removeFromCart, cartCount, cartSubtotal, shippingFee, cartTotal } = useCart();
  const navigate = useNavigate();

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '2.5rem' }}>Your Shopping Cart</h1>

      {cart.length === 0 ? (
        <div className="glass-card status-container" style={{ padding: '4rem 2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🛒</div>
          <h2 className="status-title">Your Cart is Empty</h2>
          <p className="status-message">You have no items in your shopping cart. Discover our catalog and add items to checkout.</p>
          <button className="btn-pay" style={{ width: 'auto', padding: '0.75rem 2rem' }} onClick={() => navigate('/products')}>
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="checkout-grid" style={{ gridTemplateColumns: '1.4fr 1fr', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start' }}>
          {/* Left Column: Cart Items List */}
          <div className="glass-card" style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', color: 'var(--text-heading)' }}>
              Selected Products ({cartCount} items)
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {cart.map((item) => (
                <div key={item.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', flexWrap: 'wrap' }}>
                  {/* Product Image */}
                  <div style={{ width: '80px', height: '80px', flexShrink: 0, borderRadius: '8px', border: '1px solid var(--border-color)', background: '#FFFFFF', padding: '5px', overflow: 'hidden' }}>
                    <img src={item.thumbnail} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>

                  {/* Product Info & Quantity Controls */}
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-heading)' }}>
                      <Link to={`/products/${item.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>{item.title}</Link>
                    </h4>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <div className="item-quantity-controls">
                        <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                        <span className="item-qty">{item.quantity}</span>
                        <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                      </div>
                      
                      <button
                        onClick={() => removeFromCart(item.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-error)',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Subtotal Item Price */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-heading)', fontFamily: 'var(--font-mono)' }}>
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                      ₹{item.price.toFixed(2)} each
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Order Summary & Checkout */}
          <div className="glass-card" style={{ flex: '1 1 260px', minWidth: 0, padding: '2rem', height: 'fit-content' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.5rem', color: 'var(--text-heading)' }}>
              Order Summary
            </h3>

            <div className="order-summary-box" style={{ background: 'transparent', border: 'none', padding: 0, gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="summary-row">
                <span>Items Subtotal</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>₹{cartSubtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Estimated Shipping</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>₹{shippingFee.toFixed(2)}</span>
              </div>
              <div className="summary-row total" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', fontSize: '1.35rem' }}>
                <span>Final Total</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>₹{cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="btn-pay"
              style={{ padding: '1rem', fontSize: '1.05rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              Proceed to Checkout
            </button>
            
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <Link to="/products" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
                ← Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;

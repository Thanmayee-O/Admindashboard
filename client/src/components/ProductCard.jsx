import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

const ProductCard = ({ product }) => {
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();

  // Find if item is already in cart to display quantity controls
  const cartItem = cart.find((item) => item.id === product.id);

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    toast.success(`Added ${product.title} to cart!`);
  };

  const handleIncrement = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartItem) {
      updateQuantity(product.id, cartItem.quantity + 1);
    }
  };

  const handleDecrement = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartItem) {
      if (cartItem.quantity === 1) {
        removeFromCart(product.id);
        toast.success(`Removed ${product.title} from cart.`);
      } else {
        updateQuantity(product.id, cartItem.quantity - 1);
      }
    }
  };

  return (
    <div className="glass-card product-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', transition: 'var(--transition-smooth)' }}>
      <Link to={`/products/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div style={{ position: 'relative', width: '100%', paddingTop: '100%', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', overflow: 'hidden', marginBottom: '1rem' }}>
          <img
            src={product.thumbnail || product.images?.[0]}
            alt={product.title}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', padding: '10px', transition: 'transform 0.5s' }}
            className="product-card-img"
          />
          <span
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: 'rgba(46, 125, 50, 0.08)',
              border: '1px solid rgba(46, 125, 50, 0.25)',
              color: 'var(--color-primary)',
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '0.2rem 0.5rem',
              borderRadius: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            {product.category}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.25rem' }}>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-heading)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
            {product.title}
          </h4>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'var(--font-mono)' }}>
              ₹{product.price.toFixed(2)}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              ⭐ {product.rating?.toFixed(1) || '4.5'}
            </span>
          </div>
        </div>
      </Link>

      {cartItem ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', width: '100%' }}>
          <button
            className="qty-btn"
            style={{ width: '32px', height: '32px', fontSize: '1.1rem', borderRadius: '8px' }}
            onClick={handleDecrement}
          >
            -
          </button>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-sans)', color: 'var(--text-main)' }}>
            {cartItem.quantity} in Cart
          </span>
          <button
            className="qty-btn"
            style={{ width: '32px', height: '32px', fontSize: '1.1rem', borderRadius: '8px' }}
            onClick={handleIncrement}
            disabled={cartItem.quantity >= product.stock}
          >
            +
          </button>
        </div>
      ) : (
        <button
          onClick={handleAdd}
          className="btn-pay"
          style={{ padding: '0.5rem', fontSize: '0.9rem', boxShadow: 'none' }}
          disabled={product.stock === 0}
        >
          {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      )}
    </div>
  );
};

export default ProductCard;

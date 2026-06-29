import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchProductById } from '../services/productService';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState('');

  useEffect(() => {
    setLoading(true);
    fetchProductById(id)
      .then((data) => {
        setProduct(data);
        setActiveImage(data.images?.[0] || data.thumbnail || '');
        setError(null);
      })
      .catch((err) => {
        setError('Failed to fetch product details. The item might not exist in the dummy registry.');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleAdd = () => {
    if (!product) return;
    addToCart(product);
    toast.success(`Added ${product.title} to cart!`);
  };

  if (loading) {
    return (
      <div className="glass-card" style={{ padding: '3rem', minHeight: '400px', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div className="skeleton-pulse" style={{ flex: '1 1 350px', height: '350px', borderRadius: '12px', background: '#F9FAFB' }}></div>
        <div style={{ flex: '1.2 1 350px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="skeleton-pulse" style={{ width: '40%', height: '16px', borderRadius: '4px', background: '#F9FAFB' }}></div>
          <div className="skeleton-pulse" style={{ width: '80%', height: '32px', borderRadius: '6px', background: '#F9FAFB' }}></div>
          <div className="skeleton-pulse" style={{ width: '30%', height: '24px', borderRadius: '4px', background: '#F9FAFB' }}></div>
          <div className="skeleton-pulse" style={{ width: '100%', height: '80px', borderRadius: '8px', background: '#F9FAFB' }}></div>
          <div className="skeleton-pulse" style={{ width: '100%', height: '48px', borderRadius: '8px', background: '#F9FAFB' }}></div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="glass-card status-container" style={{ padding: '3rem' }}>
        <div className="status-icon error">✗</div>
        <h3 className="status-title">Product Details Error</h3>
        <p className="status-message">{error || 'Product not found.'}</p>
        <button className="btn-secondary" onClick={() => navigate('/products')}>Back to Catalog</button>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <button className="btn-secondary" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem' }} onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="glass-card product-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '3rem', padding: '2.5rem', alignItems: 'start' }}>
        {/* Left: Gallery Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="product-gallery" style={{ width: '100%', paddingTop: '80%', position: 'relative', borderRadius: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <img
              src={activeImage}
              alt={product.title}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', padding: '20px' }}
            />
          </div>
          
          {/* Thumbnails Row */}
          {product.images && product.images.length > 1 && (
            <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  style={{
                    flex: '0 0 70px',
                    height: '70px',
                    borderRadius: '8px',
                    border: '2px solid ' + (activeImage === img ? 'var(--color-primary)' : 'var(--border-color)'),
                    background: 'rgba(255,255,255,0.02)',
                    padding: '4px',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    transition: 'var(--transition-smooth)'
                  }}
                >
                  <img src={img} alt={`${product.title} view ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="badge-sandbox" style={{ background: 'rgba(46, 125, 50, 0.08)', color: 'var(--color-primary)', borderColor: 'rgba(46, 125, 50, 0.25)', margin: 0, fontSize: '0.7rem' }}>
                {product.category}
              </span>
              <span style={{ fontSize: '0.85rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                ⭐ {product.rating?.toFixed(1)} Rating
              </span>
            </div>

            <h1 style={{ fontSize: '2.5rem', fontWeight: 700, margin: '0.75rem 0 1rem 0', color: 'var(--text-heading)', letterSpacing: '-0.03em', borderBottom: 'none', padding: 0 }}>
              {product.title}
            </h1>

            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'var(--font-mono)', marginBottom: '1.5rem' }}>
              ₹{product.price.toFixed(2)}
            </div>

            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-heading)' }}>Description</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
              {product.description}
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Inventory Availability:</span>
              <span style={{
                fontWeight: 600,
                color: product.stock > 0 ? 'var(--color-success)' : 'var(--color-error)'
              }}>
                {product.stock > 0 ? `In Stock (${product.stock} units)` : 'Out of Stock'}
              </span>
            </div>

            {(() => {
              const cartItem = cart.find(item => item.id === product.id);
              if (cartItem) {
                return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', width: '100%' }}>
                    <button
                      className="qty-btn"
                      style={{ width: '48px', height: '48px', fontSize: '1.4rem', borderRadius: '8px' }}
                      onClick={() => {
                        if (cartItem.quantity === 1) {
                          removeFromCart(product.id);
                          toast.success(`Removed ${product.title} from cart.`);
                        } else {
                          updateQuantity(product.id, cartItem.quantity - 1);
                        }
                      }}
                    >
                      -
                    </button>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {cartItem.quantity} in Shopping Cart
                    </span>
                    <button
                      className="qty-btn"
                      style={{ width: '48px', height: '48px', fontSize: '1.4rem', borderRadius: '8px' }}
                      onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
                      disabled={cartItem.quantity >= product.stock}
                    >
                      +
                    </button>
                  </div>
                );
              }
              return (
                <button
                  onClick={handleAdd}
                  className="btn-pay"
                  style={{ padding: '1rem', fontSize: '1.05rem' }}
                  disabled={product.stock === 0}
                >
                  {product.stock === 0 ? 'Out of Stock' : 'Add to Shopping Cart'}
                </button>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;

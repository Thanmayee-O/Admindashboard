import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchProducts } from '../services/productService';
import ProductCard from '../components/ProductCard';
import SkeletonLoader from '../components/SkeletonLoader';

const Home = () => {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const categories = [
    { name: 'Beauty', slug: 'beauty', icon: '💄' },
    { name: 'Fragrances', slug: 'fragrances', icon: '✨' },
    { name: 'Furniture', slug: 'furniture', icon: '🛋️' },
    { name: 'Groceries', slug: 'groceries', icon: '🍎' }
  ];

  useEffect(() => {
    fetchProducts()
      .then((products) => {
        // Filter out featured products (top rated)
        const sorted = [...products].sort((a, b) => b.rating - a.rating).slice(0, 4);
        setFeatured(sorted);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem', paddingBottom: '4rem' }}>
      {/* Hero Section */}
      <section
        className="glass-card hero-section"
        style={{
          padding: '4rem 3rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(46, 125, 50, 0.05), rgba(255, 152, 0, 0.05))'
        }}
      >
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '50%', background: 'radial-gradient(circle, var(--color-primary-glow) 0%, transparent 70%)', filter: 'blur(40px)', zIndex: 0 }}></div>
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '45%', height: '55%', background: 'radial-gradient(circle, var(--color-secondary-glow) 0%, transparent 70%)', filter: 'blur(50px)', zIndex: 0 }}></div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <span className="badge-sandbox" style={{ width: 'fit-content', margin: '0 auto', fontSize: '0.8rem' }}>Next-Gen E-Commerce Demo</span>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 800, margin: '0.5rem 0', lineHeight: 1.1, letterSpacing: '-0.04em' }}>
            Experience Premium Marketplace Checkout
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 auto', maxWidth: '600px' }}>
            Browse realistic mock catalog products fetched dynamically from public registries, add them to your cart, and test split payouts with Stripe Sandbox!
          </p>
        </div>

        <div className="hero-cta-group" style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="btn-pay" style={{ width: 'auto', padding: '0.75rem 2rem' }} onClick={() => navigate('/products')}>
            Shop Catalog
          </button>
          <button className="btn-secondary" style={{ padding: '0.75rem 2rem' }} onClick={() => navigate('/orders')}>
            View Orders
          </button>
        </div>
      </section>

      {/* Featured Categories */}
      <section style={{ maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
        <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>🏷️ Shop by Category</h2>
        <div className="category-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          {categories.map((cat) => (
            <div
              key={cat.slug}
              className="glass-card"
              style={{ padding: '1.75rem', textAlign: 'center', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
              onClick={() => navigate(`/products?category=${cat.slug}`)}
              className="glass-card category-card"
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{cat.icon}</div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-heading)' }}>{cat.name}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section style={{ maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
        <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>⭐ Top Rated Products</h2>
        {loading ? (
          <SkeletonLoader count={4} />
        ) : (
          <div className="products-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchProducts } from '../services/productService';
import ProductCard from '../components/ProductCard';
import SkeletonLoader from '../components/SkeletonLoader';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  
  const selectedCategory = searchParams.get('category') || 'all';

  const categories = [
    { name: 'All Products', slug: 'all' },
    { name: 'Beauty', slug: 'beauty' },
    { name: 'Fragrances', slug: 'fragrances' },
    { name: 'Furniture', slug: 'furniture' },
    { name: 'Groceries', slug: 'groceries' }
  ];

  useEffect(() => {
    setLoading(true);
    fetchProducts()
      .then((data) => {
        setProducts(data);
        setError(null);
      })
      .catch((err) => {
        setError('Failed to retrieve products. Please ensure you are connected to the network.');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCategoryChange = (slug) => {
    if (slug === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', slug);
    }
    setSearchParams(searchParams);
  };

  // Filter products based on category and search query
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <header style={{ marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 700, margin: 0 }}>Browse Catalog</h1>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>Discover dynamic products fetched from the sandbox registry.</p>
        
        {/* Search and Filters Layout */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem', width: '100%', alignItems: 'center' }}>
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', paddingLeft: '2.5rem' }}
              placeholder="Search products by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔍</span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => handleCategoryChange(cat.slug)}
                style={{
                  background: selectedCategory === cat.slug ? 'var(--color-primary)' : '#FFFFFF',
                  color: selectedCategory === cat.slug ? '#ffffff' : 'var(--text-main)',
                  border: '1px solid ' + (selectedCategory === cat.slug ? 'var(--color-primary)' : 'var(--border-color)'),
                  borderRadius: '9999px',
                  padding: '0.4rem 1.2rem',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)'
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* States handler */}
      {loading && <SkeletonLoader count={8} />}
      
      {error && (
        <div className="glass-card status-container" style={{ padding: '3rem' }}>
          <div className="status-icon error">✗</div>
          <h3 className="status-title">Network Request Error</h3>
          <p className="status-message">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {filteredProducts.length === 0 ? (
            <div className="glass-card status-container" style={{ padding: '3rem 2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
              <h3 className="status-title" style={{ fontSize: '1.25rem' }}>No Products Found</h3>
              <p className="status-message" style={{ fontSize: '0.9rem' }}>We couldn't find any products matching your search criteria. Try adjusting your query or category filter.</p>
            </div>
          ) : (
            <div className="products-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
              {filteredProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Products;

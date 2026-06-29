import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '330px', justifyContent: 'space-between', border: '1px solid var(--border-color)' }}>
      <div>
        <div
          className="skeleton-pulse"
          style={{ width: '100%', paddingTop: '100%', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', marginBottom: '1rem' }}
        ></div>
        <div
          className="skeleton-pulse"
          style={{ width: '70%', height: '16px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.03)', marginBottom: '0.5rem' }}
        ></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            className="skeleton-pulse"
            style={{ width: '30%', height: '20px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.03)' }}
          ></div>
          <div
            className="skeleton-pulse"
            style={{ width: '20%', height: '14px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.03)' }}
          ></div>
        </div>
      </div>
      <div
        className="skeleton-pulse"
        style={{ width: '100%', height: '36px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)' }}
      ></div>
    </div>
  );
};

const SkeletonLoader = ({ count = 6 }) => {
  const skeletons = Array.from({ length: count });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem', width: '100%' }}>
      {skeletons.map((_, idx) => (
        <SkeletonCard key={idx} />
      ))}
    </div>
  );
};

export default SkeletonLoader;

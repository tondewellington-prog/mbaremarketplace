import { useState } from 'react';

export default function VehicleSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchTerm })
      });

      const data = await res.json();

      if (data.success) {
        setVehicles(data.vehicles || []);
      } else {
        setErrorMsg(data.error || 'Failed to fetch vehicles.');
      }
    } catch (err) {
      console.error('Frontend search error:', err);
      setErrorMsg('An error occurred while fetching listings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search import vehicles (e.g. Mazda Demio, Honda Fit)..."
          style={{
            flex: 1,
            padding: '12px 16px',
            fontSize: '16px',
            borderRadius: '8px',
            border: '1px solid #ccc'
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#0070f3',
            color: '#fff',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Searching & Saving...' : 'Search'}
        </button>
      </form>

      {errorMsg && (
        <div style={{ padding: '12px', color: '#d32f2f', backgroundColor: '#ffebee', borderRadius: '6px', marginBottom: '20px' }}>
          {errorMsg}
        </div>
      )}

      {/* Vehicle Grid Display */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {vehicles.map((car, idx) => (
          <div key={car.id || idx} style={{ border: '1px solid #eaeaea', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <img
              src={car.main_image || 'https://via.placeholder.com/300x180?text=No+Image'}
              alt={car.title}
              style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px' }}
            />
            <h3 style={{ fontSize: '18px', margin: '12px 0 8px 0' }}>{car.title}</h3>
            <p style={{ fontWeight: 'bold', fontSize: '16px', color: '#2e7d32', margin: '4px 0' }}>
              {car.price_usd ? `$${car.price_usd.toLocaleString()} USD` : 'Price on request'}
            </p>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
              <span>{car.year || 'N/A'}</span> • <span>{car.transmission || 'N/A'}</span> • <span>{car.mileage || 'N/A'}</span>
            </div>
            {car.external_url && (
              <a
                href={car.external_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-block', marginTop: '12px', color: '#0070f3', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}
              >
                View Details →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

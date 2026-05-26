import { useState } from 'react';
import { useApp, MenuItem } from '../store/AppContext';

type Category = 'all' | 'breakfast' | 'lunch' | 'dinner' | 'drinks';

function FoodCard({ item, onAdd }: { item: MenuItem; onAdd: () => void }) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) onAdd();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="food-card">
      <div className="food-card-img-wrapper">
        <img src={item.image} alt={item.name} className="food-card-img" />
        {item.badge && <span className="food-badge">{item.badge}</span>}
        {!item.available && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Unavailable
            </span>
          </div>
        )}
      </div>
      <div className="food-card-body">
        <h4 className="food-name">{item.name}</h4>
        <p className="food-desc">{item.description}</p>
        <div className="food-price">₦{item.price.toLocaleString()}</div>
        {item.available && (
          <>
            <div className="food-controls">
              <button className="qty-btn" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
              <span className="qty-display">{qty}</span>
              <button className="qty-btn" onClick={() => setQty(qty + 1)}>+</button>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                Total: ₦{(item.price * qty).toLocaleString()}
              </span>
            </div>
            <button
              className="btn-add-cart"
              onClick={handleAdd}
              style={added ? { background: 'var(--success)', transform: 'none' } : {}}
            >
              {added ? (
                <><i className="fas fa-check" /> Added!</>
              ) : (
                <><i className="fas fa-cart-plus" /> Add to Cart</>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function MenuPage() {
  const { state, dispatch } = useApp();
  const [category, setCategory] = useState<Category>('all');
  const [search, setSearch] = useState('');

  const categories = [
    { key: 'all', label: 'All Items', icon: '🍽️' },
    { key: 'breakfast', label: 'Breakfast', icon: '🌅' },
    { key: 'lunch', label: 'Lunch', icon: '☀️' },
    { key: 'dinner', label: 'Dinner', icon: '🌙' },
    { key: 'drinks', label: 'Drinks', icon: '🥤' },
  ];

  const filtered = state.menuItems.filter(item => {
    const matchCat = category === 'all' || item.category === category;
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="page-transition" style={{ paddingTop: '70px' }}>
      {/* Page Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--dark-2), var(--dark-3))',
        borderBottom: '1px solid rgba(200,155,60,0.1)',
        padding: '3rem 2rem 2rem',
        textAlign: 'center',
      }}>
        <div className="section-tag" style={{ marginBottom: '1rem' }}>Explore Our</div>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Full <span style={{ color: 'var(--gold)' }}>Menu</span>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Fresh ingredients, authentic flavours, made with love</p>

        {/* Search */}
        <div className="search-input" style={{ maxWidth: '400px', margin: '1.5rem auto 0' }}>
          <i className="fas fa-search search-icon" />
          <input
            type="text"
            className="form-control"
            placeholder="Search meals..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div style={{ padding: '2rem', maxWidth: '1300px', margin: '0 auto' }}>
        {/* Category Tabs */}
        <div className="menu-tabs">
          {categories.map(c => (
            <button
              key={c.key}
              className={`menu-tab ${category === c.key ? 'active' : ''}`}
              onClick={() => setCategory(c.key as Category)}
            >
              <span>{c.icon}</span>
              {c.label}
              <span style={{
                background: category === c.key ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                padding: '1px 8px', borderRadius: '10px', fontSize: '0.75rem',
              }}>
                {c.key === 'all' ? state.menuItems.length : state.menuItems.filter(m => m.category === c.key).length}
              </span>
            </button>
          ))}
        </div>

        {/* Category Hero Images */}
        {category !== 'all' && (
          <div className="category-hero" style={{ marginBottom: '2rem' }}>
            <img
              src={category === 'breakfast' ? '/food-breakfast.jpg' : category === 'lunch' ? '/food-rice.jpg' : category === 'dinner' ? '/food-dinner.jpg' : '/food-drinks.jpg'}
              alt={category}
            />
            <div className="category-hero-overlay">
              <div>
                <div style={{ color: 'var(--gold)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>
                  {categories.find(c => c.key === category)?.icon} {category}
                </div>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.8rem', fontWeight: 800, marginTop: '4px' }}>
                  {filtered.length} Delicious Options
                </h2>
              </div>
            </div>
          </div>
        )}

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p>No meals found matching your search</p>
          </div>
        ) : (
          <div className="menu-grid">
            {filtered.map(item => (
              <FoodCard
                key={item.id}
                item={item}
                onAdd={() => dispatch({ type: 'ADD_TO_CART', payload: item })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

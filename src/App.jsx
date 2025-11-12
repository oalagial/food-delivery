import { useState } from 'react'
import './App.css'

function DeliveryPointCard({ point, onSelect }) {
  return (
    <div className="delivery-card">
      <img
        className="delivery-image"
        src={point.image}
        alt={point.name}
      />
      <div className="delivery-info">
        <div className="delivery-name">{point.name}</div>
      </div>
      <div className="delivery-action">
        <button className="select-button" onClick={() => onSelect(point)}>
          Choose
        </button>
      </div>
    </div>
  )
}

function App() {
  // sample delivery points; replace or extend with real data later
  const [points] = useState([
    {
      id: 'aldo',
      name: 'ALDO',
      image:
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=400&auto=format&fit=crop&crop=faces',
    },
    {
      id: 'marina',
      name: 'Marina Point',
      image:
        'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=400&auto=format&fit=crop',
    },
  ])

  const [selectedPoint, setSelectedPoint] = useState(null)
  const [activeCategory, setActiveCategory] = useState(null)

  function handleSelect(point) {
    setSelectedPoint(point)
    // default active category will be the first one when store opens
    setActiveCategory(null)
  }

  function handleBack() {
    setSelectedPoint(null)
  }

  // simple sample product data grouped by categories
  const sampleMenu = {
    'Special Offers': [
      {
        id: 'rinfrescati',
        name: 'RINFRESCATI E CUNZATI',
        price: '€ 14.50',
        desc: '1 Salad of your choice between Mediterranean or Sicilian - 1 Aperol Spritz - 1 Water of your choice between still or sparkling',
        image:
          'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=200&auto=format&fit=crop',
      },
      {
        id: 'sunday',
        name: 'SUNDAY MENU',
        price: '€ 10.00',
        desc: '1 Caprese Sandwich - 1 Cunzato Sandwich - 1 liter of House Wine',
        image:
          'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=200&auto=format&fit=crop',
      },
    ],
    Novelty: [
      {
        id: 'porchettino',
        name: 'PORCHETTINO',
        price: '€ 10.00',
        desc: 'Red Tuna Porchetta, Lemon Mayonnaise, Salad and Tomato.',
        image:
          'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=200&auto=format&fit=crop',
      },
    ],
    'Traditional Sandwiches': [
      {
        id: 'caprese',
        name: 'CAPRESE',
        price: '€ 4.00',
        desc: 'Tomato, mozzarella, basil and EVO oil.',
        image:
          'https://images.unsplash.com/photo-1546069901-eacef0df6022?q=80&w=200&auto=format&fit=crop',
      },
    ],
  }

  const categories = Object.keys(sampleMenu)

  if (selectedPoint) {
    return (
      <StorePage
        point={selectedPoint}
        menu={sampleMenu}
        categories={categories}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        onBack={handleBack}
      />
    )
  }

  return (
    <main className="home-root">
      <header className="brand">
        {/* if you have a logo image, swap it here */}
        <h1 className="title">Choose your delivery point and start ordering!</h1>
      </header>

      <section className="delivery-list">
        {points.map((p) => (
          <DeliveryPointCard key={p.id} point={p} onSelect={handleSelect} />
        ))}
      </section>
    </main>
  )
}

function StorePage({ point, menu, categories, activeCategory, setActiveCategory, onBack }) {
  // if no active category, default to first
  const currentCategory = activeCategory || categories[0]

  return (
    <div className="store-root">
      <div className="store-header">
        <button className="back-button" onClick={onBack}>&larr;</button>
        <div className="store-title">{point.name}</div>
      </div>

      <div className="store-banner">Free Delivery Over € 10.00<br />Choose the Delivery Time at Checkout</div>

      <div className="store-tabs">
        <button className="tab active">Food</button>
        <button className="tab">Drinks</button>
      </div>

      <div className="category-scroll">
        {categories.map((c) => (
          <button
            key={c}
            className={`category-pill ${c === currentCategory ? 'active' : ''}`}
            onClick={() => setActiveCategory(c)}
          >
            {c.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="category-section">
        <h3 className="category-heading">{currentCategory.toUpperCase()}</h3>

        <div className="products-list">
          {menu[currentCategory].map((item) => (
            <div className="product-row" key={item.id}>
              <div className="product-info">
                <div className="product-badges">
                  {/* sample badges */}
                  <span className="badge">New</span>
                </div>
                <div className="product-name">{item.name}</div>
                <div className="product-price">{item.price}</div>
                <div className="product-desc">{item.desc}</div>
              </div>
              <div className="product-action">
                <img src={item.image} alt={item.name} className="product-image" />
                <button className="add-button">+</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App

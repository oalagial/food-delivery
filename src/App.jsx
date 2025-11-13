import { useState } from 'react'

function DeliveryPointCard({ point, onSelect }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border border-orange-200 bg-white">
      <img className="w-18 h-18 rounded-md object-cover" src={point.image} alt={point.name} />
      <div className="flex-1 text-left">
        <div className="font-semibold text-lg">{point.name}</div>
      </div>
      <div className="text-right">
        <button
          onClick={() => onSelect(point)}
          className="px-4 py-2 bg-orange-500 text-white rounded-md font-semibold hover:bg-orange-600"
        >
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
    <main className="max-w-3xl mx-auto p-6 text-center">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Choose your delivery point and start ordering!</h1>
      </header>

      <section className="flex flex-col gap-4">
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
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center bg-blue-500 text-white p-3">
        <button onClick={onBack} className="mr-4 text-2xl">←</button>
        <div className="ml-auto font-bold">{point.name}</div>
      </div>

      <div className="bg-sky-200 text-sky-900 p-3 text-center">Free Delivery Over € 10.00<br />Choose the Delivery Time at Checkout</div>

      <div className="flex gap-3 p-3">
        <button className="px-3 py-1 rounded-full border-b-2 border-orange-500 font-semibold">Food</button>
        <button className="px-3 py-1 rounded-full text-slate-600">Drinks</button>
      </div>

      <div className="flex gap-3 overflow-x-auto p-3">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`px-4 py-1 rounded-full ${c === currentCategory ? 'bg-blue-400 text-white' : 'bg-white border'}`}
          >
            {c}
          </button>
        ))}
      </div>

      <h3 className="bg-blue-500 text-white p-3 mt-4">{currentCategory.toUpperCase()}</h3>

      <div className="p-3 space-y-4">
        {menu[currentCategory].map((item) => (
          <div key={item.id} className="flex justify-between items-start gap-4 border-b pb-3">
            <div className="flex-1 text-left">
              <div className="text-lg font-bold">{item.name}</div>
              <div className="text-sm font-semibold mt-1">{item.price}</div>
              <div className="text-sm text-slate-600 mt-1">{item.desc}</div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-md" />
              <button className="w-9 h-9 rounded-full bg-orange-500 text-white font-bold">+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App

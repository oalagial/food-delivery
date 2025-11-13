import { useState } from 'react'

function DeliveryPointCard({ point, onSelect }) {
  return (
    <div className="flex items-center gap-4 p-4 lg:p-6 rounded-lg border border-gray-200 bg-white w-full">
      <img className="w-20 h-20 lg:w-32 lg:h-32 rounded-md object-cover" src={point.image} alt={point.name} />
      <div className="flex-1 text-left">
        <div className="font-semibold text-lg lg:text-2xl">{point.name}</div>
      </div>
      <div className="text-right">
        <button
          onClick={() => onSelect(point)}
          className="px-4 py-2 lg:px-6 lg:py-3 bg-gray-500 text-white rounded-md font-semibold hover:bg-gray-600 lg:text-lg"
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
    Drinks: [
      {
        id: 'aperol_spritz',
        name: 'APEROL SPRITZ',
        price: '€ 7.00',
        desc: 'Aperol, Prosecco, Tonic Water.',
        image:
          'https://plus.unsplash.com/premium_photo-1661454443043-36b5c6b66e62?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        id: 'limoncello_spritz',
        name: 'LIMONCELLO SPRITZ',
        price: '€ 8.00',
        desc: 'Limoncello, Prosecco, Tonic Water.',
        image:
          'https://images.unsplash.com/photo-1709195658489-5a14884e307d?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8TElNT05DRUxMTyUyMFNQUklUWnxlbnwwfHwwfHx8MA%3D%3D',
      },
      {
        id: 'gin_tonic',
        name: 'GIN TONIC',
        price: '€ 8.00',
        desc: 'Gin (U Gin), Tonic Water.',
        image:
          'https://plus.unsplash.com/premium_photo-1661344277834-bde1f854ec10?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        id: 'gin_lemon',
        name: 'GIN LEMON',
        price: '€ 8.00',
        desc: 'Gin (U Gin), Lemon Soda.',
        image:
          'https://images.unsplash.com/photo-1617524455170-ca63c7f0d472?q=80&w=772&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
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
    <main className="min-h-screen flex items-center justify-center p-6 lg:p-12">
      <div className="max-w-3xl lg:max-w-5xl w-full">
        <header className="mb-6">
          <h1 className="text-2xl lg:text-4xl font-semibold">Choose your delivery point and start ordering!</h1>
        </header>

        <section className="flex flex-col gap-4">
          {points.map((p) => (
            <DeliveryPointCard key={p.id} point={p} onSelect={handleSelect} />
          ))}
        </section>
      </div>
    </main>
  )
}

function StorePage({ point, menu, categories, activeCategory, setActiveCategory, onBack }) {
  // Tab state: 'Food' or 'Drinks'
  const [tab, setTab] = useState('Food')

  // split categories by tab
  const foodCategories = categories.filter((c) => c.toLowerCase() !== 'drinks')
  const drinkCategories = categories.filter((c) => c.toLowerCase() === 'drinks')
  const displayedCategories = tab === 'Food' ? foodCategories : drinkCategories

  // if no active category, default to first of currently displayed categories
  const currentCategory = activeCategory || displayedCategories[0]

  return (
    <div className="w-full h-screen bg-slate-50">
      <div className="mx-auto flex flex-col h-full">
        <div className="flex items-center bg-blue-500 text-white p-3 lg:p-4 sticky top-0 z-20">
          <button onClick={onBack} className="mr-4 text-2xl lg:text-3xl">←</button>
          <div className="ml-auto font-bold lg:text-2xl">{point.name}</div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="bg-sky-200 text-sky-900 p-3 text-center lg:p-4 lg:text-lg">Free Delivery Over € 10.00<br />Choose the Delivery Time at Checkout</div>

          <div className="flex gap-3 p-3 lg:p-4">
            <button
              onClick={() => {
                setTab('Food')
                setActiveCategory(null)
              }}
              className={`px-3 py-1 lg:px-4 lg:py-2 rounded-full ${tab === 'Food' ? 'border-b-2 border-gray-500 font-semibold' : 'text-slate-600'}`}
            >
              Food
            </button>
            <button
              onClick={() => {
                setTab('Drinks')
                setActiveCategory(null)
              }}
              className={`px-3 py-1 lg:px-4 lg:py-2 rounded-full ${tab === 'Drinks' ? 'border-b-2 border-gray-500 font-semibold' : 'text-slate-600'}`}
            >
              Drinks
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto p-3 lg:p-4">
            {displayedCategories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`px-4 py-1 lg:px-6 lg:py-2 rounded-full ${c === currentCategory ? 'bg-blue-400 text-white' : 'bg-white border'}`}
              >
                {c}
              </button>
            ))}
          </div>

          <h3 className="bg-blue-500 text-white p-3 mt-4 lg:p-4 lg:text-xl">{currentCategory.toUpperCase()}</h3>

          <div className="p-3 lg:p-6 space-y-4 pb-8">
            {menu[currentCategory].map((item) => (
              <div key={item.id} className="flex items-start items-center gap-4 lg:gap-6 border-b pb-3 lg:pb-4">
                 <div className="flex flex-col items-center gap-2">
                  <img src={item.image} alt={item.name} className="w-20 h-20 lg:w-50 lg:h-50 object-cover rounded-md" />
                </div>
                <div className="text-left">
                  <div className="text-lg lg:text-xl font-bold">{item.name}</div>
                  <div className="text-sm lg:text-base font-semibold mt-1">{item.price}</div>
                  <div className="text-sm lg:text-base text-slate-600 mt-1">{item.desc}</div>
                </div>
                <div>
                   <button className="w-6 h-6 lg:w-10 lg:h-10 rounded-full bg-gray-500 text-white font-bold lg:text-xl">+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

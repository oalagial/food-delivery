import { useState } from 'react'
import ProductDetail from './ProductDetail'

export default function StorePage({ point, menu, categories, activeCategory, setActiveCategory, onBack, addToCart }) {
  const [tab, setTab] = useState('Food')
  const [selectedProductDetail, setSelectedProductDetail] = useState(null)
  const foodCategories = categories.filter((c) => c.toLowerCase() !== 'drinks')
  const drinkCategories = categories.filter((c) => c.toLowerCase() === 'drinks')
  const displayedCategories = tab === 'Food' ? foodCategories : drinkCategories
  const currentCategory = activeCategory || displayedCategories[0]
  const [animatingCategory, setAnimatingCategory] = useState(false)

  function handleCategoryClick(c) {
    setAnimatingCategory(true)
    setTimeout(() => {
      setActiveCategory(c)
      setAnimatingCategory(false)
    }, 160)
  }

  function handleTabChange(t) {
    setTab(t)
    setAnimatingCategory(true)
    setTimeout(() => {
      setActiveCategory(null)
      setAnimatingCategory(false)
    }, 160)
  }

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
              onClick={() => handleTabChange('Food')}
              className={`px-3 py-1 lg:px-4 lg:py-2 rounded-full ${tab === 'Food' ? 'border-b-2 border-gray-500 font-semibold' : 'text-slate-600'}`}
            >
              Food
            </button>
            <button
              onClick={() => handleTabChange('Drinks')}
              className={`px-3 py-1 lg:px-4 lg:py-2 rounded-full ${tab === 'Drinks' ? 'border-b-2 border-gray-500 font-semibold' : 'text-slate-600'}`}
            >
              Drinks
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto p-3 lg:p-4">
            {displayedCategories.map((c) => (
              <button
                key={c}
                onClick={() => handleCategoryClick(c)}
                className={`px-4 py-1 lg:px-6 lg:py-2 rounded-full ${c === currentCategory ? 'bg-blue-400 text-white' : 'bg-white border'}`}
              >
                {c}
              </button>
            ))}
          </div>

          <h3 className="bg-blue-500 text-white p-3 mt-4 lg:p-4 lg:text-xl">{currentCategory?.toUpperCase()}</h3>

          <div className={`p-3 lg:p-6 space-y-4 pb-8 transition-all duration-200 ${animatingCategory ? 'opacity-50 translate-y-2' : 'opacity-100 translate-y-0'}`}>
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
                  <button
                    onClick={() => setSelectedProductDetail(item)}
                    className="w-6 h-6 lg:w-10 lg:h-10 rounded-full bg-gray-500 text-white font-bold lg:text-xl"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          {selectedProductDetail && (
            <ProductDetail
              key={selectedProductDetail.id}
              product={selectedProductDetail}
              onClose={() => setSelectedProductDetail(null)}
              onAdd={(item) => {
                addToCart(item)
                setSelectedProductDetail(null)
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

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
        <div className="flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 lg:p-5 sticky top-0 z-20 shadow-lg">
          <button onClick={onBack} className="mr-4 text-3xl lg:text-4xl hover:scale-110 transition-transform">←</button>
          <div className="ml-auto font-bold text-xl lg:text-3xl tracking-wide">🏪 {point.name}</div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="bg-gradient-to-r from-sky-400 text-white p-5 text-center lg:p-6 text-lg lg:text-xl font-bold shadow-md">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-2xl">🚚</span>
              <span>Free Delivery Over € 10.00</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-base lg:text-lg font-semibold">
              <span className="text-xl">⏰</span>
              <span>Choose the Delivery Time at Checkout</span>
            </div>
          </div>

          <div className="flex gap-4 p-4 lg:p-6">
            <button
              onClick={() => handleTabChange('Food')}
              className={`px-8 py-3 lg:px-12 lg:py-4 rounded-full text-lg lg:text-2xl font-bold transition-all duration-300 ${
                tab === 'Food' 
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg transform scale-105' 
                  : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-orange-300 hover:shadow-md'
              }`}
            >
              🍔 Food
            </button>
            <button
              onClick={() => handleTabChange('Drinks')}
              className={`px-8 py-3 lg:px-12 lg:py-4 rounded-full text-lg lg:text-2xl font-bold transition-all duration-300 ${
                tab === 'Drinks' 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105' 
                  : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-blue-300 hover:shadow-md'
              }`}
            >
              🍹 Drinks
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto p-4 lg:p-5">
            {displayedCategories.map((c) => (
              <button
                key={c}
                onClick={() => handleCategoryClick(c)}
                className={`px-6 py-2 lg:px-8 lg:py-3 rounded-full text-base lg:text-xl font-semibold transition-all duration-300 whitespace-nowrap ${
                  c === currentCategory 
                    ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-md transform scale-105' 
                    : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="px-4 lg:px-7 py-3">
            <div className="h-1 bg-gradient-to-r from-white via-blue-500 to-transparent rounded-full"></div>
          </div>

          <div className={`p-4 lg:p-7 space-y-5 pb-10 transition-all duration-200 ${animatingCategory ? 'opacity-50 translate-y-2' : 'opacity-100 translate-y-0'}`}>
            {menu[currentCategory].map((item) => (
              <div key={item.id} className="flex items-start items-center gap-4 lg:gap-6 border-b pb-3 lg:pb-4">
                <div className="flex flex-col items-center gap-2">
                  <img src={item.image} alt={item.name} className="w-20 h-20 lg:w-50 lg:h-50 object-cover rounded-md" />
                </div>
                <div className="text-left">
                  <div className="text-xl lg:text-2xl font-bold">{item.name}</div>
                  <div className="text-base lg:text-lg font-semibold mt-2">{item.price}</div>
                  <div className="text-base lg:text-lg text-slate-600 mt-2 leading-relaxed">{item.desc}</div>
                </div>
                <div>
                  <button
                    onClick={() => setSelectedProductDetail(item)}
                    className="pb-1 w-10 h-10 lg:w-14 lg:h-14 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-white font-bold text-2xl lg:text-3xl shadow-lg hover:shadow-xl hover:from-orange-600 hover:to-amber-700 transform hover:scale-110 transition-all duration-300 active:scale-95 flex items-center justify-center"
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

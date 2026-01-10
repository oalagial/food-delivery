import { useState, useRef, useEffect } from 'react'
import ProductDetail from './ProductDetail'

export default function StorePage({ point, menu, categories, activeCategory, setActiveCategory, onBack, addToCart }) {
  const [selectedProductDetail, setSelectedProductDetail] = useState(null)
  const categoryRefs = useRef({})
  const productsContainerRef = useRef(null)
  const [visibleCategory, setVisibleCategory] = useState(categories[0])

  // Detect which category is in view as user scrolls
  const handleProductsScroll = () => {
    if (!productsContainerRef.current) return
    
    const scrollPos = productsContainerRef.current.scrollTop
    let currentVisible = categories[0]
    
    Object.entries(categoryRefs.current).forEach(([category, ref]) => {
      if (ref && ref.offsetTop <= scrollPos + 80) {
        currentVisible = category
      }
    })
    
    setVisibleCategory(currentVisible)
    setActiveCategory(currentVisible)
  }

  // Scroll to category when clicked
  const scrollToCategory = (category) => {
    setVisibleCategory(category)
    setActiveCategory(category)
    if (categoryRefs.current[category] && productsContainerRef.current) {
      const element = categoryRefs.current[category]
      const scrollTop = element.offsetTop - 20
      productsContainerRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' })
    }
  }

  return (
    <div className="w-full h-screen bg-slate-50 flex flex-col">
      <div className="flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 lg:p-5 z-20 shadow-lg">
        <button onClick={onBack} className="mr-4 text-4xl hover:scale-110 transition-transform">←</button>
        <div className="ml-auto font-bold text-xl lg:text-3xl tracking-wide">🏪 {point.name}</div>
      </div>

      <div className="bg-gradient-to-r from-sky-400 to-blue-500 text-white p-5 text-center lg:p-6 text-lg lg:text-xl font-bold shadow-md">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-2xl">🚚</span>
          <span>Free Delivery Over € 10.00</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-base lg:text-lg font-semibold">
          <span className="text-xl">⏰</span>
          <span>Choose the Delivery Time at Checkout</span>
        </div>
      </div>

      {/* All Categories in One Row */}
      <div className="flex gap-3 overflow-x-auto p-4 lg:p-5 bg-white shadow-sm z-10">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => scrollToCategory(c)}
            className={`px-6 py-2 lg:px-8 lg:py-3 rounded-full text-base lg:text-xl font-semibold transition-all duration-300 whitespace-nowrap ${
              visibleCategory === c
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md transform scale-105' 
                : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-orange-300 hover:shadow-sm'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* All Products in One Scrollable List */}
      <div 
        ref={productsContainerRef}
        onScroll={handleProductsScroll}
        className="flex-1 p-4 lg:p-7 space-y-5 pb-10 overflow-y-auto"
      >
            {categories.map((category) => (
              <div key={category}>
                {/* Category marker - placed before first item */}
                <div className="px-4 lg:px-7 py-3">
                  <div className="h-1 bg-gradient-to-r from-white via-blue-500 to-transparent rounded-full"></div>
                </div>

                {menu[category] && menu[category].map((item, index) => (
                  <div 
                    key={item.id}
                    ref={(el) => {
                      if (index === 0 && el) {
                        categoryRefs.current[category] = el
                      }
                    }}
                    className="flex items-start items-center gap-4 lg:gap-6 border-b pb-3 lg:pb-4"
                  >
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
            ))}

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
  )
}

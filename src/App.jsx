import { useState, useEffect, useRef } from 'react'
import DeliveryPointCard from './components/DeliveryPointCard'
import StorePage from './components/StorePage'
import CartPanel from './components/CartPanel'
import CheckoutPage from './components/CheckoutPage'
import AlertDialog from './components/AlertDialog'
import { AlertProvider, useAlert } from './context/AlertContext'
import { restaurantService, orderService, deliveryLocationService } from './services'
import { initializeAuth } from './services/authInit'

function AppContent() {
  const { alert, closeAlert, showAlert } = useAlert()
  const [points, setPoints] = useState([])
  const [loading, setLoading] = useState(true)
  const [authInitialized, setAuthInitialized] = useState(false)

  const [selectedPoint, setSelectedPoint] = useState(null)
  const [restaurants, setRestaurants] = useState([])
  const [restaurantLoading, setRestaurantLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState(null)

  // Initialize auth and fetch delivery locations on mount
  useEffect(() => {
    const initAndFetch = async () => {
      try {
        setLoading(true)
        // Initialize authentication
        const authResult = await initializeAuth()
        setAuthInitialized(authResult.authenticated)
        // Fetch delivery locations
        const data = await deliveryLocationService.getAll()
        // If paginated, use data.data, else use data
        setPoints(Array.isArray(data) ? data : data.data || [])
      } catch (error) {
        console.error('Failed to fetch delivery locations:', error)
        const errorMessage = error.response?.data?.message || 'Failed to load delivery locations. Please check your connection and try again.'
        showAlert('error', 'Loading Error', errorMessage, 5000)
      } finally {
        setLoading(false)
      }
    }
    initAndFetch()
  }, [showAlert])

  // cart persisted in localStorage
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cart')) || []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cart))
    } catch {
      /* ignore */
    }
  }, [cart])

  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [cartBump, setCartBump] = useState(false)
  const [lastAddedKey, setLastAddedKey] = useState(null)
  const bumpTimerRef = useRef(null)

  function addToCart(item) {
    const key = `${item.id}::${JSON.stringify(item.options || {})}`
    setCart((prev) => {
      const idx = prev.findIndex((ci) => ci.key === key)
      if (idx !== -1) {
        const copy = [...prev]
        copy[idx].qty += item.qty
        copy[idx].total = copy[idx].qty * copy[idx].price
        return copy
      }
      const cartItem = {
        key,
        id: item.id,
        name: item.name,
        price: item.price,
        qty: item.qty,
        options: item.options || {},
        total: item.price * item.qty,
      }
      return [...prev, cartItem]
    })

    try {
      if (bumpTimerRef.current) clearTimeout(bumpTimerRef.current)
    } catch {
      /* ignore */
    }
    setLastAddedKey(key)
    setCartBump(true)
    bumpTimerRef.current = setTimeout(() => {
      setCartBump(false)
      setLastAddedKey(null)
    }, 700)
  }

  function updateCartItem(key, qty) {
    setCart((prev) => {
      const copy = prev.map((ci) => (ci.key === key ? { ...ci, qty, total: ci.price * qty } : ci))
      return copy.filter((ci) => ci.qty > 0)
    })
  }

  function removeCartItem(key) {
    setCart((prev) => prev.filter((ci) => ci.key !== key))
  }

  function cartCount() {
    return cart.reduce((s, it) => s + (it.qty || 0), 0)
  }

  function cartTotal() {
    return cart.reduce((s, it) => s + (it.total || 0), 0)
  }

  useEffect(() => {
    return () => {
      try {
        if (bumpTimerRef.current) clearTimeout(bumpTimerRef.current)
      } catch {
        /* ignore */
      }
    }
  }, [])

  const [fetchedMenu, setFetchedMenu] = useState(null)
  const [menuLoading, setMenuLoading] = useState(false)

  async function fetchRestaurantMenu(restaurantId) {
    setMenuLoading(true)
    setFetchedMenu(null)
    try {
      const API_BASE = import.meta.env.VITE_API_BASE
      const response = await fetch(`${API_BASE}/public/restaurants?id=${restaurantId}`)
      if (!response.ok) throw new Error('Failed to fetch menu')
      const menuData = await response.json()
      // Expecting menuData to have .data[0].menu
      setFetchedMenu(menuData)
    } catch (err) {
      setFetchedMenu({ error: err.message })
    } finally {
      setMenuLoading(false)
    }
  }

  function handleSelect(point) {
    setSelectedPoint(point)
    setActiveCategory(null)
    // deliveredBy is now an array of restaurants
    if (Array.isArray(point.deliveredBy)) {
      if (point.deliveredBy.length === 1) {
        // Only one restaurant, go directly to StorePage
        setRestaurants([])
        setSelectedRestaurant(point.deliveredBy[0])
        fetchRestaurantMenu(point.deliveredBy[0].id)
      } else {
        // Multiple restaurants, show selection
        setRestaurants(point.deliveredBy)
        setSelectedRestaurant(null)
      }
    } else {
      // Fallback: no deliveredBy or not array
      setRestaurants([])
      setSelectedRestaurant(null)
    }
  }
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)

  function handleBack() {
    setSelectedPoint(null)
  }

  const sampleMenu = {
     'Special Offers': [
      {
        id: 'lunch_combo',
        name: 'Lunch Combo',
        price: '€ 14.50',
        desc: '1 Salad (choice), 1 Aperol Spritz (small), 1 Water',
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=200&auto=format&fit=crop',
        optionGroups: [
          {
            id: 'salad',
            title: 'Salad Choice',
            required: true,
            choices: [
              { id: 'mediterranean', label: 'Mediterranean', price: 0 },
              { id: 'caesar', label: 'Caesar', price: 0 },
            ],
          },
          {
            id: 'drink_choice',
            title: 'Small Drink',
            required: true,
            choices: [
              { id: 'aperol', label: 'Aperol Spritz (small)', price: 0 },
              { id: 'water', label: 'Water (still)', price: 0 },
            ],
          },
        ],
      },
      {
        id: 'sunday_menu',
        name: 'Sunday Menu',
        price: '€ 10.00',
        desc: 'Caprese sandwich + Cunzato sandwich + 1L house wine (choose type)',
        image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=200&auto=format&fit=crop',
        optionGroups: [
          {
            id: 'wine',
            title: 'House Wine',
            required: true,
            choices: [
              { id: 'white', label: 'White (Grillo)', price: 0 },
              { id: 'red', label: 'Red (Nero d’Avola)', price: 0 },
            ],
          },
        ],
      },
    ],
    Burgers: [
      {
        id: 'classic_burger',
        name: 'Classic Burger',
        price: '€ 8.50',
        desc: 'Beef patty, lettuce, tomato, house sauce',
        image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=200&auto=format&fit=crop',
        optionGroups: [
          {
            id: 'cheese',
            title: 'Cheese',
            required: false,
            choices: [
              { id: 'no_cheese', label: 'No Cheese', price: 0 },
              { id: 'cheddar', label: 'Cheddar (+€0.50)', price: 0.5 },
              { id: 'swiss', label: 'Swiss (+€0.50)', price: 0.5 },
            ],
          },
          {
            id: 'extras',
            title: 'Extras',
            required: false,
            choices: [
              { id: 'bacon', label: 'Bacon (+€1.00)', price: 1.0 },
              { id: 'avocado', label: 'Avocado (+€1.50)', price: 1.5 },
            ],
          },
        ],
      },
      {
        id: 'cheeseburger',
        name: 'Cheeseburger',
        price: '€ 9.50',
        desc: 'Beef patty, double cheese, pickles, house sauce',
        image: 'https://images.unsplash.com/photo-1534790566855-4cb788d389ec?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8Q2hlZXNlYnVyZ2VyfGVufDB8fDB8fHww',
        optionGroups: [
          {
            id: 'cooking',
            title: 'Cooking Level',
            required: false,
            choices: [
              { id: 'rare', label: 'Rare', price: 0 },
              { id: 'medium', label: 'Medium', price: 0 },
              { id: 'well', label: 'Well Done', price: 0 },
            ],
          },
          {
            id: 'sides',
            title: 'Side',
            required: false,
            choices: [
              { id: 'fries', label: 'Fries (+€2.00)', price: 2.0 },
              { id: 'salad', label: 'Side Salad (+€2.50)', price: 2.5 },
            ],
          },
        ],
      },
      {
        id: 'veggie_burger',
        name: 'Veggie Burger',
        price: '€ 8.00',
        desc: 'Chickpea patty, lettuce, tomato, vegan mayo',
        image: 'https://images.unsplash.com/photo-1546069901-eacef0df6022?q=80&w=200&auto=format&fit=crop',
        optionGroups: [
          {
            id: 'bun',
            title: 'Bun Type',
            required: false,
            choices: [
              { id: 'regular', label: 'Regular', price: 0 },
              { id: 'gluten_free', label: 'Gluten Free (+€0.70)', price: 0.7 },
            ],
          },
        ],
      },
    ],
    Sandwiches: [
      {
        id: 'caprese_sandwich',
        name: 'Caprese Sandwich',
        price: '€ 4.00',
        desc: 'Tomato, mozzarella, basil, olive oil',
        image: 'https://images.unsplash.com/photo-1546069901-eacef0df6022?q=80&w=200&auto=format&fit=crop',
        optionGroups: [
          {
            id: 'bread',
            title: 'Bread Type',
            required: false,
            choices: [
              { id: 'ciabatta', label: 'Ciabatta', price: 0 },
              { id: 'sourdough', label: 'Sourdough (+€0.50)', price: 0.5 },
            ],
          },
        ],
      },
      {
        id: 'tuna_sandwich',
        name: 'Tuna Sandwich',
        price: '€ 5.00',
        desc: 'Tuna, lemon mayonnaise, lettuce, tomato',
        image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?q=80&w=200&auto=format&fit=crop',
        optionGroups: [
          {
            id: 'add_on',
            title: 'Add-ons',
            required: false,
            choices: [
              { id: 'olives', label: 'Olives (+€0.50)', price: 0.5 },
              { id: 'capers', label: 'Capers (+€0.50)', price: 0.5 },
            ],
          },
        ],
      },
      {
        id: 'cunzato_sandwich',
        name: 'Cunzato Sandwich',
        price: '€ 6.50',
        desc: 'Traditional local sandwich with marinated tuna and salad',
        image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=200&auto=format&fit=crop',
        optionGroups: [
          {
            id: 'size',
            title: 'Size',
            required: false,
            choices: [
              { id: 'regular', label: 'Regular', price: 0 },
              { id: 'large', label: 'Large (+€1.50)', price: 1.5 },
            ],
          },
        ],
      },
    ],
    Salads: [
      {
        id: 'med_salad',
        name: 'Mediterranean Salad',
        price: '€ 7.00',
        desc: 'Mixed greens, olives, tomato, cucumber, feta',
        image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=200&auto=format&fit=crop',
        optionGroups: [
          {
            id: 'protein',
            title: 'Add Protein',
            required: false,
            choices: [
              { id: 'chicken', label: 'Chicken (+€2.00)', price: 2.0 },
              { id: 'tuna', label: 'Tuna (+€2.00)', price: 2.0 },
              { id: 'none', label: 'No Protein', price: 0 },
            ],
          },
        ],
      },
      {
        id: 'caesar_salad',
        name: 'Caesar Salad',
        price: '€ 6.50',
        desc: 'Romaine, parmesan, croutons, caesar dressing',
        image: 'https://images.unsplash.com/photo-1546069901-eacef0df6022?q=80&w=200&auto=format&fit=crop',
        optionGroups: [
          {
            id: 'chicken',
            title: 'Add Chicken',
            required: false,
            choices: [
              { id: 'yes', label: 'Add Chicken (+€2.00)', price: 2.0 },
              { id: 'no', label: 'No', price: 0 },
            ],
          },
        ],
      },
    ],
    Drinks: [
      {
        id: 'aperol_spritz',
        name: 'Aperol Spritz',
        price: '€ 7.00',
        desc: 'Aperol, Prosecco, soda',
        image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=200&auto=format&fit=crop',
        optionGroups: [
          {
            id: 'size',
            title: 'Size',
            required: true,
            choices: [
              { id: 'small', label: 'Small', price: 0 },
              { id: 'regular', label: 'Regular (+€1.00)', price: 1.0 },
              { id: 'large', label: 'Large (+€2.00)', price: 2.0 },
            ],
          },
        ],
      },
      {
        id: 'limoncello_spritz',
        name: 'Limoncello Spritz',
        price: '€ 8.00',
        desc: 'Limoncello, prosecco, tonic',
        image: 'https://images.unsplash.com/photo-1656057088883-546495ba6945?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        optionGroups: [
          {
            id: 'size',
            title: 'Size',
            required: true,
            choices: [
              { id: 'regular', label: 'Regular', price: 0 },
              { id: 'large', label: 'Large (+€1.50)', price: 1.5 },
            ],
          },
        ],
      },
      {
        id: 'gin_tonic',
        name: 'Gin & Tonic',
        price: '€ 8.00',
        desc: 'Gin, tonic water, lime',
        image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=200&auto=format&fit=crop',
        optionGroups: [
          {
            id: 'gin',
            title: 'Gin Type',
            required: false,
            choices: [
              { id: 'classic', label: 'Classic', price: 0 },
              { id: 'premium', label: 'Premium (+€1.50)', price: 1.5 },
            ],
          },
        ],
      },
      {
        id: 'espresso',
        name: 'Espresso',
        price: '€ 1.80',
        desc: 'Freshly brewed espresso',
        image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=200&auto=format&fit=crop',
        optionGroups: [
          {
            id: 'milk',
            title: 'Milk Option',
            required: false,
            choices: [
              { id: 'none', label: 'No Milk', price: 0 },
              { id: 'milk', label: 'Regular Milk (+€0.30)', price: 0.3 },
              { id: 'oat', label: 'Oat Milk (+€0.50)', price: 0.5 },
            ],
          },
          {
            id: 'sugar',
            title: 'Sugar',
            required: false,
            choices: [
              { id: 'no', label: 'No Sugar', price: 0 },
              { id: 'one', label: '1 Cube', price: 0 },
              { id: 'two', label: '2 Cubes', price: 0 },
            ],
          },
        ],
      },
      {
        id: 'lemonade',
        name: 'Fresh Lemonade',
        price: '€ 3.50',
        desc: 'Freshly squeezed lemons, sugar, water',
        image: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?q=80&w=200&auto=format&fit=crop',
        optionGroups: [
          {
            id: 'sweetness',
            title: 'Sweetness',
            required: false,
            choices: [
              { id: 'regular', label: 'Regular', price: 0 },
              { id: 'less', label: 'Less Sugar', price: 0 },
              { id: 'no_sugar', label: 'No Sugar', price: 0 },
            ],
          },
        ],
      },
    ],
  }

  const categories = Object.keys(sampleMenu)

  function handleCheckout() {
    // close cart panel then open checkout page
    setCartOpen(false)
    setCheckoutOpen(true)
  }

  function handleConfirmOrder() {
    // Example: clear cart and close checkout - replace with real order flow
    setCart([])
    setCheckoutOpen(false)
    // optionally show a success toast / navigate away
  }

  if (selectedPoint) {
    if (selectedRestaurant) {
      // 
      // Show StorePage for the selected restaurant
      return (
        <>
         
          {/* Optionally, pass the fetched menu to StorePage or render the menu here */}
          {/* Example: Pass the first menu object to StorePage if needed */}
          {/* Transform menu sections to category-based object for StorePage */}
          {(() => {
            const menuObj = fetchedMenu?.data?.[0]?.menu?.[0]
            let menuByCategory = {}
            let categoriesArr = []
            if (menuObj && Array.isArray(menuObj.sections)) {
              categoriesArr = menuObj.sections.map(s => s.name)
              menuObj.sections.forEach(section => {
                menuByCategory[section.name] = section.products || []
              })
            }
            return (
              <StorePage
                point={selectedRestaurant}
                menu={menuByCategory}
                categories={categoriesArr}
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
                onBack={() => { setSelectedRestaurant(null); setRestaurants([]); setFetchedMenu(null); }}
                addToCart={addToCart}
              />
            )
          })()}

          <button
            onClick={() => setCartOpen(true)}
            aria-label="Open cart"
            className={`fixed right-4 bottom-4 lg:right-8 lg:bottom-8 bg-orange-500 text-white w-20 h-20 rounded-full shadow-lg flex items-center justify-center z-40 transform transition-transform duration-200 ${
              cartBump ? 'scale-110 ring-4 ring-orange-200/50' : ''
            }`}
          >
            <span className="text-4xl">🛒</span>
            <span className="sr-only">Cart</span>
            {cart.length > 0 && (
              <span className="absolute -top-4 -right-1 bg-white text-orange-500 w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold border-2 border-orange-500">
                <span className="font-bold text-lg">{cartCount()}</span>
              </span>
            )}
          </button>

          <CartPanel
            open={cartOpen}
            onClose={() => setCartOpen(false)}
            cart={cart}
            updateQty={updateCartItem}
            removeItem={removeCartItem}
            total={cartTotal()}
            lastAddedKey={lastAddedKey}
            onCheckout={handleCheckout}
          />

          {checkoutOpen && (
            <CheckoutPage
              point={selectedRestaurant}
              cart={cart}
              total={cartTotal()}
              onClose={() => setCheckoutOpen(false)}
              updateQty={updateCartItem}
              removeItem={removeCartItem}
              onConfirm={handleConfirmOrder}
            />
          )}
        </>
      )
    }
    // Show restaurant selection if multiple
    return (
      <>
        <div className="max-w-3xl lg:max-w-5xl w-full relative z-10 mx-auto">
          <header className="mb-8 lg:mb-12 text-center">
            <h2 className="text-2xl lg:text-4xl font-bold mb-4">Choose a Restaurant</h2>
            <p className="text-lg text-amber-900/80 font-semibold">Available for your selected delivery location.</p>
          </header>
          {restaurants.length > 0 ? (
            <section className="flex flex-col gap-5 lg:gap-6">
              {restaurants.map((r) => (
                <DeliveryPointCard key={r.id} point={r} onSelect={() => { setSelectedRestaurant(r); fetchRestaurantMenu(r.id); }} />
              ))}
            </section>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg lg:text-xl text-amber-900/80 font-semibold">No restaurants available for this location.</p>
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-6 lg:p-12 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-orange-200/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-200/30 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-200/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-3xl lg:max-w-5xl w-full relative z-10">
          <header className="mb-8 lg:mb-12 text-center">
            <div className="inline-block mb-4 lg:mb-6 animate-bounce">
              <span className="text-6xl lg:text-8xl drop-shadow-lg">🍽️</span>
            </div>
            <h1 className="text-3xl lg:text-5xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent mb-3 lg:mb-4 drop-shadow-sm">
              Choose Your Delivery Location
            </h1>
            <p className="text-lg lg:text-xl text-amber-900/80 font-semibold">Start ordering delicious food now! 🚀</p>
          </header>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin">
                <span className="text-5xl">⏳</span>
              </div>
              <span className="ml-4 text-lg font-semibold text-amber-900">Loading delivery locations...</span>
            </div>
          ) : points.length > 0 ? (
            <section className="flex flex-col gap-5 lg:gap-6">
              {points.map((p) => (
                <DeliveryPointCard key={p.id} point={p} onSelect={handleSelect} />
              ))}
            </section>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg lg:text-xl text-amber-900/80 font-semibold">No delivery locations available. Please try again later.</p>
            </div>
          )}
        </div>
      </main>

      <CartPanel open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} updateQty={updateCartItem} removeItem={removeCartItem} total={cartTotal()} lastAddedKey={lastAddedKey} />
    </>
  )
}

export default function App() {
  return (
    <AlertProvider>
      <AppWithAlert />
    </AlertProvider>
  )
}

function AppWithAlert() {
  const { alert, closeAlert } = useAlert()
  
  return (
    <>
      <AlertDialog
        type={alert.type}
        title={alert.title}
        message={alert.message}
        isOpen={alert.isOpen}
        onClose={closeAlert}
        autoCloseDuration={alert.duration}
      />
      <AppContent />
    </>
  )
}

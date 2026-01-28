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
    // For offers, include selectedGroups in the key
    // For products, include extraIds in the key so products with different extras are separate items
    let key
    if (item.isOffer) {
      const sortedGroups = (item.selectedGroups || []).slice().sort((a, b) => {
        if (a.groupId !== b.groupId) return a.groupId - b.groupId
        return a.selectedItemId - b.selectedItemId
      })
      key = `${item.id}::${JSON.stringify(sortedGroups)}`
    } else {
      const sortedExtraIds = (item.extraIds || []).slice().sort((a, b) => a - b)
      key = `${item.id}::${JSON.stringify(item.options || {})}::${JSON.stringify(sortedExtraIds)}`
    }
    
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
        extraIds: item.extraIds || [],
        extraNames: item.extraNames || [], // Store extra names for display
        isOffer: item.isOffer || false,
        offerId: item.offerId,
        selectedGroups: item.selectedGroups || [],
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
    console.log('menuData', menuData)
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
    setRestaurants([])
    setSelectedRestaurant(null)
    setFetchedMenu(null)
    setActiveCategory(null)
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
          {menuLoading ? (
            <div className="w-full h-screen bg-slate-50 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin mb-4">
                  <span className="text-5xl">⏳</span>
                </div>
                <p className="text-lg font-semibold text-slate-700">Loading menu...</p>
              </div>
            </div>
          ) : fetchedMenu?.error ? (
            <div className="w-full h-screen bg-slate-50 flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-semibold text-red-600 mb-4">Error loading menu</p>
                <p className="text-base text-slate-600 mb-4">{fetchedMenu.error}</p>
                <button
                  onClick={() => {
                    // If there are multiple restaurants, go back to restaurant selection
                    // Otherwise, go back to location selection
                    if (restaurants.length > 0) {
                      setSelectedRestaurant(null)
                      setFetchedMenu(null)
                    } else {
                      // Go back to location selection
                      setSelectedPoint(null)
                      setRestaurants([])
                      setSelectedRestaurant(null)
                      setFetchedMenu(null)
                      setActiveCategory(null)
                    }
                  }}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  Go Back
                </button>
              </div>
            </div>
          ) : (
            /* Transform menu sections to category-based object for StorePage */
            (() => {
              const API_BASE = import.meta.env.VITE_API_BASE
              const menuObj = fetchedMenu?.data?.[0]?.menu
              let menuByCategory = {}
              let categoriesArr = []
              let offers = []
              
              // Extract and transform offers
              if (menuObj && Array.isArray(menuObj.offers)) {
                offers = menuObj.offers
                  .filter(offer => offer.isActive && !offer.deletedAt)
                  .map(offer => {
                    // Transform offer groups and products
                    const transformedGroups = (offer.groups || []).map(group => ({
                      id: group.id,
                      name: group.name,
                      minItems: group.minItems || 1,
                      maxItems: group.maxItems || 1,
                      offerGroupProducts: (group.offerGroupProducts || []).map(ogp => ({
                        id: ogp.id,
                        product: ogp.product,
                      })),
                    }))
                    
                    // Construct image URL
                    let imageUrl = offer.image
                    if (imageUrl && !imageUrl.startsWith('http')) {
                      imageUrl = `${API_BASE}/images/${imageUrl}`
                    }
                    
                    return {
                      id: offer.id,
                      name: offer.name,
                      description: offer.description || '',
                      price: offer.price || '0',
                      image: imageUrl || null,
                      groups: transformedGroups,
                    }
                  })
              }
              
              if (menuObj && Array.isArray(menuObj.sections)) {
                categoriesArr = menuObj.sections.map(s => s.name)
                
                menuObj.sections.forEach(section => {
                  // Transform products from API format to component format
                  const transformedProducts = (section.products || [])
                    .filter(product => {
                      // Filter out only deleted products; keep inactive/unavailable so they show as closed
                      return !product.deletedAt
                    })
                    .map(product => {
                      // Use priceAfterDiscount if available, otherwise use price
                      const priceValue = product.priceAfterDiscount || product.price
                      const priceNum = parseFloat(priceValue) || 0
                      const formattedPrice = `€ ${priceNum.toFixed(2)}`
                      
                      // Construct image URL if it's just a filename
                      let imageUrl = product.image
                      if (imageUrl && !imageUrl.startsWith('http')) {
                        // If it's a filename, construct full URL
                        imageUrl = `${API_BASE}/images/${imageUrl}`
                      }
                      
                      // Transform extras to optionGroups format
                      const optionGroups = []
                      if (product.extras && product.extras.length > 0) {
                        // Filter out deleted extras
                        const activeExtras = product.extras.filter(extra => !extra.deletedAt && extra.isActive !== false)
                        if (activeExtras.length > 0) {
                          optionGroups.push({
                            id: 'extras',
                            title: 'Extras',
                            required: false,
                            choices: activeExtras.map(extra => ({
                              id: `extra_${extra.id}`,
                              label: extra.name,
                              price: parseFloat(extra.price) || 0,
                            })),
                          })
                        }
                      }
                      
                      // Check if product has active discount
                      const hasActiveDiscount = product.discount && product.discount.length > 0 && 
                        product.discount.some(d => {
                          if (!d.isActive || d.deletedAt) return false
                          const now = new Date()
                          const startsAt = d.startsAt ? new Date(d.startsAt) : null
                          const endsAt = d.endsAt ? new Date(d.endsAt) : null
                          if (startsAt && now < startsAt) return false
                          if (endsAt && now > endsAt) return false
                          return true
                        })
                      
                      // Check if product is new (created within last 30 days)
                      const isNew = product.createdAt ? (() => {
                        const createdAt = new Date(product.createdAt)
                        const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
                        return daysSinceCreation <= 30
                      })() : false
                      
                      return {
                        id: product.id,
                        name: product.name,
                        desc: product.description || '',
                        price: formattedPrice,
                        image: imageUrl || 'https://via.placeholder.com/200',
                        optionGroups,
                        hasDiscount: hasActiveDiscount,
                        isNew,
                        // Keep original data for reference
                        _original: product,
                      }
                    })
                  
                  menuByCategory[section.name] = transformedProducts
                })
              }
              
              return (
                <StorePage
                  point={selectedRestaurant}
                  menu={menuByCategory}
                  categories={categoriesArr}
                  offers={offers}
                  activeCategory={activeCategory}
                  setActiveCategory={setActiveCategory}
                  onBack={() => {
                    // If there are multiple restaurants, go back to restaurant selection
                    // Otherwise, go back to location selection
                    if (restaurants.length > 0) {
                      setSelectedRestaurant(null)
                      setFetchedMenu(null)
                    } else {
                      // Go back to location selection
                      setSelectedPoint(null)
                      setRestaurants([])
                      setSelectedRestaurant(null)
                      setFetchedMenu(null)
                      setActiveCategory(null)
                    }
                  }}
                  addToCart={addToCart}
                />
              )
            })()
          )}

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
              restaurant={selectedRestaurant}
              deliveryLocation={selectedPoint}
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
        <div className="w-full min-h-screen bg-white flex flex-col">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedPoint(null)
                  setRestaurants([])
                  setSelectedRestaurant(null)
                  setFetchedMenu(null)
                  setActiveCategory(null)
                }}
                className="text-2xl leading-none active:opacity-70 transition-opacity"
                aria-label="Go back"
              >
                ←
              </button>
              <div className="flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-center">Choose a Restaurant</h2>
                <p className="text-xs sm:text-sm text-center text-blue-100 mt-1">Available for your selected delivery location</p>
              </div>
              <div className="w-8"></div>
            </div>
          </div>
          <div className="flex-1 p-4 sm:p-6">
            {restaurants.length > 0 ? (
              <section className="flex flex-col gap-3 sm:gap-4 max-w-2xl mx-auto">
                {restaurants.map((r) => (
                  <DeliveryPointCard key={r.id} point={r} onSelect={() => { setSelectedRestaurant(r); fetchRestaurantMenu(r.id); }} />
                ))}
              </section>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm sm:text-base text-slate-600">No restaurants available for this location.</p>
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <main className="w-full min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-2xl">
            <header className="mb-6 sm:mb-8 text-center">
              <div className="inline-block mb-3 sm:mb-4">
                <span className="text-5xl sm:text-6xl lg:text-7xl">🍽️</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mb-2 sm:mb-3">
                Choose Your Delivery Location
              </h1>
              <p className="text-sm sm:text-base text-slate-600">Start ordering delicious food now! 🚀</p>
            </header>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin mb-3">
                  <span className="text-4xl">⏳</span>
                </div>
                <span className="text-sm sm:text-base text-slate-600 font-medium">Loading delivery locations...</span>
              </div>
            ) : points.length > 0 ? (
              <section className="flex flex-col gap-3 sm:gap-4">
                {points.map((p) => (
                  <DeliveryPointCard key={p.id} point={p} onSelect={handleSelect} />
                ))}
              </section>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm sm:text-base text-slate-600">No delivery locations available. Please try again later.</p>
              </div>
            )}
          </div>
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

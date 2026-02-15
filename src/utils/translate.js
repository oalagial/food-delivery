// src/utils/translate.js
// Utility for on-the-fly translation using Google Translate API (or similar)
// NOTE: For production, use a backend proxy to hide your API key!

const GOOGLE_TRANSLATE_API_KEY = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY // Set this in your .env file

export async function translateText(text, targetLang, sourceLang = 'auto') {
  if (!text || !targetLang) return text
  try {
    const res = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          target: targetLang,
          source: sourceLang,
          format: 'text',
        }),
      }
    )
    const data = await res.json()
    return data.data?.translations?.[0]?.translatedText || text
  } catch (e) {
    console.error('Translation error:', e)
    return text
  }
}

// Helper to translate an array of product fields
export async function translateProducts(products, targetLang, fields = ['name', 'desc']) {
  const translated = await Promise.all(
    products.map(async (product) => {
      const newProduct = { ...product }
      for (const field of fields) {
        if (product[field]) {
          newProduct[field] = await translateText(product[field], targetLang)
        }
      }
      return newProduct
    })
  )
  return translated
}

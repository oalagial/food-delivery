import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import it from './locales/it.json'
import el from './locales/el.json'

const resources = {
  en: { translation: en },
  it: { translation: it },
  el: { translation: el },
}

const savedLang = typeof localStorage !== 'undefined' ? localStorage.getItem('lang') : null
const lng = savedLang && ['en', 'it', 'el'].includes(savedLang) ? savedLang : 'en'

i18n.use(initReactI18next).init({
  resources,
  lng,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n

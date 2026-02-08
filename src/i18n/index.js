import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import it from './locales/it.json'

const resources = {
  en: { translation: en },
  it: { translation: it },
}

const savedLang = typeof localStorage !== 'undefined' ? localStorage.getItem('lang') : null
const lng = savedLang && (savedLang === 'en' || savedLang === 'it') ? savedLang : 'en'

i18n.use(initReactI18next).init({
  resources,
  lng,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n

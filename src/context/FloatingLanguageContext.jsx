import { createContext, useContext } from 'react'

/** Όταν true, το App δεν εμφανίζει το global fixed LanguageSwitcher (π.χ. το StorePage έχει δικό του). */
export const FloatingLanguageContext = createContext(null)

export function useFloatingLanguageControl() {
  return useContext(FloatingLanguageContext)
}

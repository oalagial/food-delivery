import { createContext, useContext, useState } from 'react'

const AlertContext = createContext()

export function AlertProvider({ children }) {
  const [alert, setAlert] = useState({ isOpen: false, type: 'success', title: '', message: '' })

  const showAlert = (type, title, message, duration = 5000) => {
    setAlert({ isOpen: true, type, title, message, duration })
  }

  const closeAlert = () => {
    setAlert((prev) => ({ ...prev, isOpen: false }))
  }

  return (
    <AlertContext.Provider value={{ showAlert, closeAlert, alert }}>
      {children}
    </AlertContext.Provider>
  )
}

export function useAlert() {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider')
  }
  return context
}

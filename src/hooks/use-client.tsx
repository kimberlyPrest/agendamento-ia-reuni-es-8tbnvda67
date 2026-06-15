import { createContext, useContext, useState, ReactNode } from 'react'

interface ClientContextType {
  clientId: string | null
  setClientId: (id: string | null) => void
}

const ClientContext = createContext<ClientContextType | undefined>(undefined)

export const ClientProvider = ({ children }: { children: ReactNode }) => {
  const [clientId, setClientId] = useState<string | null>(() => localStorage.getItem('clientId'))

  const handleSetClientId = (id: string | null) => {
    if (id) localStorage.setItem('clientId', id)
    else localStorage.removeItem('clientId')
    setClientId(id)
  }

  return (
    <ClientContext.Provider value={{ clientId, setClientId: handleSetClientId }}>
      {children}
    </ClientContext.Provider>
  )
}

export const useClient = () => {
  const context = useContext(ClientContext)
  if (!context) throw new Error('useClient must be used within a ClientProvider')
  return context
}

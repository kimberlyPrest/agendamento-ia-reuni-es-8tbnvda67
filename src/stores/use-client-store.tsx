import React, { createContext, useContext, useState, ReactNode } from 'react'

interface ClientContextType {
  client: any | null
  upcomingMeeting: any | null
  setClientData: (client: any, upcoming: any) => void
  clear: () => void
  refreshClient: () => Promise<void>
}

const ClientContext = createContext<ClientContextType | undefined>(undefined)

export function useClientStore() {
  const context = useContext(ClientContext)
  if (!context) throw new Error('useClientStore must be used within ClientStoreProvider')
  return context
}

export function ClientStoreProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<any | null>(null)
  const [upcomingMeeting, setUpcomingMeeting] = useState<any | null>(null)

  const setClientData = (c: any, u: any) => {
    setClient(c)
    setUpcomingMeeting(u)
  }

  const clear = () => {
    setClient(null)
    setUpcomingMeeting(null)
  }

  const refreshClient = async () => {
    if (!client?.email) return
    try {
      const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/client/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: client.email }),
      })
      if (res.ok) {
        const data = await res.json()
        setClientData(data.client, data.upcoming)
      }
    } catch (err) {
      console.error(err)
    }
  }

  return React.createElement(
    ClientContext.Provider,
    { value: { client, upcomingMeeting, setClientData, clear, refreshClient } },
    children,
  )
}

export default useClientStore

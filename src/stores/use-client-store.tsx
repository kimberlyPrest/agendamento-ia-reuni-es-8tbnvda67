import React, { createContext, useContext, useState, ReactNode } from 'react'
import { authClientByEmail } from '@/services/api'

interface ClientContextType {
  client: any | null
  upcomingMeeting: any | null
  lastMeeting: any | null
  stats: any | null
  setClientData: (client: any, upcoming: any, stats?: any, lastMeeting?: any) => void
  clear: () => void
  refreshClient: () => Promise<{
    client: any
    upcomingMeeting: any | null
    stats: any | null
    lastMeeting: any | null
  } | null>
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
  const [lastMeeting, setLastMeeting] = useState<any | null>(null)
  const [stats, setStats] = useState<any | null>(null)

  const setClientData = (c: any, upcoming: any, nextStats?: any, last?: any) => {
    setClient(c)
    setUpcomingMeeting(upcoming)
    setStats(nextStats || null)
    setLastMeeting(last || null)
  }

  const clear = () => {
    setClient(null)
    setUpcomingMeeting(null)
    setStats(null)
    setLastMeeting(null)
  }

  const refreshClient = async () => {
    if (!client?.email) return null
    const data = await authClientByEmail(client.email)
    const refreshed = {
      client: data.client,
      upcomingMeeting: data.upcoming || data.upcomingMeeting || null,
      stats: data.stats || null,
      lastMeeting: data.lastMeeting || null,
    }
    setClientData(
      refreshed.client,
      refreshed.upcomingMeeting,
      refreshed.stats,
      refreshed.lastMeeting,
    )
    return refreshed
  }

  return React.createElement(
    ClientContext.Provider,
    {
      value: {
        client,
        upcomingMeeting,
        lastMeeting,
        stats,
        setClientData,
        clear,
        refreshClient,
      },
    },
    children,
  )
}

export default useClientStore

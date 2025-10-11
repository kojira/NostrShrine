/**
 * リレーコンテキスト
 * 
 * Nostrリレーの接続管理を提供します。
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { RelayPool, RelayConnection, RelayStatus } from '../lib/nostr/relay'
import type { NostrEvent } from '../lib/nostr/client'
import type { Filter } from '../lib/nostr/relay'
import { DEFAULT_RELAY } from '../config/constants'
import { CachedRelayClient, createCachedRelayClient } from '../lib/nostr/cachedRelay'

interface RelayContextType {
  pool: RelayPool
  relays: RelayConnection[]
  addRelay: (url: string) => Promise<void>
  removeRelay: (url: string) => void
  publishEvent: (event: NostrEvent) => Promise<void>
  subscribe: (subscriptionId: string, filters: Filter[], onEvent: (event: NostrEvent) => void) => void
  unsubscribe: (subscriptionId: string) => void
  isConnected: boolean
  cachedClient: CachedRelayClient // キャッシュ統合クライアント
}

const RelayContext = createContext<RelayContextType | undefined>(undefined)

export function RelayProvider({ children }: { children: ReactNode }) {
  const [pool] = useState(() => new RelayPool())
  const [relays, setRelays] = useState<RelayConnection[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [cachedClient] = useState(() => 
    createCachedRelayClient(
      (id, filters, onEvent) => pool.subscribeToAll(id, filters, onEvent),
      (id) => pool.unsubscribeFromAll(id)
    )
  )
  
  // 初期化
  useEffect(() => {
    const initRelays = async () => {
      // ローカルストレージから復元、または環境変数/デフォルトリレーを使用
      const storedRelays = localStorage.getItem('nostr_relays')
      const relayUrls = storedRelays 
        ? JSON.parse(storedRelays) 
        : [import.meta.env.VITE_DEFAULT_RELAY || DEFAULT_RELAY]
      
      // リレー追加と接続
      for (const url of relayUrls) {
        pool.addRelay(url)
      }
      
      await pool.connectAll()
      setRelays(pool.getRelays())
      updateConnectionStatus()
    }
    
    initRelays().catch(console.error)
    
    // クリーンアップ
    return () => {
      pool.disconnectAll()
    }
  }, [pool])
  
  // 接続状態監視
  useEffect(() => {
    const interval = setInterval(() => {
      updateConnectionStatus()
    }, 1000)
    
    return () => clearInterval(interval)
  }, [relays])
  
  const updateConnectionStatus = () => {
    const currentRelays = pool.getRelays()
    setRelays([...currentRelays])
    
    const connected = currentRelays.some(
      relay => relay.getStatus() === RelayStatus.CONNECTED
    )
    setIsConnected(connected)
  }
  
  const addRelay = async (url: string) => {
    const relay = pool.addRelay(url)
    await relay.connect()
    
    // ローカルストレージに保存
    const relayUrls = pool.getRelays().map(r => r.getUrl())
    localStorage.setItem('nostr_relays', JSON.stringify(relayUrls))
    
    updateConnectionStatus()
  }
  
  const removeRelay = (url: string) => {
    pool.removeRelay(url)
    
    // ローカルストレージを更新
    const relayUrls = pool.getRelays().map(r => r.getUrl())
    localStorage.setItem('nostr_relays', JSON.stringify(relayUrls))
    
    updateConnectionStatus()
  }
  
  const publishEvent = async (event: NostrEvent) => {
    await pool.publishToAll(event)
  }
  
  const subscribe = (subscriptionId: string, filters: Filter[], onEvent: (event: NostrEvent) => void) => {
    pool.subscribeToAll(subscriptionId, filters, onEvent)
  }
  
  const unsubscribe = (subscriptionId: string) => {
    pool.unsubscribeFromAll(subscriptionId)
  }
  
  return (
    <RelayContext.Provider
      value={{
        pool,
        relays,
        addRelay,
        removeRelay,
        publishEvent,
        subscribe,
        unsubscribe,
        isConnected,
        cachedClient,
      }}
    >
      {children}
    </RelayContext.Provider>
  )
}

export function useRelay() {
  const context = useContext(RelayContext)
  if (context === undefined) {
    throw new Error('useRelay must be used within a RelayProvider')
  }
  return context
}


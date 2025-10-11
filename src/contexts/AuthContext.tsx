/**
 * 認証コンテキスト
 * 
 * NIP-07を使用した認証状態の管理を提供します。
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import * as nip07 from '../lib/nostr/nip07'
import { publicKeyToNpub } from '../lib/nostr/client'

interface AuthContextType {
  isAuthenticated: boolean
  publicKey: string | null
  npub: string | null
  isNIP07Available: boolean
  login: () => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [npub, setNpub] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isNIP07Available, setIsNIP07Available] = useState(false)
  
  // NIP-07拡張機能の読み込みを待機
  useEffect(() => {
    let mounted = true
    
    const checkNostr = async () => {
      // 拡張機能が読み込まれるまで待機
      const available = await nip07.waitForNostr(3000)
      
      if (!mounted) return
      
      setIsNIP07Available(available)
      
      if (available) {
        console.log('[Auth] NIP-07 extension detected')
        
        // ローカルストレージから復元を試みる
        const storedPubkey = localStorage.getItem('nostr_pubkey')
        if (storedPubkey) {
          try {
            const pk = await nip07.getPublicKey()
            if (pk === storedPubkey) {
              setPublicKey(pk)
              const npubKey = await publicKeyToNpub(pk)
              setNpub(npubKey)
              setIsAuthenticated(true)
            } else {
              localStorage.removeItem('nostr_pubkey')
            }
          } catch (error) {
            console.error('[Auth] Failed to restore session:', error)
          }
        }
      } else {
        console.log('[Auth] NIP-07 extension not found')
      }
      
      setIsLoading(false)
    }
    
    checkNostr()
    
    return () => {
      mounted = false
    }
  }, [])
  
  const login = async () => {
    try {
      setIsLoading(true)
      const pk = await nip07.getPublicKey()
      const npubKey = await publicKeyToNpub(pk)
      
      setPublicKey(pk)
      setNpub(npubKey)
      setIsAuthenticated(true)
      
      // ローカルストレージに保存
      localStorage.setItem('nostr_pubkey', pk)
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }
  
  const logout = () => {
    setPublicKey(null)
    setNpub(null)
    setIsAuthenticated(false)
    localStorage.removeItem('nostr_pubkey')
  }
  
  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        publicKey,
        npub,
        isNIP07Available,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}


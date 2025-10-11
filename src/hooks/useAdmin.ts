/**
 * 管理者機能のフック
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRelay } from '../contexts/RelayContext'
import { KIND, D_TAG } from '../config/constants'
import { npubToPublicKey } from '../lib/nostr/client'
import type { NostrEvent } from '../lib/nostr/client'

export function useAdmin() {
  const { publicKey } = useAuth()
  const { subscribe, unsubscribe } = useRelay()
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminList, setAdminList] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // 環境変数から初期管理者リストを取得
  const getEnvAdmins = (): string[] => {
    const envAdmins = import.meta.env.VITE_ADMIN_PUBKEYS || ''
    if (!envAdmins) return []
    
    return envAdmins.split(',')
      .map((key: string) => key.trim())
      .filter((key: string) => key.length > 0)
  }
  
  // Nostrから管理者リストを取得
  const fetchAdminList = useCallback(() => {
    setIsLoading(true)
    const subscriptionId = `admin-list-${Date.now()}`
    let latestEvent: NostrEvent | null = null
    
    subscribe(
      subscriptionId,
      [
        {
          kinds: [KIND.ADMIN_LIST],
          '#d': [D_TAG.ADMIN_LIST],
          limit: 1,
        },
      ],
      (event) => {
        // 最新のイベントを保持
        if (!latestEvent || event.created_at > latestEvent.created_at) {
          latestEvent = event
        }
      }
    )
    
    // 3秒後にサブスクリプション解除と処理
    setTimeout(() => {
      unsubscribe(subscriptionId)
      
      if (latestEvent) {
        try {
          const data = JSON.parse(latestEvent.content)
          if (Array.isArray(data.admins)) {
            setAdminList(data.admins)
            console.log('[Admin] Loaded admin list from Nostr:', data.admins)
          }
        } catch (err) {
          console.error('[Admin] Failed to parse admin list:', err)
        }
      } else {
        // Nostrにデータがない場合は環境変数を使用
        const envAdmins = getEnvAdmins()
        setAdminList(envAdmins)
        console.log('[Admin] Using env admins:', envAdmins)
      }
      
      setIsLoading(false)
    }, 3000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  // 初回マウント時に管理者リストを取得
  useEffect(() => {
    fetchAdminList()
  }, [])
  
  // 現在のユーザーが管理者かチェック
  useEffect(() => {
    if (!publicKey || adminList.length === 0) {
      setIsAdmin(false)
      return
    }
    
    const checkAdmin = async () => {
      // 管理者リストの各エントリーをhexに変換して比較
      const adminHexList = await Promise.all(
        adminList.map(async (admin) => {
          // npub形式の場合は変換
          if (admin.startsWith('npub1')) {
            try {
              return await npubToPublicKey(admin)
            } catch {
              return admin // 変換失敗時はそのまま
            }
          }
          return admin // すでにhex形式
        })
      )
      
      const isAdminUser = adminHexList.some(adminHex => 
        adminHex.toLowerCase() === publicKey.toLowerCase()
      )
      
      setIsAdmin(isAdminUser)
      console.log('[Admin] Is admin:', isAdminUser, 'for pubkey:', publicKey)
      console.log('[Admin] Admin list (hex):', adminHexList)
    }
    
    checkAdmin()
  }, [publicKey, adminList])
  
  return {
    isAdmin,
    adminList,
    isLoading,
    refetch: fetchAdminList,
  }
}


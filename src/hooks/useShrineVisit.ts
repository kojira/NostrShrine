/**
 * 参拝機能のフック
 */

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRelay } from '../contexts/RelayContext'
import { createShrineVisitEvent, type ShrineVisitData } from '../lib/nostr/events'

export function useShrineVisit() {
  const { publicKey } = useAuth()
  const { publishEvent } = useRelay()
  const [isVisiting, setIsVisiting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const visit = async (data: ShrineVisitData = {}) => {
    if (!publicKey) {
      setError('ログインが必要です')
      return false
    }
    
    try {
      setIsVisiting(true)
      setError(null)
      
      const event = await createShrineVisitEvent(publicKey, data)
      await publishEvent(event)
      
      console.log('[ShrineVisit] Published:', event)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : '参拝に失敗しました'
      setError(message)
      console.error('[ShrineVisit] Error:', err)
      return false
    } finally {
      setIsVisiting(false)
    }
  }
  
  return {
    visit,
    isVisiting,
    error,
  }
}


/**
 * おみくじ一覧取得のフック（管理者用）
 */

import { useState, useCallback } from 'react'
import { useRelay } from '../contexts/RelayContext'
import { KIND } from '../config/constants'
import type { OmikujiResult } from '../lib/nostr/events'

interface OmikujiListItem {
  id: string
  eventId: string
  timestamp: number
  author: string
  result: OmikujiResult
}

export function useOmikujiList() {
  const { cachedClient } = useRelay()
  const [omikujiList, setOmikujiList] = useState<OmikujiListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const fetchOmikujiList = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const events = await cachedClient.fetchEvents(
        [{ kinds: [KIND.OMIKUJI_DATA], limit: 500 }],
        {
          onCache: (cached) => {
            // キャッシュから取得できたら即座に表示
            const items = parseEvents(cached)
            setOmikujiList(items)
            setIsLoading(false)
          },
          onRelay: (newEvents) => {
            // リレーから新しいイベントを取得したら追加（重複除外済み）
            setOmikujiList(prev => {
              const newItems = parseEvents(newEvents)
              const combined = [...prev, ...newItems]
              // タイムスタンプでソート
              return combined.sort((a, b) => b.timestamp - a.timestamp)
            })
          }
        }
      )
      
      const items = parseEvents(events)
      setOmikujiList(items)
      setIsLoading(false)
      
      console.log(`[OmikujiList] Loaded ${items.length} omikuji`)
    } catch (err) {
      console.error('[OmikujiList] Failed to fetch:', err)
      setError('おみくじ一覧の取得に失敗しました')
      setIsLoading(false)
    }
  }, [cachedClient])
  
  const parseEvents = (events: any[]): OmikujiListItem[] => {
    return events
      .map(event => {
        try {
          const result: OmikujiResult = JSON.parse(event.content)
          const dTag = event.tags.find((tag: any) => tag[0] === 'd')
          const omikujiId = dTag ? dTag[1] : event.id.slice(0, 8)
          
          return {
            id: omikujiId,
            eventId: event.id,
            timestamp: event.created_at,
            author: event.pubkey,
            result,
          }
        } catch (err) {
          console.error('[OmikujiList] Failed to parse:', err)
          return null
        }
      })
      .filter((item): item is OmikujiListItem => item !== null)
      .sort((a, b) => b.timestamp - a.timestamp)
  }
  
  return {
    omikujiList,
    isLoading,
    error,
    fetchOmikujiList,
    totalCount: omikujiList.length,
  }
}

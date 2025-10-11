/**
 * 参拝履歴取得のフック（全ユーザー）
 */

import { useState, useCallback } from 'react'
import { useRelay } from '../contexts/RelayContext'
import { KIND } from '../config/constants'
import { profileCache, type Profile } from '../lib/cache/profileCache'
import type { NostrEvent } from '../lib/nostr/client'

interface ShrineVisitRecord {
  id: string
  pubkey: string
  timestamp: number
  shrine_name: string
  message: string
  visited_at: number
  profile?: Profile
}

export function useShrineHistory() {
  const { cachedClient, subscribe, unsubscribe } = useRelay()
  const [history, setHistory] = useState<ShrineVisitRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const fetchHistory = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // 参拝履歴を取得（全ユーザー）
      const events = await cachedClient.fetchEvents(
        [{ kinds: [KIND.SHRINE_VISIT], limit: 100 }],
        {
          onCache: async (cached) => {
            // キャッシュから取得できたら即座に表示
            const records = await parseEventsWithProfiles(cached)
            setHistory(records)
            setIsLoading(false)
          },
          onRelay: async (newEvents) => {
            // リレーから新しいイベントを取得したら追加
            const newRecords = await parseEventsWithProfiles(newEvents)
            setHistory(prev => {
              const combined = [...prev, ...newRecords]
              return combined.sort((a, b) => b.timestamp - a.timestamp)
            })
          }
        }
      )
      
      const records = await parseEventsWithProfiles(events)
      setHistory(records)
      setIsLoading(false)
      
      console.log(`[History] Loaded ${records.length} shrine visits`)
    } catch (err) {
      console.error('[History] Failed to fetch:', err)
      setError('履歴の取得に失敗しました')
      setIsLoading(false)
    }
  }, [cachedClient])
  
  const parseEventsWithProfiles = async (events: NostrEvent[]): Promise<ShrineVisitRecord[]> => {
    // イベントをパース
    const records: ShrineVisitRecord[] = events
      .map(event => {
        try {
          const data = JSON.parse(event.content)
          return {
            id: event.id,
            pubkey: event.pubkey,
            timestamp: event.created_at,
            shrine_name: data.shrine_name || 'NostrShrine',
            message: data.message || '',
            visited_at: data.visited_at || event.created_at * 1000,
          }
        } catch (err) {
          console.error('[History] Failed to parse event:', err)
          return null
        }
      })
      .filter((r): r is ShrineVisitRecord => r !== null)
    
    // ユニークなpubkeyリストを取得
    const pubkeys = Array.from(new Set(records.map(r => r.pubkey)))
    
    // キャッシュからプロフィールを取得
    const cachedProfiles = await profileCache.getMultiple(pubkeys)
    
    // キャッシュにないpubkeyを取得
    const missingPubkeys = pubkeys.filter(pk => !cachedProfiles.has(pk))
    
    if (missingPubkeys.length > 0) {
      // リレーからプロフィールを取得（バックグラウンド）
      fetchProfiles(missingPubkeys)
    }
    
    // プロフィールを付与
    return records.map(record => ({
      ...record,
      profile: cachedProfiles.get(record.pubkey)?.profile,
    })).sort((a, b) => b.timestamp - a.timestamp)
  }
  
  const fetchProfiles = useCallback((pubkeys: string[]) => {
    const subscriptionId = `profiles-${Date.now()}`
    
    subscribe(subscriptionId, [{ kinds: [0], authors: pubkeys }], async (event) => {
      // プロフィールをキャッシュに保存
      await profileCache.set(event)
      
      // 履歴を更新
      setHistory(prev => {
        return prev.map(record => {
          if (record.pubkey === event.pubkey) {
            try {
              const profile = JSON.parse(event.content)
              return { ...record, profile }
            } catch (err) {
              return record
            }
          }
          return record
        })
      })
    })
    
    // 3秒後にサブスクリプション解除
    setTimeout(() => {
      unsubscribe(subscriptionId)
    }, 3000)
  }, [subscribe, unsubscribe])
  
  return {
    history,
    isLoading,
    error,
    fetchHistory,
  }
}

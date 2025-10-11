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

const PAGE_SIZE = 50

export function useShrineHistory() {
  const { cachedClient, subscribe, unsubscribe } = useRelay()
  const [history, setHistory] = useState<ShrineVisitRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [oldestTimestamp, setOldestTimestamp] = useState<number | null>(null)
  
  const fetchHistory = useCallback(async (pageNum: number = 1, resetOldest?: boolean) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // ページ1の場合はoldestTimestampをリセット
      const currentOldest = (pageNum === 1 || resetOldest) ? null : oldestTimestamp
      
      // 参拝履歴を取得（タイムスタンプベースのページング）
      const filter: any = { kinds: [KIND.SHRINE_VISIT], limit: PAGE_SIZE }
      if (currentOldest !== null) {
        // 前回取得した最も古いタイムスタンプより古いものを取得
        filter.until = currentOldest - 1
      }
      
      console.log(`[History] Fetching page ${pageNum} with filter:`, filter)
      
      const events = await cachedClient.fetchEvents(
        [filter],
        {
          onCache: async (cached) => {
            // キャッシュから取得できたら即座に表示
            const records = await parseEventsWithProfiles(cached)
            if (pageNum === 1) {
              setHistory(records)
            } else {
              setHistory(prev => [...prev, ...records])
            }
            setIsLoading(false)
          },
          onRelay: async (newEvents) => {
            // リレーから新しいイベントを取得したら追加
            const newRecords = await parseEventsWithProfiles(newEvents)
            if (pageNum === 1) {
              setHistory(newRecords)
            } else {
              setHistory(prev => {
                const combined = [...prev, ...newRecords]
                // 重複を除去
                const unique = Array.from(new Map(combined.map(r => [r.id, r])).values())
                return unique.sort((a, b) => b.timestamp - a.timestamp)
              })
            }
          }
        }
      )
      
      const records = await parseEventsWithProfiles(events)
      
      // 取得件数がPAGE_SIZE未満なら、これ以上データがない
      setHasMore(records.length >= PAGE_SIZE)
      
      // 最も古いタイムスタンプを記録
      if (records.length > 0) {
        const oldest = Math.min(...records.map(r => r.timestamp))
        setOldestTimestamp(oldest)
      }
      
      if (pageNum === 1) {
        setHistory(records)
        // ページ1の場合はoldestTimestampをリセット
        if (records.length > 0) {
          const oldest = Math.min(...records.map(r => r.timestamp))
          setOldestTimestamp(oldest)
        } else {
          setOldestTimestamp(null)
        }
      } else {
        setHistory(prev => {
          const combined = [...prev, ...records]
          // 重複を除去
          const unique = Array.from(new Map(combined.map(r => [r.id, r])).values())
          return unique.sort((a, b) => b.timestamp - a.timestamp)
        })
      }
      
      setPage(pageNum)
      setIsLoading(false)
      
      console.log(`[History] Loaded ${records.length} shrine visits (page ${pageNum}), oldest: ${oldestTimestamp}`)
    } catch (err) {
      console.error('[History] Failed to fetch:', err)
      setError('履歴の取得に失敗しました')
      setIsLoading(false)
    }
  }, [cachedClient, oldestTimestamp])
  
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchHistory(page + 1)
    }
  }, [page, isLoading, hasMore, fetchHistory])
  
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
    loadMore,
    hasMore,
    page,
  }
}

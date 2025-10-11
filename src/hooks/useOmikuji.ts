/**
 * おみくじ機能のフック
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRelay } from '../contexts/RelayContext'
import type { OmikujiResult } from '../lib/nostr/events'
import { KIND } from '../config/constants'
import type { NostrEvent } from '../lib/nostr/client'

const DRAWN_TODAY_KEY = 'omikuji_drawn_today'
const LAST_DRAWN_TIMESTAMP_KEY = 'omikuji_last_drawn_timestamp'

export function useOmikuji(cooldownMinutes: number = 60) {
  const { publicKey } = useAuth()
  const { cachedClient } = useRelay()
  const [omikujiList, setOmikujiList] = useState<NostrEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastDrawnTime, setLastDrawnTime] = useState<number | null>(null)
  const [canDraw, setCanDraw] = useState(true)
  const [remainingMinutes, setRemainingMinutes] = useState(0)
  
  // ローカルストレージから最後に引いた時刻を復元
  useEffect(() => {
    const lastTimestamp = localStorage.getItem(LAST_DRAWN_TIMESTAMP_KEY)
    
    if (lastTimestamp) {
      const lastTime = parseInt(lastTimestamp, 10)
      setLastDrawnTime(lastTime)
      
      const now = Date.now()
      const elapsedMinutes = (now - lastTime) / (1000 * 60)
      
      if (elapsedMinutes < cooldownMinutes) {
        setCanDraw(false)
        setRemainingMinutes(Math.ceil(cooldownMinutes - elapsedMinutes))
      } else {
        setCanDraw(true)
        setRemainingMinutes(0)
      }
    } else {
      setCanDraw(true)
      setRemainingMinutes(0)
    }
  }, [cooldownMinutes])
  
  // クールダウンタイマー
  useEffect(() => {
    if (!lastDrawnTime || canDraw) return
    
    const interval = setInterval(() => {
      const now = Date.now()
      const elapsedMinutes = (now - lastDrawnTime) / (1000 * 60)
      
      if (elapsedMinutes >= cooldownMinutes) {
        setCanDraw(true)
        setRemainingMinutes(0)
        clearInterval(interval)
      } else {
        setRemainingMinutes(Math.ceil(cooldownMinutes - elapsedMinutes))
      }
    }, 1000)
    
    return () => clearInterval(interval)
  }, [lastDrawnTime, canDraw, cooldownMinutes])
  
  // おみくじデータを取得（キャッシュ統合）
  const fetchOmikujiList = useCallback(async () => {
    if (!publicKey) return
    
    setIsLoading(true)
    
    try {
      const events = await cachedClient.fetchEvents(
        [{ kinds: [KIND.OMIKUJI_DATA], limit: 100 }],
        {
          onCache: (cached) => {
            // キャッシュから取得できたら即座に表示
            setOmikujiList(cached)
            setIsLoading(false)
          },
          onRelay: (newEvents) => {
            // リレーから新しいイベントを取得したら追加（重複除外済み）
            setOmikujiList(prev => [...prev, ...newEvents])
          }
        }
      )
      
      setOmikujiList(events)
      setIsLoading(false)
      
      if (events.length === 0) {
        setError('おみくじデータが見つかりませんでした。管理者がおみくじを生成してください。')
      }
    } catch (err) {
      console.error('[Omikuji] Failed to fetch:', err)
      setError('おみくじの取得に失敗しました')
      setIsLoading(false)
    }
  }, [publicKey, cachedClient])
  
  // おみくじを引く
  const drawOmikuji = useCallback((): OmikujiResult | null => {
    if (!canDraw) {
      setError(`次のおみくじまで残り ${remainingMinutes} 分です`)
      return null
    }
    
    if (omikujiList.length === 0) {
      setError('おみくじデータがありません')
      return null
    }
    
    // ランダムに選択
    const randomIndex = Math.floor(Math.random() * omikujiList.length)
    const selected = omikujiList[randomIndex]
    
    try {
      const result: OmikujiResult = JSON.parse(selected.content)
      
      // 引いた時刻を更新
      const now = Date.now()
      setLastDrawnTime(now)
      localStorage.setItem(LAST_DRAWN_TIMESTAMP_KEY, now.toString())
      setCanDraw(false)
      setRemainingMinutes(cooldownMinutes)
      
      // 今日引いたおみくじのIDをローカルストレージに保存
      const drawnToday = JSON.parse(localStorage.getItem(DRAWN_TODAY_KEY) || '[]')
      drawnToday.push({
        id: selected.id,
        result,
        timestamp: now,
      })
      localStorage.setItem(DRAWN_TODAY_KEY, JSON.stringify(drawnToday))
      
      return result
    } catch (err) {
      setError('おみくじデータの解析に失敗しました')
      console.error('[Omikuji] Parse error:', err)
      return null
    }
  }, [canDraw, remainingMinutes, cooldownMinutes, omikujiList])
  
  return {
    fetchOmikujiList,
    drawOmikuji,
    isLoading,
    error,
    lastDrawnTime,
    remainingMinutes,
    canDraw,
    omikujiAvailable: omikujiList.length > 0,
  }
}

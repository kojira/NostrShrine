/**
 * 動画一覧取得カスタムフック
 */

import { useState, useEffect, useCallback } from 'react'
import { useRelay } from '../contexts/RelayContext'
import { useAdminContext } from '../contexts/AdminContext'
import type { NostrEvent } from '../lib/nostr/client'
import type { VideoData } from '../lib/nostr/events'
import { KIND, type VideoType } from '../config/constants'

export interface VideoListItem {
  id: string // d tag value
  event: NostrEvent
  data: VideoData
  videoType: VideoType
}

export function useVideoList(videoType: VideoType = 'shrine') {
  const { cachedClient } = useRelay()
  const { adminList } = useAdminContext()
  const [videos, setVideos] = useState<VideoListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const loadVideos = useCallback(async () => {
    if (!cachedClient || adminList.length === 0) {
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      // 動画タイプに応じたkindを選択
      const kind = videoType === 'omikuji' ? KIND.OMIKUJI_VIDEO : KIND.SHRINE_VIDEO
      
      // 管理者の動画イベントを取得
      const events = await cachedClient.fetchEvents([
        {
          kinds: [kind],
          authors: adminList,
        },
      ])
      
      // VideoListItem に変換
      const videoList: VideoListItem[] = events
        .map((event) => {
          try {
            const data: VideoData = JSON.parse(event.content)
            const dTag = event.tags.find((t) => t[0] === 'd')?.[1]
            const videoTypeTag = event.tags.find((t) => t[0] === 'video_type')?.[1] as VideoType | undefined
            
            if (!dTag || !data.url) {
              return null
            }
            
            return {
              id: dTag,
              event,
              data,
              videoType: videoTypeTag || data.videoType || videoType, // タグ、データ、フィルター指定の順で優先
            }
          } catch (e) {
            console.error('[VideoList] Failed to parse event:', event.id, e)
            return null
          }
        })
        .filter((item): item is VideoListItem => item !== null)
        .sort((a, b) => b.event.created_at - a.event.created_at) // 新しい順
      
      setVideos(videoList)
    } catch (err) {
      console.error('[VideoList] Failed to load videos:', err)
      setError(err instanceof Error ? err.message : 'Failed to load videos')
    } finally {
      setIsLoading(false)
    }
  }, [cachedClient, adminList, videoType])
  
  useEffect(() => {
    loadVideos()
  }, [loadVideos])
  
  // adminListが変更されたらリロード
  useEffect(() => {
    if (adminList.length > 0) {
      loadVideos()
    }
  }, [adminList, loadVideos])
  
  /**
   * ランダムに1つの動画を取得
   */
  const getRandomVideo = useCallback((): VideoListItem | null => {
    if (videos.length === 0) {
      return null
    }
    
    const randomIndex = Math.floor(Math.random() * videos.length)
    return videos[randomIndex]
  }, [videos])
  
  return {
    videos,
    isLoading,
    error,
    reload: loadVideos,
    getRandomVideo,
  }
}


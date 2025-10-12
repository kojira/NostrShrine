/**
 * 動画管理カスタムフック
 */

import { useState, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRelay } from '../contexts/RelayContext'
import { createVideoEvent, type VideoData } from '../lib/nostr/events'
import type { NostrEvent } from '../lib/nostr/client'
import { generateVideoWithCometAPI, type CometVideoGenerationOptions } from '../services/video/cometapi'
import { compressVideo } from '../services/video/compression'
import { uploadToShareYabume } from '../services/upload/nip96'
import { KIND, type VideoType } from '../config/constants'

export interface VideoRecord {
  id: string
  event: NostrEvent
  data: VideoData
  videoType: VideoType
}

export function useVideoManagement() {
  const { publicKey } = useAuth()
  const { cachedClient } = useRelay()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState('')
  
  /**
   * Comet API経由で動画を生成（アップロードなし）
   */
  const generateVideo = useCallback(
    async (apiKey: string, options: CometVideoGenerationOptions): Promise<File> => {
      try {
        setIsGenerating(true)
        setProgress('動画を生成中...')
        
      // 1. Comet API経由で動画生成（ストリーミングで進捗表示）
      const videoFile = await generateVideoWithCometAPI(apiKey, options, (message) => {
        setProgress(message)
      })
        
        setProgress('動画を圧縮中...')
        
        // 2. WebCodecsで圧縮
        const compressedVideo = await compressVideo(videoFile, {
          targetBitrate: 2_000_000, // 2Mbps
        })
        
        setProgress('')
        setIsGenerating(false)
        
        return compressedVideo
      } catch (error) {
        setIsGenerating(false)
        setProgress('')
        throw error
      }
    },
    []
  )
  
  /**
   * 生成済み動画をアップロードしてNostrに登録
   */
  const uploadGeneratedVideo = useCallback(
    async (
      file: File,
      prompt: string,
      videoType: VideoType = 'shrine',
      skipCompression?: boolean,
      title?: string,
      description?: string
    ): Promise<VideoRecord> => {
      if (!publicKey) {
        throw new Error('Not authenticated')
      }
      
      try {
        setIsUploading(true)
        
        // 圧縮処理（スキップ可能）
        let finalFile = file
        if (!skipCompression) {
          setProgress('動画を圧縮中...')
          try {
            finalFile = await compressVideo(file, {
              targetBitrate: 2_000_000,
              skipCompression: false,
            })
          } catch (compressionError) {
            console.warn('[VideoManagement] Compression failed, using original file:', compressionError)
            finalFile = file
          }
        } else {
          console.log('[VideoManagement] Compression skipped by user option')
        }
        
        setProgress('動画をアップロード中...')
        
        // 1. share.yabu.meにアップロード
        const videoUrl = await uploadToShareYabume(finalFile)
        
        setProgress('Nostrに保存中...')
        
        // 2. Nostrイベント作成
        const videoId = `video-${Date.now()}`
        const videoData: VideoData = {
          url: videoUrl,
          title: title || prompt.substring(0, 50),
          description: description || prompt,
          mimeType: file.type,
          prompt: prompt,
          videoType: videoType,
        }
        
        const event = await createVideoEvent(publicKey, videoId, videoData, videoType)
        
        // 3. リレーに送信
        if (cachedClient) {
          await cachedClient.publishEvent(event)
        }
        
        // 4. キャッシュをクリア（対応するkindのみ）
        const kind = videoType === 'omikuji' ? KIND.OMIKUJI_VIDEO : KIND.SHRINE_VIDEO
        await cachedClient.eventCache.clearByKind(kind)
        
        setProgress('')
        setIsUploading(false)
        
        return {
          id: videoId,
          event,
          data: videoData,
          videoType,
        }
      } catch (error) {
        setIsUploading(false)
        setProgress('')
        throw error
      }
    },
    [publicKey, cachedClient]
  )
  
  /**
   * ローカル動画ファイルをアップロード
   */
  const uploadLocalVideo = useCallback(
    async (
      file: File,
      videoType: VideoType = 'shrine',
      title?: string,
      description?: string
    ): Promise<VideoRecord> => {
      if (!publicKey) {
        throw new Error('Not authenticated')
      }
      
      try {
        setIsUploading(true)
        setProgress('動画を圧縮中...')
        
        // 1. 圧縮
        const compressedVideo = await compressVideo(file, {
          targetBitrate: 2_000_000, // 2Mbps
        })
        
        setProgress('動画をアップロード中...')
        
        // 2. アップロード
        const videoUrl = await uploadToShareYabume(compressedVideo)
        
        setProgress('Nostrに保存中...')
        
        // 3. Nostrイベント作成
        const videoId = `video-${Date.now()}`
        const videoData: VideoData = {
          url: videoUrl,
          title: title || file.name,
          description,
          mimeType: compressedVideo.type,
          videoType: videoType,
        }
        
        const event = await createVideoEvent(publicKey, videoId, videoData, videoType)
        
        // 4. リレーに送信
        if (cachedClient) {
          await cachedClient.publishEvent(event)
        }
        
        // 5. キャッシュをクリア（対応するkindのみ）
        const kind = videoType === 'omikuji' ? KIND.OMIKUJI_VIDEO : KIND.SHRINE_VIDEO
        await cachedClient.eventCache.clearByKind(kind)
        
        setProgress('')
        setIsUploading(false)
        
        return {
          id: videoId,
          event,
          data: videoData,
          videoType,
        }
      } catch (error) {
        setIsUploading(false)
        setProgress('')
        throw error
      }
    },
    [publicKey, cachedClient]
  )
  
  /**
   * 動画を削除（NIP-09）
   */
  const deleteVideo = useCallback(
    async (eventId: string, videoType: VideoType): Promise<void> => {
      if (!publicKey || !cachedClient) {
        throw new Error('Not authenticated or no relay connection')
      }
      
      const { EventBuilder } = await import('../lib/nostr/client')
      const { signEvent } = await import('../lib/nostr/nip07')
      
      // NIP-09 削除イベントを作成
      const builder = new EventBuilder(KIND.EVENT_DELETION, '')
      builder.addTag('e', [eventId])
      
      const unsigned = await builder.toUnsignedEvent(publicKey)
      const deleteEvent = await signEvent(unsigned)
      
      // リレーに送信
      await cachedClient.publishEvent(deleteEvent)
      
      // キャッシュをクリア（対応するkindのみ）
      const kind = videoType === 'omikuji' ? KIND.OMIKUJI_VIDEO : KIND.SHRINE_VIDEO
      await cachedClient.eventCache.clearByKind(kind)
    },
    [publicKey, cachedClient]
  )
  
  return {
    isGenerating,
    isUploading,
    isProcessing: isGenerating || isUploading,
    progress,
    generateVideo,
    uploadGeneratedVideo,
    uploadLocalVideo,
    deleteVideo,
  }
}


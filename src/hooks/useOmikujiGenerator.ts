/**
 * おみくじ生成機能のフック（管理者用）
 */

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRelay } from '../contexts/RelayContext'
import { OpenAIProvider, type OpenAIConfig, type GenerateOmikujiOptions } from '../services/llm'
import { createOmikujiDataEvent, type OmikujiResult } from '../lib/nostr/events'

export function useOmikujiGenerator() {
  const { publicKey } = useAuth()
  const { publishEvent } = useRelay()
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // ローカルストレージからAPIキーを取得
  const getApiKey = (): string | null => {
    return localStorage.getItem('openai_api_key')
  }
  
  // APIキーを保存
  const saveApiKey = (apiKey: string) => {
    localStorage.setItem('openai_api_key', apiKey)
  }
  
  // APIキーを削除
  const clearApiKey = () => {
    localStorage.removeItem('openai_api_key')
  }
  
  // おみくじを生成してNostrに保存
  const generateAndPublish = async (options?: GenerateOmikujiOptions): Promise<OmikujiResult | null> => {
    if (!publicKey) {
      setError('ログインが必要です')
      return null
    }
    
    const apiKey = getApiKey()
    if (!apiKey) {
      setError('OpenAI API keyが設定されていません')
      return null
    }
    
    try {
      setIsGenerating(true)
      setError(null)
      
      // LLMでおみくじ生成
      const config: OpenAIConfig = { apiKey }
      const provider = new OpenAIProvider(config)
      const result = await provider.generateOmikuji(options)
      
      // Nostrに保存
      const omikujiId = `omikuji-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const event = await createOmikujiDataEvent(publicKey, omikujiId, result)
      await publishEvent(event)
      
      console.log('[OmikujiGenerator] Published:', event)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'おみくじの生成に失敗しました'
      setError(message)
      console.error('[OmikujiGenerator] Error:', err)
      return null
    } finally {
      setIsGenerating(false)
    }
  }
  
  // 複数のおみくじを一括生成
  const generateBatch = async (count: number, options?: GenerateOmikujiOptions): Promise<number> => {
    let successCount = 0
    
    for (let i = 0; i < count; i++) {
      const result = await generateAndPublish(options)
      if (result) {
        successCount++
      }
      
      // API制限を考慮して少し待機
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    return successCount
  }
  
  return {
    generateAndPublish,
    generateBatch,
    isGenerating,
    error,
    hasApiKey: !!getApiKey(),
    saveApiKey,
    clearApiKey,
  }
}


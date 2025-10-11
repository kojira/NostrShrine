/**
 * OpenAI LLMプロバイダー
 */

import type { LLMProvider, OpenAIConfig, GenerateOmikujiOptions } from './types'
import type { OmikujiResult } from '../../lib/nostr/events'

const getOmikujiPrompt = (fortune?: string) => {
  const fortuneInstruction = fortune 
    ? `運勢は必ず「${fortune}」にしてください。`
    : '運勢は大吉|中吉|小吉|吉|末吉|凶|大凶のいずれかからランダムに選んでください。'
  
  return `あなたは神社のおみくじを作成する神職です。
日本の伝統的なおみくじの内容を生成してください。

${fortuneInstruction}

以下のJSON形式で出力してください：
{
  "fortune": "${fortune || '大吉|中吉|小吉|吉|末吉|凶|大凶のいずれか'}",
  "general": "全体運についての200文字程度のメッセージ",
  "love": "恋愛運についての100文字程度のメッセージ",
  "money": "金運についての100文字程度のメッセージ",
  "health": "健康運についての100文字程度のメッセージ",
  "work": "仕事運についての100文字程度のメッセージ",
  "lucky_item": "ラッキーアイテム（1つ）",
  "lucky_color": "ラッキーカラー（1つ）"
}

内容は前向きで励ましの言葉を含めてください。
占いの結果に合わせて適切な助言を提供してください。`
}

export class OpenAIProvider implements LLMProvider {
  name = 'OpenAI'
  private config: OpenAIConfig
  
  constructor(config: OpenAIConfig) {
    this.config = config
  }
  
  async generateOmikuji(options?: GenerateOmikujiOptions): Promise<OmikujiResult> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is not configured')
    }
    
    const model = this.config.model || 'gpt-4o-mini'
    const prompt = getOmikujiPrompt(options?.fortune)
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: prompt,
            },
            {
              role: 'user',
              content: 'おみくじを1つ生成してください',
            },
          ],
          temperature: 0.9,
          response_format: { type: 'json_object' },
        }),
      })
      
      if (!response.ok) {
        const error = await response.text()
        throw new Error(`OpenAI API error: ${response.status} ${error}`)
      }
      
      const data = await response.json()
      const content = data.choices[0].message.content
      const result: OmikujiResult = JSON.parse(content)
      
      // バリデーション
      if (!result.fortune || !result.general) {
        throw new Error('Invalid omikuji data from OpenAI')
      }
      
      return result
    } catch (error) {
      console.error('[OpenAI] Failed to generate omikuji:', error)
      throw error
    }
  }
}


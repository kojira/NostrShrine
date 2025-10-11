/**
 * LLMサービスの型定義
 */

import type { OmikujiResult } from '../../lib/nostr/events'

export type FortuneType = '大吉' | '中吉' | '小吉' | '吉' | '末吉' | '凶' | '大凶'

export interface GenerateOmikujiOptions {
  fortune?: FortuneType // 指定しない場合はランダム
}

export interface LLMProvider {
  name: string
  generateOmikuji(options?: GenerateOmikujiOptions): Promise<OmikujiResult>
}

export interface OpenAIConfig {
  apiKey: string
  model?: string
}


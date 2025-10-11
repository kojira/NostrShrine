/**
 * Nostrイベント操作
 * 
 * アプリケーション固有のイベント作成と取得を提供します。
 */

import { EventBuilder, type NostrEvent } from './client'
import * as nip07 from './nip07'
import { KIND, D_TAG } from '../../config/constants'

/**
 * 参拝イベント作成
 */
export interface ShrineVisitData {
  shrine_name?: string
  message?: string
}

export async function createShrineVisitEvent(
  publicKey: string,
  data: ShrineVisitData = {}
): Promise<NostrEvent> {
  const content = JSON.stringify({
    shrine_name: data.shrine_name || 'NostrShrine',
    message: data.message || '参拝しました',
    visited_at: Date.now(),
  })
  
  const builder = new EventBuilder(KIND.SHRINE_VISIT, content)
  builder.addTag('shrine', ['NostrShrine'])
  
  const unsigned = await builder.toUnsignedEvent(publicKey)
  return await nip07.signEvent(unsigned)
}

/**
 * おみくじ結果投稿イベント作成
 */
export interface OmikujiResult {
  fortune: string
  general: string
  love?: string
  money?: string
  health?: string
  work?: string
  lucky_item?: string
  lucky_color?: string
}

export async function createOmikujiPostEvent(
  publicKey: string,
  result: OmikujiResult
): Promise<NostrEvent> {
  const content = `🎴 おみくじの結果\n\n運勢: ${result.fortune}\n\n${result.general}\n\n#NostrShrine #おみくじ`
  
  const builder = new EventBuilder(KIND.TEXT_NOTE, content)
  builder.addTag('t', ['NostrShrine'])
  builder.addTag('t', ['おみくじ'])
  builder.addTag('fortune', [result.fortune])
  
  const unsigned = await builder.toUnsignedEvent(publicKey)
  return await nip07.signEvent(unsigned)
}

/**
 * 管理者リストイベント作成
 */
export async function createAdminListEvent(
  publicKey: string,
  adminPubkeys: string[]
): Promise<NostrEvent> {
  const content = JSON.stringify({
    admins: adminPubkeys,
    updated_at: Date.now(),
  })
  
  const builder = new EventBuilder(KIND.ADMIN_LIST, content)
  builder.addTag('d', [D_TAG.ADMIN_LIST])
  
  for (const admin of adminPubkeys) {
    builder.addTag('p', [admin])
  }
  
  const unsigned = await builder.toUnsignedEvent(publicKey)
  return await nip07.signEvent(unsigned)
}

/**
 * アプリ設定イベント作成
 */
export interface AppSettings {
  dailyOmikujiLimit: number
  relays: string[]
}

export async function createAppSettingsEvent(
  publicKey: string,
  settings: AppSettings
): Promise<NostrEvent> {
  const content = JSON.stringify({
    daily_omikuji_limit: settings.dailyOmikujiLimit,
    relays: settings.relays,
    updated_at: Date.now(),
  })
  
  const builder = new EventBuilder(KIND.APP_SETTINGS, content)
  builder.addTag('d', [D_TAG.APP_SETTINGS])
  
  const unsigned = await builder.toUnsignedEvent(publicKey)
  return await nip07.signEvent(unsigned)
}

/**
 * おみくじデータイベント作成（管理者が事前生成）
 */
export async function createOmikujiDataEvent(
  publicKey: string,
  omikujiId: string,
  result: OmikujiResult
): Promise<NostrEvent> {
  const content = JSON.stringify(result)
  
  const builder = new EventBuilder(KIND.OMIKUJI_DATA, content)
  builder.addTag('d', [omikujiId])
  builder.addTag('fortune', [result.fortune])
  
  const unsigned = await builder.toUnsignedEvent(publicKey)
  return await nip07.signEvent(unsigned)
}


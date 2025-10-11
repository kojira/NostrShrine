/**
 * アプリケーション定数
 */

// デフォルトリレー
export const DEFAULT_RELAY = 'wss://r.kojira.io'

// Nostrイベント Kind定義
export const KIND = {
  // 標準Kind
  TEXT_NOTE: 1,
  EVENT_DELETION: 5,         // イベント削除（NIP-09）
  
  // アプリケーション固有Kind
  SHRINE_VISIT: 3081,        // 参拝記録
  ADMIN_LIST: 10381,         // 管理者リスト（replaceable）
  APP_SETTINGS: 10394,       // アプリ設定（replaceable）
  OMIKUJI_DATA: 30394,       // おみくじデータ（parameterized replaceable）
  SHRINE_VIDEO: 30395,       // 参拝動画（parameterized replaceable）
} as const

// アプリケーション設定のdタグ
export const D_TAG = {
  APP_SETTINGS: 'nostrshrine-settings',
  ADMIN_LIST: 'nostrshrine-admins',
} as const

// デフォルト設定
export const DEFAULT_SETTINGS = {
  dailyOmikujiLimit: 3,  // 1日のおみくじ引き回数制限（非推奨：omikujiCooldownMinutesを使用）
  omikujiCooldownMinutes: 60,  // おみくじを引ける間隔（分）
  relays: [DEFAULT_RELAY],
} as const


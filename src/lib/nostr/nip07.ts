/**
 * NIP-07: window.nostr capability for web browsers
 * 
 * ブラウザ拡張機能（Alby, nos2x等）を通じた認証と署名を提供します。
 */

import type { NostrEvent } from './client'

/**
 * window.nostr インターフェース定義
 */
export interface WindowNostr {
  getPublicKey(): Promise<string>
  signEvent(event: NostrEvent): Promise<NostrEvent>
  getRelays?(): Promise<{ [url: string]: { read: boolean; write: boolean } }>
  nip04?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>
    decrypt(pubkey: string, ciphertext: string): Promise<string>
  }
}

declare global {
  interface Window {
    nostr?: WindowNostr
  }
}

/**
 * NIP-07の利用可能性チェック
 */
export function isNIP07Available(): boolean {
  return typeof window !== 'undefined' && window.nostr !== undefined
}

/**
 * NIP-07拡張機能が読み込まれるまで待機
 */
export async function waitForNostr(timeout = 3000): Promise<boolean> {
  if (typeof window === 'undefined') return false
  
  // 既に利用可能な場合
  if (window.nostr) return true
  
  // タイムアウトまで待機
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (window.nostr) return true
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  return false
}

/**
 * 公開鍵取得
 */
export async function getPublicKey(): Promise<string> {
  if (!isNIP07Available()) {
    throw new Error('NIP-07 not available. Please install a Nostr browser extension like Alby or nos2x.')
  }
  
  return await window.nostr!.getPublicKey()
}

/**
 * イベント署名
 */
export async function signEvent(event: NostrEvent): Promise<NostrEvent> {
  if (!isNIP07Available()) {
    throw new Error('NIP-07 not available.')
  }
  
  return await window.nostr!.signEvent(event)
}

/**
 * リレー設定取得（オプショナル）
 */
export async function getRelays(): Promise<{ [url: string]: { read: boolean; write: boolean } } | null> {
  if (!isNIP07Available() || !window.nostr!.getRelays) {
    return null
  }
  
  return await window.nostr!.getRelays()
}


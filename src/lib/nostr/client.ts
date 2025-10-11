/**
 * Nostrクライアント - rust-nostr WASMラッパー
 * 
 * このモジュールはrust-nostr WASMバインディングを使用して、
 * Nostrリレーとの通信を管理します。
 */

import * as wasm from '../../wasm/rust_nostr_wasm.js'

let isInitialized = false

/**
 * WASM初期化
 */
export async function initWasm(): Promise<void> {
  if (isInitialized) return
  
  await wasm.default()
  wasm.init_panic_hook()
  isInitialized = true
}

/**
 * キーペア生成
 */
export interface KeyPair {
  publicKey: string
  secretKey: string
}

export async function generateKeys(): Promise<KeyPair> {
  await initWasm()
  const keys = wasm.generate_keys()
  
  if (!keys || !keys.public_key) {
    throw new Error('Failed to generate keys')
  }
  
  return {
    publicKey: keys.public_key,
    secretKey: keys.secret_key,
  }
}

/**
 * 公開鍵変換
 */
export async function publicKeyToNpub(hexPubkey: string): Promise<string> {
  await initWasm()
  return wasm.public_key_to_npub(hexPubkey)
}

export async function npubToPublicKey(npub: string): Promise<string> {
  await initWasm()
  return wasm.npub_to_public_key(npub)
}

/**
 * 未署名イベント生成
 */
export interface NostrEvent {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig?: string
}

export class EventBuilder {
  private builder: any
  
  constructor(kind: number, content: string) {
    this.builder = new wasm.NostrEventBuilder(kind, content)
  }
  
  addTag(tagType: string, values: string[]): EventBuilder {
    this.builder.add_tag(tagType, values)
    return this
  }
  
  async toUnsignedEvent(authorPubkey: string): Promise<NostrEvent> {
    await initWasm()
    return this.builder.to_unsigned_event(authorPubkey)
  }
}

/**
 * イベント検証
 */
export async function verifyEventId(event: NostrEvent): Promise<boolean> {
  await initWasm()
  return wasm.verify_event_id(event)
}

export async function verifyEventSignature(event: NostrEvent): Promise<boolean> {
  await initWasm()
  return wasm.verify_event_signature(event)
}

/**
 * タイムスタンプ
 */
export async function now(): Promise<number> {
  await initWasm()
  return Number(wasm.now())
}


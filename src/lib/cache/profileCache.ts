/**
 * Nostrプロフィール（kind 0）のキャッシュ
 * Replaceable eventなので、最新のものに更新する
 */

import type { NostrEvent } from '../nostr/client'

const DB_NAME = 'NostrShrineProfileCache'
const DB_VERSION = 1
const STORE_NAME = 'profiles'

export interface Profile {
  name?: string
  display_name?: string
  picture?: string
  about?: string
  nip05?: string
  banner?: string
  website?: string
  lud16?: string
}

interface CachedProfile {
  pubkey: string
  profile: Profile
  createdAt: number // イベントのタイムスタンプ
  cachedAt: number
}

class ProfileCache {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null
  
  async init(): Promise<void> {
    if (this.db) return
    if (this.initPromise) return this.initPromise
    
    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      
      request.onerror = () => {
        console.error('[ProfileCache] Failed to open IndexedDB:', request.error)
        reject(request.error)
      }
      
      request.onsuccess = () => {
        this.db = request.result
        console.log('[ProfileCache] IndexedDB opened successfully')
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'pubkey' })
          store.createIndex('cachedAt', 'cachedAt', { unique: false })
          console.log('[ProfileCache] Object store created')
        }
      }
    })
    
    return this.initPromise
  }
  
  async set(event: NostrEvent): Promise<void> {
    await this.init()
    if (!this.db) return
    
    // 既存のプロフィールを確認
    const existing = await this.get(event.pubkey)
    
    // 既存のものより古い場合はスキップ（replaceableなので最新のみ保持）
    if (existing && existing.createdAt >= event.created_at) {
      console.log(`[ProfileCache] Skipping older profile for ${event.pubkey.slice(0, 8)}`)
      return
    }
    
    try {
      const profile: Profile = JSON.parse(event.content)
      
      const cached: CachedProfile = {
        pubkey: event.pubkey,
        profile,
        createdAt: event.created_at,
        cachedAt: Date.now(),
      }
      
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.put(cached)
        
        request.onsuccess = () => {
          console.log(`[ProfileCache] Cached profile for ${event.pubkey.slice(0, 8)}`)
          resolve()
        }
        request.onerror = () => {
          console.error('[ProfileCache] Failed to cache profile:', request.error)
          reject(request.error)
        }
      })
    } catch (err) {
      console.error('[ProfileCache] Failed to parse profile:', err)
    }
  }
  
  async get(pubkey: string): Promise<CachedProfile | null> {
    await this.init()
    if (!this.db) return null
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(pubkey)
      
      request.onsuccess = () => {
        resolve(request.result || null)
      }
      request.onerror = () => {
        console.error('[ProfileCache] Failed to get profile:', request.error)
        reject(request.error)
      }
    })
  }
  
  async getMultiple(pubkeys: string[]): Promise<Map<string, CachedProfile>> {
    await this.init()
    if (!this.db) return new Map()
    
    const results = new Map<string, CachedProfile>()
    
    for (const pubkey of pubkeys) {
      const cached = await this.get(pubkey)
      if (cached) {
        results.set(pubkey, cached)
      }
    }
    
    return results
  }
  
  async clear(): Promise<void> {
    await this.init()
    if (!this.db) return
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()
      
      request.onsuccess = () => {
        console.log('[ProfileCache] Cache cleared')
        resolve()
      }
      request.onerror = () => {
        console.error('[ProfileCache] Failed to clear cache:', request.error)
        reject(request.error)
      }
    })
  }
}

export const profileCache = new ProfileCache()


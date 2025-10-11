/**
 * Nostrイベントのローカルキャッシュ（IndexedDB）
 */

import type { NostrEvent } from '../nostr/client'

const DB_NAME = 'NostrShrineCache'
const DB_VERSION = 1
const STORE_NAME = 'events'

interface CachedEvent {
  id: string
  event: NostrEvent
  kind: number
  author: string
  createdAt: number
  cachedAt: number
}

class EventCache {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null
  
  async init(): Promise<void> {
    if (this.db) return
    if (this.initPromise) return this.initPromise
    
    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      
      request.onerror = () => {
        console.error('[Cache] Failed to open IndexedDB:', request.error)
        reject(request.error)
      }
      
      request.onsuccess = () => {
        this.db = request.result
        console.log('[Cache] IndexedDB opened successfully')
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('kind', 'kind', { unique: false })
          store.createIndex('author', 'author', { unique: false })
          store.createIndex('cachedAt', 'cachedAt', { unique: false })
          console.log('[Cache] Object store created')
        }
      }
    })
    
    return this.initPromise
  }
  
  async set(event: NostrEvent): Promise<void> {
    await this.init()
    if (!this.db) return
    
    const cached: CachedEvent = {
      id: event.id,
      event,
      kind: event.kind,
      author: event.pubkey,
      createdAt: event.created_at,
      cachedAt: Date.now(),
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(cached)
      
      request.onsuccess = () => resolve()
      request.onerror = () => {
        console.error('[Cache] Failed to cache event:', request.error)
        reject(request.error)
      }
    })
  }
  
  async get(id: string): Promise<NostrEvent | null> {
    await this.init()
    if (!this.db) return null
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(id)
      
      request.onsuccess = () => {
        const cached = request.result as CachedEvent | undefined
        resolve(cached ? cached.event : null)
      }
      request.onerror = () => {
        console.error('[Cache] Failed to get event:', request.error)
        reject(request.error)
      }
    })
  }
  
  async getByKind(kind: number): Promise<NostrEvent[]> {
    await this.init()
    if (!this.db) return []
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index('kind')
      const request = index.getAll(kind)
      
      request.onsuccess = () => {
        const cached = request.result as CachedEvent[]
        resolve(cached.map(c => c.event))
      }
      request.onerror = () => {
        console.error('[Cache] Failed to get events by kind:', request.error)
        reject(request.error)
      }
    })
  }
  
  async getByAuthor(author: string): Promise<NostrEvent[]> {
    await this.init()
    if (!this.db) return []
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index('author')
      const request = index.getAll(author)
      
      request.onsuccess = () => {
        const cached = request.result as CachedEvent[]
        resolve(cached.map(c => c.event))
      }
      request.onerror = () => {
        console.error('[Cache] Failed to get events by author:', request.error)
        reject(request.error)
      }
    })
  }
  
  async getByKindAndAuthor(kind: number, author: string): Promise<NostrEvent[]> {
    await this.init()
    if (!this.db) return []
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()
      
      request.onsuccess = () => {
        const cached = request.result as CachedEvent[]
        const filtered = cached
          .filter(c => c.kind === kind && c.author === author)
          .map(c => c.event)
        resolve(filtered)
      }
      request.onerror = () => {
        console.error('[Cache] Failed to get events by kind and author:', request.error)
        reject(request.error)
      }
    })
  }
  
  async clear(): Promise<void> {
    await this.init()
    if (!this.db) return
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()
      
      request.onsuccess = () => {
        console.log('[Cache] Cache cleared')
        resolve()
      }
      request.onerror = () => {
        console.error('[Cache] Failed to clear cache:', request.error)
        reject(request.error)
      }
    })
  }
  
  async deleteOlderThan(days: number): Promise<void> {
    await this.init()
    if (!this.db) return
    
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000)
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index('cachedAt')
      const range = IDBKeyRange.upperBound(cutoffTime)
      const request = index.openCursor(range)
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          console.log('[Cache] Old cache entries deleted')
          resolve()
        }
      }
      request.onerror = () => {
        console.error('[Cache] Failed to delete old entries:', request.error)
        reject(request.error)
      }
    })
  }
  
  async count(): Promise<number> {
    await this.init()
    if (!this.db) return 0
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.count()
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => {
        console.error('[Cache] Failed to count entries:', request.error)
        reject(request.error)
      }
    })
  }
}

export const eventCache = new EventCache()


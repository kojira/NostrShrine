/**
 * キャッシュ統合リレークライアント
 * キャッシュとリレーからの取得を透過的に行う
 */

import type { NostrEvent } from './client'
import { eventCache } from '../cache/eventCache'

export interface Filter {
  kinds?: number[]
  authors?: string[]
  '#d'?: string[]
  limit?: number
}

export interface SubscriptionOptions {
  useCache?: boolean // キャッシュを使うか（デフォルト: true）
  timeout?: number // タイムアウト（ミリ秒、デフォルト: 3000）
  onCache?: (events: NostrEvent[]) => void // キャッシュから取得時のコールバック
  onRelay?: (events: NostrEvent[]) => void // リレーから取得時のコールバック
}

export class CachedRelayClient {
  private subscribeFunc: (id: string, filters: Filter[], onEvent: (event: NostrEvent) => void) => void
  private unsubscribeFunc: (id: string) => void
  
  constructor(
    subscribe: (id: string, filters: Filter[], onEvent: (event: NostrEvent) => void) => void,
    unsubscribe: (id: string) => void
  ) {
    this.subscribeFunc = subscribe
    this.unsubscribeFunc = unsubscribe
  }
  
  /**
   * イベントを取得（キャッシュ優先、リレーでも更新）
   * 
   * キャッシュがあれば即座にそれを返し、並行してリレーからも取得して
   * onRelayコールバックで通知する（重複は除外）
   */
  async fetchEvents(
    filters: Filter[],
    options: SubscriptionOptions = {}
  ): Promise<NostrEvent[]> {
    const {
      useCache = true,
      timeout = 3000,
      onCache,
      onRelay,
    } = options
    
    // キャッシュから取得して即座に返す
    let cachedEvents: NostrEvent[] = []
    const cachedEventIds = new Set<string>()
    
    if (useCache) {
      cachedEvents = await this.getFromCache(filters)
      if (cachedEvents.length > 0) {
        console.log(`[CachedRelay] Loaded ${cachedEvents.length} events from cache`)
        // キャッシュイベントのIDを記録
        cachedEvents.forEach(event => cachedEventIds.add(event.id))
        onCache?.(cachedEvents)
      }
    }
    
    // リレーから非同期で取得（並行処理）
    const subscriptionId = `cached-relay-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const eventMap = new Map<string, NostrEvent>()
    
    this.subscribeFunc(subscriptionId, filters, async (event) => {
      eventMap.set(event.id, event)
      // キャッシュに自動保存
      await eventCache.set(event).catch(err => {
        console.error('[CachedRelay] Failed to cache event:', err)
      })
    })
    
    // タイムアウト後にリレーからの取得を完了
    setTimeout(() => {
      this.unsubscribeFunc(subscriptionId)
      
      // リレーから取得したイベントのうち、キャッシュになかったもののみを通知
      const relayEvents = Array.from(eventMap.values())
      const newEvents = relayEvents.filter(event => !cachedEventIds.has(event.id))
      
      if (newEvents.length > 0) {
        console.log(`[CachedRelay] Loaded ${newEvents.length} new events from relay (${relayEvents.length - newEvents.length} duplicates filtered)`)
        onRelay?.(newEvents)
      } else if (relayEvents.length > 0) {
        console.log(`[CachedRelay] All ${relayEvents.length} events from relay were already cached`)
      }
    }, timeout)
    
    // キャッシュを即座に返す（リレーからの取得は並行して進行）
    return cachedEvents
  }
  
  /**
   * イベントをリアルタイムで監視（キャッシュから初期データ取得 + リレーで更新）
   */
  async subscribeEvents(
    filters: Filter[],
    onEvent: (event: NostrEvent, source: 'cache' | 'relay') => void,
    options: SubscriptionOptions = {}
  ): Promise<string> {
    const { useCache = true } = options
    const subscriptionId = `cached-relay-sub-${Date.now()}-${Math.random().toString(36).slice(2)}`
    
    // キャッシュから初期データを取得して通知
    if (useCache) {
      const cachedEvents = await this.getFromCache(filters)
      cachedEvents.forEach(event => {
        onEvent(event, 'cache')
      })
      console.log(`[CachedRelay] Emitted ${cachedEvents.length} events from cache`)
    }
    
    // リレーをサブスクライブ
    this.subscribeFunc(subscriptionId, filters, async (event) => {
      // キャッシュに自動保存
      await eventCache.set(event).catch(err => {
        console.error('[CachedRelay] Failed to cache event:', err)
      })
      
      onEvent(event, 'relay')
    })
    
    return subscriptionId
  }
  
  /**
   * サブスクリプションを解除
   */
  unsubscribeEvents(subscriptionId: string): void {
    this.unsubscribeFunc(subscriptionId)
  }
  
  /**
   * キャッシュから取得（内部用）
   */
  private async getFromCache(filters: Filter[]): Promise<NostrEvent[]> {
    // 複数のフィルターに対応
    const allEvents: NostrEvent[] = []
    
    for (const filter of filters) {
      let events: NostrEvent[] = []
      
      if (filter.kinds && filter.kinds.length > 0) {
        if (filter.authors && filter.authors.length > 0) {
          // kind + author で絞り込み
          for (const kind of filter.kinds) {
            for (const author of filter.authors) {
              const cached = await eventCache.getByKindAndAuthor(kind, author)
              events.push(...cached)
            }
          }
        } else {
          // kind のみで絞り込み
          for (const kind of filter.kinds) {
            const cached = await eventCache.getByKind(kind)
            events.push(...cached)
          }
        }
      } else if (filter.authors && filter.authors.length > 0) {
        // author のみで絞り込み
        for (const author of filter.authors) {
          const cached = await eventCache.getByAuthor(author)
          events.push(...cached)
        }
      }
      
      // dタグでフィルタリング
      if (filter['#d'] && filter['#d'].length > 0) {
        const dTags = filter['#d']
        events = events.filter(event => {
          const dTag = event.tags.find(tag => tag[0] === 'd')
          return dTag && dTags.includes(dTag[1])
        })
      }
      
      allEvents.push(...events)
    }
    
    // 重複を削除
    const uniqueEvents = Array.from(
      new Map(allEvents.map(e => [e.id, e])).values()
    )
    
    // limit を適用
    const limit = filters[0]?.limit
    if (limit && uniqueEvents.length > limit) {
      // created_at で降順ソートして limit 件取得
      return uniqueEvents
        .sort((a, b) => b.created_at - a.created_at)
        .slice(0, limit)
    }
    
    return uniqueEvents
  }
}

/**
 * RelayContext で使うヘルパー
 */
export function createCachedRelayClient(
  subscribe: (id: string, filters: Filter[], onEvent: (event: NostrEvent) => void) => void,
  unsubscribe: (id: string) => void
): CachedRelayClient {
  return new CachedRelayClient(subscribe, unsubscribe)
}


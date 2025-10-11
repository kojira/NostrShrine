/**
 * Nostrリレー接続管理
 * 
 * WebSocketを使用してNostrリレーとの通信を管理します。
 */

import type { NostrEvent } from './client'

/**
 * リレー接続状態
 */
export const RelayStatus = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
} as const

export type RelayStatus = typeof RelayStatus[keyof typeof RelayStatus]

/**
 * サブスクリプションフィルター
 */
export interface Filter {
  ids?: string[]
  authors?: string[]
  kinds?: number[]
  '#e'?: string[]
  '#p'?: string[]
  '#d'?: string[]
  since?: number
  until?: number
  limit?: number
}

/**
 * リレー接続
 */
export class RelayConnection {
  private url: string
  private ws: WebSocket | null = null
  private status: RelayStatus = RelayStatus.DISCONNECTED
  private subscriptions = new Map<string, (event: NostrEvent) => void>()
  private reconnectTimer: number | null = null
  private reconnectDelay = 1000
  
  constructor(url: string) {
    this.url = url
  }
  
  /**
   * 接続
   */
  async connect(): Promise<void> {
    if (this.status === RelayStatus.CONNECTED || this.status === RelayStatus.CONNECTING) {
      return
    }
    
    return new Promise((resolve, reject) => {
      try {
        this.status = RelayStatus.CONNECTING
        this.ws = new WebSocket(this.url)
        
        this.ws.onopen = () => {
          this.status = RelayStatus.CONNECTED
          this.reconnectDelay = 1000
          console.log(`[Relay] Connected to ${this.url}`)
          resolve()
        }
        
        this.ws.onerror = (error) => {
          this.status = RelayStatus.ERROR
          console.error(`[Relay] Error: ${this.url}`, error)
          reject(new Error(`Failed to connect to ${this.url}`))
        }
        
        this.ws.onclose = () => {
          this.status = RelayStatus.DISCONNECTED
          console.log(`[Relay] Disconnected from ${this.url}`)
          this.scheduleReconnect()
        }
        
        this.ws.onmessage = (msg) => {
          this.handleMessage(msg.data)
        }
      } catch (error) {
        this.status = RelayStatus.ERROR
        reject(error)
      }
    })
  }
  
  /**
   * 切断
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    
    this.status = RelayStatus.DISCONNECTED
    this.subscriptions.clear()
  }
  
  /**
   * 再接続スケジュール
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
      console.log(`[Relay] Reconnecting to ${this.url}...`)
      this.connect().catch(console.error)
    }, this.reconnectDelay)
  }
  
  /**
   * イベント送信
   */
  async publishEvent(event: NostrEvent): Promise<void> {
    if (this.status !== RelayStatus.CONNECTED || !this.ws) {
      throw new Error('Not connected to relay')
    }
    
    const message = JSON.stringify(['EVENT', event])
    this.ws.send(message)
  }
  
  /**
   * サブスクリプション作成
   */
  subscribe(subscriptionId: string, filters: Filter[], onEvent: (event: NostrEvent) => void): void {
    if (this.status !== RelayStatus.CONNECTED || !this.ws) {
      throw new Error('Not connected to relay')
    }
    
    this.subscriptions.set(subscriptionId, onEvent)
    const message = JSON.stringify(['REQ', subscriptionId, ...filters])
    this.ws.send(message)
  }
  
  /**
   * サブスクリプション解除
   */
  unsubscribe(subscriptionId: string): void {
    if (this.ws && this.status === RelayStatus.CONNECTED) {
      const message = JSON.stringify(['CLOSE', subscriptionId])
      this.ws.send(message)
    }
    
    this.subscriptions.delete(subscriptionId)
  }
  
  /**
   * メッセージ処理
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data)
      const [type, ...rest] = message
      
      switch (type) {
        case 'EVENT': {
          const [subscriptionId, event] = rest
          const handler = this.subscriptions.get(subscriptionId)
          if (handler) {
            handler(event)
          }
          break
        }
        case 'OK': {
          const [eventId, success, message] = rest
          if (success) {
            console.log(`[Relay] Event ${eventId} published successfully`)
          } else {
            console.error(`[Relay] Failed to publish event ${eventId}: ${message}`)
          }
          break
        }
        case 'EOSE': {
          const [subscriptionId] = rest
          console.log(`[Relay] End of stored events for subscription ${subscriptionId}`)
          break
        }
        case 'NOTICE': {
          const [notice] = rest
          console.log(`[Relay] Notice: ${notice}`)
          break
        }
        default:
          console.warn(`[Relay] Unknown message type: ${type}`)
      }
    } catch (error) {
      console.error('[Relay] Failed to parse message:', error)
    }
  }
  
  /**
   * 接続状態取得
   */
  getStatus(): RelayStatus {
    return this.status
  }
  
  /**
   * URL取得
   */
  getUrl(): string {
    return this.url
  }
}

/**
 * 複数リレー管理
 */
export class RelayPool {
  private relays = new Map<string, RelayConnection>()
  
  /**
   * リレー追加
   */
  addRelay(url: string): RelayConnection {
    if (this.relays.has(url)) {
      return this.relays.get(url)!
    }
    
    const relay = new RelayConnection(url)
    this.relays.set(url, relay)
    return relay
  }
  
  /**
   * リレー削除
   */
  removeRelay(url: string): void {
    const relay = this.relays.get(url)
    if (relay) {
      relay.disconnect()
      this.relays.delete(url)
    }
  }
  
  /**
   * 全リレーに接続
   */
  async connectAll(): Promise<void> {
    const promises = Array.from(this.relays.values()).map(relay => 
      relay.connect().catch(error => {
        console.error(`Failed to connect to ${relay.getUrl()}:`, error)
      })
    )
    
    await Promise.all(promises)
  }
  
  /**
   * 全リレーから切断
   */
  disconnectAll(): void {
    this.relays.forEach(relay => relay.disconnect())
  }
  
  /**
   * 全リレーにイベント送信
   */
  async publishToAll(event: NostrEvent): Promise<void> {
    const promises = Array.from(this.relays.values())
      .filter(relay => relay.getStatus() === RelayStatus.CONNECTED)
      .map(relay => relay.publishEvent(event).catch(error => {
        console.error(`Failed to publish to ${relay.getUrl()}:`, error)
      }))
    
    await Promise.all(promises)
  }
  
  /**
   * 全リレーにサブスクリプション
   */
  subscribeToAll(subscriptionId: string, filters: Filter[], onEvent: (event: NostrEvent) => void): void {
    this.relays.forEach(relay => {
      if (relay.getStatus() === RelayStatus.CONNECTED) {
        relay.subscribe(subscriptionId, filters, onEvent)
      }
    })
  }
  
  /**
   * 全リレーからサブスクリプション解除
   */
  unsubscribeFromAll(subscriptionId: string): void {
    this.relays.forEach(relay => relay.unsubscribe(subscriptionId))
  }
  
  /**
   * リレー一覧取得
   */
  getRelays(): RelayConnection[] {
    return Array.from(this.relays.values())
  }
}


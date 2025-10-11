/**
 * アプリケーション設定を取得するフック
 */

import { useState, useEffect, useCallback } from 'react'
import { useRelay } from '../contexts/RelayContext'
import { KIND, D_TAG, DEFAULT_SETTINGS } from '../config/constants'

interface AppSettings {
  omikujiCooldownMinutes: number
  relays: string[]
}

export function useSettings() {
  const { cachedClient } = useRelay()
  const [settings, setSettings] = useState<AppSettings>({
    omikujiCooldownMinutes: DEFAULT_SETTINGS.omikujiCooldownMinutes,
    relays: [...DEFAULT_SETTINGS.relays],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    setIsLoading(true)
    try {
      const events = await cachedClient.fetchEvents(
        [{ kinds: [KIND.APP_SETTINGS], '#d': [D_TAG.APP_SETTINGS], limit: 1 }],
        {
          onCache: (cached) => {
            if (cached.length > 0) {
              const content = JSON.parse(cached[0].content)
              setSettings(content)
            }
            setIsLoading(false)
          },
          onRelay: (newEvents) => {
            if (newEvents.length > 0) {
              const content = JSON.parse(newEvents[0].content)
              setSettings(content)
            }
          }
        }
      )

      if (events.length > 0) {
        const content = JSON.parse(events[0].content)
        setSettings(content)
      }
      setIsLoading(false)
    } catch (err) {
      console.error('[Settings] Failed to fetch:', err)
      setError('設定の取得に失敗しました')
      setIsLoading(false)
    }
  }, [cachedClient])

  useEffect(() => {
    fetchSettings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    settings,
    isLoading,
    error,
    refetch: fetchSettings,
  }
}


/**
 * 管理者用設定画面コンポーネント
 */

import { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material'
import { useRelay } from '../../contexts/RelayContext'
import { useAuth } from '../../contexts/AuthContext'
import { KIND, D_TAG, DEFAULT_SETTINGS } from '../../config/constants'
import type { NostrEvent } from '../../lib/nostr/client'

interface AppSettings {
  omikujiCooldownMinutes: number
  relays: string[]
}

export function Settings() {
  const { publicKey } = useAuth()
  const { cachedClient, publishEvent } = useRelay()
  const [settings, setSettings] = useState<AppSettings>({
    omikujiCooldownMinutes: DEFAULT_SETTINGS.omikujiCooldownMinutes,
    relays: [...DEFAULT_SETTINGS.relays],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // 設定を取得
  useEffect(() => {
    const fetchSettings = async () => {
      if (!publicKey) return

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
    }

    fetchSettings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey])

  const handleSave = async () => {
    if (!publicKey) {
      setError('ログインしてください')
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // kind 10394 replaceable event を作成
      const event: NostrEvent = {
        id: '',
        pubkey: publicKey,
        created_at: Math.floor(Date.now() / 1000),
        kind: KIND.APP_SETTINGS,
        tags: [
          ['d', D_TAG.APP_SETTINGS],
        ],
        content: JSON.stringify(settings),
        sig: '',
      }

      // NIP-07で署名して公開
      if (window.nostr) {
        const signedEvent = await window.nostr.signEvent(event)
        await publishEvent(signedEvent)
        setSuccess('設定を保存しました')
      } else {
        throw new Error('NIP-07 extension not found')
      }
    } catch (err) {
      console.error('[Settings] Failed to save:', err)
      setError('設定の保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        アプリケーション設定
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <TextField
          label="おみくじクールダウン時間（分）"
          type="number"
          value={settings.omikujiCooldownMinutes}
          onChange={(e) => setSettings({ ...settings, omikujiCooldownMinutes: parseInt(e.target.value) || 0 })}
          fullWidth
          helperText="ユーザーがおみくじを引ける間隔を分単位で設定します"
          InputProps={{ inputProps: { min: 1 } }}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving}
          startIcon={isSaving && <CircularProgress size={16} />}
        >
          {isSaving ? '保存中...' : '保存'}
        </Button>
      </Box>
    </Paper>
  )
}


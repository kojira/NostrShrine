/**
 * おみくじコンポーネント
 */

import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  Card,
  CardContent,
} from '@mui/material'
import { useOmikuji } from '../hooks/useOmikuji'
import { useSettings } from '../hooks/useSettings'
import { useAuth } from '../contexts/AuthContext'
import { useRelay } from '../contexts/RelayContext'
import { createOmikujiPostEvent, type OmikujiResult } from '../lib/nostr/events'

export function Omikuji() {
  const { publicKey } = useAuth()
  const { publishEvent } = useRelay()
  const { settings } = useSettings()
  const {
    fetchOmikujiList,
    drawOmikuji,
    isLoading,
    error,
    remainingMinutes,
    canDraw,
    omikujiAvailable,
  } = useOmikuji(settings.omikujiCooldownMinutes)
  
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<OmikujiResult | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  
  // 初回マウント時におみくじリストを取得
  useEffect(() => {
    fetchOmikujiList()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  const handleOpen = () => {
    setOpen(true)
    setResult(null)
  }
  
  const handleClose = () => {
    setOpen(false)
  }
  
  const handleDraw = () => {
    setIsDrawing(true)
    
    // アニメーション効果のため少し待機
    setTimeout(() => {
      const drawn = drawOmikuji()
      setResult(drawn)
      setIsDrawing(false)
    }, 1500)
  }
  
  const handlePost = async () => {
    if (!result || !publicKey) return
    
    try {
      setIsPosting(true)
      const event = await createOmikujiPostEvent(publicKey, result)
      await publishEvent(event)
      
      alert('おみくじの結果をNostrに投稿しました！ 🎉')
    } catch (err) {
      console.error('[Omikuji] Post error:', err)
      alert('投稿に失敗しました')
    } finally {
      setIsPosting(false)
    }
  }
  
  const getFortuneBgColor = (fortune: string) => {
    switch (fortune) {
      case '大吉':
        return '#FFD700'
      case '中吉':
        return '#FFA500'
      case '小吉':
        return '#FFE4B5'
      case '吉':
        return '#F0E68C'
      case '末吉':
        return '#E0E0E0'
      case '凶':
        return '#D3D3D3'
      default:
        return '#FFFFFF'
    }
  }
  
  return (
    <>
      <Card 
        sx={{ 
          height: '100%',
          background: (theme) => theme.palette.mode === 'dark' 
            ? 'rgba(26, 26, 26, 0.5)' 
            : 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          border: (theme) => theme.palette.mode === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.05)'
            : '1px solid rgba(0, 0, 0, 0.08)',
        }}
      >
        <CardContent>
          <Box sx={{ textAlign: 'center', py: { xs: 2, sm: 3 } }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
              🎴 おみくじ
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {omikujiAvailable ? '運勢を占いましょう' : 'おみくじを準備中...'}
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={handleOpen}
              disabled={!canDraw || !omikujiAvailable}
              fullWidth
              sx={{ 
                mt: 2,
                background: 'linear-gradient(135deg, #EC4899 0%, #7C3AED 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #DB2777 0%, #6D28D9 100%)',
                }
              }}
            >
              🎴 おみくじを引く
            </Button>
            {!canDraw && remainingMinutes > 0 && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
                次のおみくじまで残り {remainingMinutes} 分
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>
      
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>おみくじ</DialogTitle>
        <DialogContent>
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>おみくじデータを読み込み中...</Typography>
            </Box>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {!result && !isDrawing && !isLoading && (
            <>
              {!canDraw && remainingMinutes > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  次のおみくじまで残り {remainingMinutes} 分です
                </Typography>
              )}
              
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h4" gutterBottom>
                  🎴
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleDraw}
                  disabled={!canDraw || !omikujiAvailable}
                >
                  おみくじを引く
                </Button>
              </Box>
            </>
          )}
          
          {isDrawing && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={60} />
              <Typography variant="h6" sx={{ mt: 2 }}>
                おみくじを引いています...
              </Typography>
            </Box>
          )}
          
          {result && (
            <Paper
              elevation={3}
              sx={{
                p: 3,
                bgcolor: getFortuneBgColor(result.fortune),
                textAlign: 'center',
              }}
            >
              <Typography variant="h3" gutterBottom fontWeight="bold">
                {result.fortune}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-line' }}>
                {result.general}
              </Typography>
              
              {result.love && (
                <Box sx={{ mb: 2, textAlign: 'left' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    💕 恋愛運
                  </Typography>
                  <Typography variant="body2">{result.love}</Typography>
                </Box>
              )}
              
              {result.money && (
                <Box sx={{ mb: 2, textAlign: 'left' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    💰 金運
                  </Typography>
                  <Typography variant="body2">{result.money}</Typography>
                </Box>
              )}
              
              {result.health && (
                <Box sx={{ mb: 2, textAlign: 'left' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    🏥 健康運
                  </Typography>
                  <Typography variant="body2">{result.health}</Typography>
                </Box>
              )}
              
              {result.work && (
                <Box sx={{ mb: 2, textAlign: 'left' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    💼 仕事運
                  </Typography>
                  <Typography variant="body2">{result.work}</Typography>
                </Box>
              )}
              
              {result.lucky_item && (
                <Box sx={{ mb: 1, textAlign: 'left' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    🎁 ラッキーアイテム
                  </Typography>
                  <Typography variant="body2">{result.lucky_item}</Typography>
                </Box>
              )}
              
              {result.lucky_color && (
                <Box sx={{ mb: 1, textAlign: 'left' }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    🎨 ラッキーカラー
                  </Typography>
                  <Typography variant="body2">{result.lucky_color}</Typography>
                </Box>
              )}
            </Paper>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose}>閉じる</Button>
          {result && (
            <Button
              onClick={handlePost}
              variant="contained"
              disabled={isPosting}
              startIcon={isPosting && <CircularProgress size={16} />}
            >
              {isPosting ? '投稿中...' : 'Nostrに投稿'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  )
}


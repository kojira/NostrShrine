/**
 * 参拝コンポーネント
 */

import { useState } from 'react'
import {
  Button,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material'
import { useShrineVisit } from '../hooks/useShrineVisit'

export function ShrineVisit() {
  const { visit, isVisiting, error } = useShrineVisit()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  
  const handleOpen = () => {
    setOpen(true)
    setMessage('')
    setShowSuccess(false)
  }
  
  const handleClose = () => {
    setOpen(false)
  }
  
  const handleVisit = async () => {
    const success = await visit({ message })
    if (success) {
      setShowSuccess(true)
      setTimeout(() => {
        setOpen(false)
      }, 1500)
    }
  }
  
  return (
    <>
      <Button
        variant="contained"
        size="large"
        onClick={handleOpen}
        sx={{ m: 1 }}
      >
        🙏 参拝する
      </Button>
      
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>参拝</DialogTitle>
        <DialogContent>
          {showSuccess ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              参拝を記録しました 🙏
            </Alert>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                参拝の記録をNostrに投稿します
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={3}
                label="メッセージ（任意）"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="祈願内容などを入力できます"
                disabled={isVisiting}
              />
              
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        
        {!showSuccess && (
          <DialogActions>
            <Button onClick={handleClose} disabled={isVisiting}>
              キャンセル
            </Button>
            <Button
              onClick={handleVisit}
              variant="contained"
              disabled={isVisiting}
              startIcon={isVisiting && <CircularProgress size={16} />}
            >
              {isVisiting ? '参拝中...' : '参拝する'}
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </>
  )
}


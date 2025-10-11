/**
 * 参拝動画再生ダイアログ
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  CircularProgress,
} from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import { useVideoList } from '../hooks/useVideoList'

interface ShrineVideoDialogProps {
  open: boolean
  onClose: () => void
}

export function ShrineVideoDialog({ open, onClose }: ShrineVideoDialogProps) {
  const { getRandomVideo, videos } = useVideoList()
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoTitle, setVideoTitle] = useState<string>('')
  
  useEffect(() => {
    if (open && videos.length > 0) {
      const video = getRandomVideo()
      if (video) {
        setVideoUrl(video.data.url)
        setVideoTitle(video.data.title || '参拝動画')
      }
    }
  }, [open, videos, getRandomVideo])
  
  const handleVideoEnded = () => {
    // 動画が終わったら自動で閉じる
    setTimeout(() => {
      onClose()
    }, 1000)
  }
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'rgba(26, 26, 26, 0.98)'
              : 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px)',
          border: (theme) =>
            theme.palette.mode === 'dark'
              ? '1px solid rgba(124, 58, 237, 0.3)'
              : '1px solid rgba(124, 58, 237, 0.2)',
        },
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            zIndex: 1,
            color: 'white',
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            '&:hover': {
              bgcolor: 'rgba(0, 0, 0, 0.7)',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
        
        <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
          {!videoUrl ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px',
                gap: 2,
              }}
            >
              <CircularProgress />
              <Typography color="text.secondary">動画を読み込んでいます...</Typography>
            </Box>
          ) : (
            <Box>
              <Box
                sx={{
                  width: '100%',
                  aspectRatio: '16/9',
                  bgcolor: 'black',
                  position: 'relative',
                }}
              >
                <video
                  key={videoUrl}
                  src={videoUrl}
                  autoPlay
                  controls
                  onEnded={handleVideoEnded}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              </Box>
              
              <Box
                sx={{
                  p: 2,
                  textAlign: 'center',
                  background: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%)'
                      : 'linear-gradient(135deg, rgba(124, 58, 237, 0.05) 0%, rgba(236, 72, 153, 0.05) 100%)',
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: 600,
                  }}
                >
                  {videoTitle}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  参拝ありがとうございます 🙏
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Box>
    </Dialog>
  )
}


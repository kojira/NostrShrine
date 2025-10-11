/**
 * ホームページ（一般ユーザー向け）
 */

import { Box, Typography, Alert } from '@mui/material'
import { ShrineVisit } from '../components/ShrineVisit'
import { Omikuji } from '../components/Omikuji'
import { ShrineHistory } from '../components/ShrineHistory'
import { useAuth } from '../contexts/AuthContext'

export function HomePage() {
  const { isAuthenticated, isNIP07Available } = useAuth()

  return (
    <Box>
      {!isAuthenticated && (
        <Box 
          sx={{ 
            textAlign: 'center', 
            py: 8,
            px: 4,
            mb: 4,
            background: 'rgba(26, 26, 26, 0.5)',
            backdropFilter: 'blur(20px)',
            borderRadius: 4,
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <Typography 
            variant="h2" 
            gutterBottom
            sx={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 700,
              mb: 3,
            }}
          >
            ⛩️ NostrShrine へようこそ
          </Typography>
          <Typography 
            variant="h6" 
            color="text.secondary" 
            paragraph
            sx={{ mb: 3, lineHeight: 1.8 }}
          >
            Nostrベースの神社です。<br />
            NIP-07でログインして参拝しておみくじを引きましょう。
          </Typography>
          {!isNIP07Available && (
            <Alert 
              severity="error"
              sx={{ 
                maxWidth: 500,
                mx: 'auto',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <Typography variant="body2" fontWeight={600}>
                ⚠️ NIP-07拡張機能が見つかりません
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                nos2x、Alby、Flamingo等をインストールしてください。
              </Typography>
            </Alert>
          )}
        </Box>
      )}
      
      {isAuthenticated && (
        <>
          <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 4 }}>
            ⛩️ NostrShrine
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph align="center">
            Nostrベースの神社へようこそ。参拝しておみくじを引きましょう。
          </Typography>
          
          {/* 参拝機能 */}
          <ShrineVisit />
          
          {/* おみくじ機能 */}
          <Omikuji />
        </>
      )}
      
      {/* 参拝履歴（ログインなしでも表示） */}
      <ShrineHistory />
    </Box>
  )
}


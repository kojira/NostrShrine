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
            py: { xs: 4, sm: 6, md: 8 },
            px: { xs: 2, sm: 3, md: 4 },
            mb: { xs: 3, sm: 4 },
            background: 'rgba(26, 26, 26, 0.5)',
            backdropFilter: 'blur(20px)',
            borderRadius: { xs: 3, sm: 4 },
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
              mb: { xs: 2, sm: 3 },
              fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
            }}
          >
            ⛩️ NostrShrine へようこそ
          </Typography>
          <Typography 
            variant="h6" 
            color="text.secondary" 
            paragraph
            sx={{ 
              mb: { xs: 2, sm: 3 }, 
              lineHeight: 1.8,
              fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' },
              px: { xs: 1, sm: 2 },
            }}
          >
            Nostrベースの神社です。<br />
            NIP-07でログインして参拝しておみくじを引きましょう。
          </Typography>
          {!isNIP07Available && (
            <Alert 
              severity="error"
              sx={{ 
                maxWidth: { xs: '100%', sm: 500 },
                mx: 'auto',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                ⚠️ NIP-07拡張機能が見つかりません
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                nos2x、Alby、Flamingo等をインストールしてください。
              </Typography>
            </Alert>
          )}
        </Box>
      )}
      
      {isAuthenticated && (
        <>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom 
            align="center" 
            sx={{ 
              mb: { xs: 2, sm: 3, md: 4 },
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
            }}
          >
            ⛩️ NostrShrine
          </Typography>
          
          <Typography 
            variant="body1" 
            color="text.secondary" 
            paragraph 
            align="center"
            sx={{ 
              fontSize: { xs: '0.9rem', sm: '1rem' },
              px: { xs: 2, sm: 0 },
            }}
          >
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


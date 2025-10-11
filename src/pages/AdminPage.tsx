/**
 * 管理者ページ
 */

import { Box, Typography, Alert, Stack } from '@mui/material'
import { useAdminContext } from '../contexts/AdminContext'
import { Settings } from '../components/admin/Settings'
import { OmikujiGenerator } from '../components/admin/OmikujiGenerator'
import { OmikujiList } from '../components/admin/OmikujiList'
import { VideoGenerator } from '../components/admin/VideoGenerator'
import { VideoList } from '../components/admin/VideoList'

export function AdminPage() {
  const { isAdmin } = useAdminContext()
  
  if (!isAdmin) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          このページにアクセスする権限がありません
        </Alert>
        <Typography variant="body2" color="text.secondary">
          管理者としてログインしてください
        </Typography>
      </Box>
    )
  }
  
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
        🔧 管理者画面
      </Typography>
      
      <Stack spacing={4}>
        {/* アプリケーション設定 */}
        <Settings />
        
        {/* 動画管理セクション */}
        <Box>
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              fontWeight: 600,
              mb: 2,
              background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            参拝動画管理
          </Typography>
          
          <Stack spacing={3}>
            <VideoGenerator />
            <VideoList />
          </Stack>
        </Box>
        
        {/* おみくじ管理セクション */}
        <Box>
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              fontWeight: 600,
              mb: 2,
              background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            おみくじ管理
          </Typography>
          
          <Stack spacing={3}>
            <OmikujiGenerator />
            <OmikujiList />
          </Stack>
        </Box>
      </Stack>
    </Box>
  )
}


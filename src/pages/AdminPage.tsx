/**
 * 管理者ページ
 */

import { Box, Typography, Alert, Paper } from '@mui/material'
import { useAdminContext } from '../contexts/AdminContext'
import { Settings } from '../components/admin/Settings'
import { OmikujiGenerator } from '../components/admin/OmikujiGenerator'
import { OmikujiList } from '../components/admin/OmikujiList'

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
      
      {/* アプリケーション設定 */}
      <Settings />
      
      {/* おみくじ生成 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          おみくじ生成
        </Typography>
        <OmikujiGenerator />
      </Paper>
      
      {/* おみくじ一覧 */}
      <Paper sx={{ p: 3 }}>
        <OmikujiList />
      </Paper>
    </Box>
  )
}


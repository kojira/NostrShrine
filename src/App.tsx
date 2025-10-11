import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Container, Box, AppBar, Toolbar, Typography, Button, Chip } from '@mui/material'
import { useAuth } from './contexts/AuthContext'
import { useRelay } from './contexts/RelayContext'
import { useAdminContext } from './contexts/AdminContext'
import { HomePage } from './pages/HomePage'
import { AdminPage } from './pages/AdminPage'

function AppContent() {
  const { isAuthenticated, npub, isNIP07Available, login, logout, isLoading } = useAuth()
  const { relays, isConnected } = useRelay()
  const { isAdmin } = useAdminContext()
  const location = useLocation()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* ヘッダー */}
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              ⛩️ NostrShrine
            </Link>
          </Typography>
          
          {/* ナビゲーション */}
          {isAuthenticated && (
            <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
              <Button
                component={Link}
                to="/"
                variant={location.pathname === '/' ? 'contained' : 'text'}
                size="small"
              >
                ホーム
              </Button>
              {isAdmin && (
                <Button
                  component={Link}
                  to="/admin"
                  variant={location.pathname === '/admin' ? 'contained' : 'text'}
                  size="small"
                  color="secondary"
                >
                  管理画面
                </Button>
              )}
            </Box>
          )}
          
          {relays.length > 0 && (
            <Chip
              label={isConnected ? '接続中' : '未接続'}
              color={isConnected ? 'success' : 'default'}
              size="small"
              sx={{ mr: 2 }}
            />
          )}
          
          {isAuthenticated ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ mr: 1 }}>
                {npub?.slice(0, 12)}...
              </Typography>
              <Button onClick={logout} variant="outlined" size="small">
                ログアウト
              </Button>
            </Box>
          ) : (
            <Button
              onClick={login}
              variant="contained"
              disabled={!isNIP07Available || isLoading}
            >
              {isLoading ? '確認中...' : 'NIP-07でログイン'}
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* メインコンテンツ */}
      <Container maxWidth="md" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Box sx={{ mt: 4 }}>
          {!isAuthenticated ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h5" gutterBottom>
                ⛩️ NostrShrine へようこそ
              </Typography>
              <Typography color="text.secondary" paragraph>
                Nostrベースの神社です。NIP-07でログインして参拝しましょう。
              </Typography>
              {!isNIP07Available && (
                <Typography color="error" variant="body2">
                  NIP-07拡張機能が見つかりません。<br />
                  nos2x、Alby、Flamingo等をインストールしてください。
                </Typography>
              )}
            </Box>
          ) : (
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          )}
        </Box>
      </Container>

      {/* フッター */}
      <Box sx={{ bgcolor: 'background.paper', py: 2, borderTop: 1, borderColor: 'divider', mt: 'auto' }}>
        <Container maxWidth="md">
          <Typography variant="body2" color="text.secondary" align="center">
            Powered by Nostr · Built with rust-nostr WASM
          </Typography>
        </Container>
      </Box>
    </Box>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App

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
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'linear-gradient(135deg, #0F0F0F 0%, #1A1A2E 100%)' }}>
      {/* ヘッダー */}
      <AppBar 
        position="static" 
        sx={{ 
          background: 'rgba(26, 26, 26, 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        }} 
        elevation={0}
      >
        <Toolbar sx={{ py: { xs: 0.5, sm: 1 }, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
          <Typography 
            variant="h5" 
            sx={{ 
              flexGrow: 1,
              background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 700,
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
            }}
          >
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⛩️ <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>NostrShrine</Box>
            </Link>
          </Typography>
          
          {/* ナビゲーション */}
          {isAuthenticated && (
            <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 }, mr: { xs: 1, sm: 2 } }}>
              <Button
                component={Link}
                to="/"
                variant={location.pathname === '/' ? 'contained' : 'text'}
                size={window.innerWidth < 600 ? 'small' : 'medium'}
                sx={{
                  ...(location.pathname === '/' && {
                    background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
                  }),
                  minWidth: { xs: 'auto', sm: '64px' },
                  px: { xs: 1.5, sm: 2 },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>ホーム</Box>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>🏠</Box>
              </Button>
              {isAdmin && (
                <Button
                  component={Link}
                  to="/admin"
                  variant={location.pathname === '/admin' ? 'contained' : 'text'}
                  size={window.innerWidth < 600 ? 'small' : 'medium'}
                  sx={{
                    ...(location.pathname === '/admin' && {
                      background: 'linear-gradient(135deg, #EC4899 0%, #7C3AED 100%)',
                    }),
                    minWidth: { xs: 'auto', sm: '64px' },
                    px: { xs: 1.5, sm: 2 },
                  }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>管理</Box>
                  <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>⚙️</Box>
                </Button>
              )}
            </Box>
          )}
          
          {relays.length > 0 && (
            <Chip
              label={isConnected ? '🟢' : '⚪'}
              size="small"
              sx={{ 
                mr: { xs: 0.5, sm: 2 },
                display: { xs: 'none', md: 'flex' },
                background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                border: isConnected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                color: isConnected ? '#10B981' : 'text.secondary',
                minWidth: 'auto',
              }}
            />
          )}
          
          {isAuthenticated ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  mr: { xs: 0.5, sm: 1 },
                  px: { xs: 1, sm: 2 },
                  py: 0.5,
                  background: 'rgba(124, 58, 237, 0.1)',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                  borderRadius: 2,
                  fontFamily: 'monospace',
                  display: { xs: 'none', sm: 'block' },
                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                }}
              >
                {npub?.slice(0, 12)}...
              </Typography>
              <Button 
                onClick={logout} 
                variant="outlined"
                size="small"
                sx={{
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  '&:hover': {
                    borderColor: 'rgba(239, 68, 68, 0.5)',
                    background: 'rgba(239, 68, 68, 0.1)',
                  },
                  minWidth: { xs: 'auto', sm: '80px' },
                  px: { xs: 1, sm: 2 },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>ログアウト</Box>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>🚪</Box>
              </Button>
            </Box>
          ) : (
            <Button
              onClick={login}
              variant="contained"
              size="small"
              disabled={!isNIP07Available || isLoading}
              sx={{
                background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #6D28D9 0%, #DB2777 100%)',
                },
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                px: { xs: 1.5, sm: 2 },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                {isLoading ? '確認中...' : 'NIP-07でログイン'}
              </Box>
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                {isLoading ? '...' : 'ログイン'}
              </Box>
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* メインコンテンツ */}
      <Container 
        maxWidth="xl" 
        sx={{ 
          mt: { xs: 2, sm: 3, md: 4 }, 
          mb: { xs: 2, sm: 3, md: 4 }, 
          px: { xs: 2, sm: 3, md: 4 },
          flexGrow: 1,
        }}
      >
        <Box sx={{ mt: { xs: 2, sm: 3, md: 4 } }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            {isAuthenticated && <Route path="/admin" element={<AdminPage />} />}
          </Routes>
        </Box>
      </Container>

      {/* フッター */}
      <Box 
        sx={{ 
          background: 'rgba(26, 26, 26, 0.8)',
          backdropFilter: 'blur(20px)',
          py: 3, 
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          mt: 'auto',
        }}
      >
        <Container maxWidth="md">
          <Typography 
            variant="body2" 
            color="text.secondary" 
            align="center"
            sx={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 600,
            }}
          >
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

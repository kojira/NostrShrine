import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { Box, AppBar, Toolbar, Typography, Button, Chip, Avatar, Menu, MenuItem, ListItemIcon, ListItemText, IconButton } from '@mui/material'
import { useState, useEffect } from 'react'
import PersonIcon from '@mui/icons-material/Person'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import LogoutIcon from '@mui/icons-material/Logout'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import { useAuth } from './contexts/AuthContext'
import { useRelay } from './contexts/RelayContext'
import { useAdminContext } from './contexts/AdminContext'
import { profileCache } from './lib/cache/profileCache'
import { useThemeContext } from './contexts/ThemeContext'
import { HomePage } from './pages/HomePage'
import { AdminPage } from './pages/AdminPage'

function AppContent() {
  const { isAuthenticated, publicKey, isNIP07Available, login, logout, isLoading } = useAuth()
  const { relays, isConnected, cachedClient } = useRelay()
  const { isAdmin } = useAdminContext()
  const { mode, toggleTheme } = useThemeContext()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [profile, setProfile] = useState<{ name?: string; display_name?: string; picture?: string } | null>(null)

  // プロフィール情報を取得
  useEffect(() => {
    if (!publicKey) return

    const fetchProfile = async () => {
      try {
        const cached = await profileCache.get(publicKey)
        if (cached) {
          setProfile(cached.profile)
        }

        // リレーから最新のプロフィールを取得
        await cachedClient.fetchEvents(
          [{ kinds: [0], authors: [publicKey], limit: 1 }],
          {
            onCache: (cachedEvents) => {
              if (cachedEvents.length > 0) {
                const profileData = JSON.parse(cachedEvents[0].content)
                setProfile(profileData)
              }
            },
            onRelay: (newEvents) => {
              if (newEvents.length > 0) {
                const profileData = JSON.parse(newEvents[0].content)
                setProfile(profileData)
              }
            }
          }
        )
      } catch (err) {
        console.error('[App] Failed to fetch profile:', err)
      }
    }

    fetchProfile()
  }, [publicKey, cachedClient])

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    handleMenuClose()
    logout()
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      width: '100%',
      background: mode === 'dark' 
        ? 'linear-gradient(135deg, #0F0F0F 0%, #1A1A2E 100%)' 
        : 'linear-gradient(135deg, #F5F5F7 0%, #E5E5EA 100%)',
    }}>
      {/* ヘッダー */}
      <AppBar 
        position="static" 
        sx={{ 
          background: mode === 'dark' 
            ? 'rgba(26, 26, 26, 0.8)' 
            : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: mode === 'dark' 
            ? '1px solid rgba(255, 255, 255, 0.05)' 
            : '1px solid rgba(0, 0, 0, 0.08)',
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
              mr: { xs: 2, sm: 3 },
            }}
          >
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⛩️ <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>NostrShrine</Box>
            </Link>
          </Typography>
          
          {/* テーマ切り替えボタン */}
          <IconButton 
            onClick={toggleTheme} 
            sx={{ 
              mr: 1,
              color: mode === 'dark' ? 'white' : 'black',
              '&:hover': {
                background: mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(0, 0, 0, 0.05)',
              }
            }}
          >
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
          
          {relays.length > 0 && (
            <Chip
              label={isConnected ? '🟢' : '⚪'}
              size="small"
              sx={{ 
                mr: { xs: 0.5, sm: 2 },
                display: { xs: 'none', md: 'flex' },
                background: (theme) => isConnected 
                  ? 'rgba(16, 185, 129, 0.1)' 
                  : theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.05)' 
                    : 'rgba(0, 0, 0, 0.05)',
                border: (theme) => isConnected 
                  ? '1px solid rgba(16, 185, 129, 0.3)' 
                  : theme.palette.mode === 'dark'
                    ? '1px solid rgba(255, 255, 255, 0.1)'
                    : '1px solid rgba(0, 0, 0, 0.1)',
                color: isConnected ? '#10B981' : 'text.secondary',
                minWidth: 'auto',
              }}
            />
          )}
          
          {isAuthenticated ? (
            <>
              <Box 
                onClick={handleMenuOpen}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1.5,
                  cursor: 'pointer',
                  px: 2,
                  py: 1,
                  borderRadius: 3,
                  background: (theme) => theme.palette.mode === 'dark'
                    ? 'rgba(124, 58, 237, 0.1)'
                    : 'rgba(124, 58, 237, 0.08)',
                  border: (theme) => theme.palette.mode === 'dark'
                    ? '1px solid rgba(124, 58, 237, 0.3)'
                    : '1px solid rgba(124, 58, 237, 0.25)',
                  transition: 'all 0.2s',
                  '&:hover': {
                    background: (theme) => theme.palette.mode === 'dark'
                      ? 'rgba(124, 58, 237, 0.2)'
                      : 'rgba(124, 58, 237, 0.15)',
                    border: (theme) => theme.palette.mode === 'dark'
                      ? '1px solid rgba(124, 58, 237, 0.5)'
                      : '1px solid rgba(124, 58, 237, 0.4)',
                  }
                }}
              >
                <Avatar 
                  src={profile?.picture}
                  alt={profile?.display_name || profile?.name}
                  sx={{ 
                    width: 32, 
                    height: 32,
                    border: (theme) => theme.palette.mode === 'dark'
                      ? '2px solid rgba(124, 58, 237, 0.5)'
                      : '2px solid rgba(124, 58, 237, 0.4)',
                    bgcolor: (theme) => theme.palette.mode === 'dark'
                      ? 'rgba(124, 58, 237, 0.3)'
                      : 'rgba(124, 58, 237, 0.2)',
                    color: (theme) => theme.palette.mode === 'dark'
                      ? 'white'
                      : 'black',
                  }}
                >
                  {!profile?.picture && <PersonIcon />}
                </Avatar>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 600,
                    display: { xs: 'none', sm: 'block' },
                    color: (theme) => theme.palette.mode === 'dark'
                      ? 'white'
                      : 'black',
                  }}
                >
                  {profile?.display_name || profile?.name || `npub...${publicKey?.slice(-8)}`}
                </Typography>
              </Box>
              
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                sx={{
                  mt: 1,
                  '& .MuiPaper-root': {
                    background: (theme) => theme.palette.mode === 'dark'
                      ? 'rgba(26, 26, 26, 0.95)'
                      : 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: (theme) => theme.palette.mode === 'dark'
                      ? '1px solid rgba(255, 255, 255, 0.1)'
                      : '1px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: 2,
                    minWidth: 200,
                  }
                }}
              >
                {isAdmin && (
                  <MenuItem 
                    component={Link} 
                    to="/admin" 
                    onClick={handleMenuClose}
                    sx={{
                      '&:hover': {
                        background: 'rgba(124, 58, 237, 0.2)',
                      }
                    }}
                  >
                    <ListItemIcon>
                      <AdminPanelSettingsIcon fontSize="small" sx={{ color: '#7C3AED' }} />
                    </ListItemIcon>
                    <ListItemText>管理画面</ListItemText>
                  </MenuItem>
                )}
                <MenuItem 
                  onClick={handleLogout}
                  sx={{
                    '&:hover': {
                      background: 'rgba(239, 68, 68, 0.2)',
                    }
                  }}
                >
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" sx={{ color: '#EF4444' }} />
                  </ListItemIcon>
                  <ListItemText>ログアウト</ListItemText>
                </MenuItem>
              </Menu>
            </>
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
      <Box 
        sx={{ 
          mt: { xs: 2, sm: 3, md: 4 }, 
          mb: { xs: 2, sm: 3, md: 4 }, 
          px: { xs: 2, sm: 3, md: 6, lg: 8 },
          maxWidth: '1920px',
          width: 'calc(100% - 0px)',
          mx: 'auto',
          flexGrow: 1,
        }}
      >
        <Box sx={{ mt: { xs: 2, sm: 3, md: 4 } }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            {isAuthenticated && <Route path="/admin" element={<AdminPage />} />}
          </Routes>
        </Box>
      </Box>

      {/* フッター */}
      <Box 
        sx={{ 
          background: mode === 'dark' 
            ? 'rgba(26, 26, 26, 0.8)' 
            : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          py: 3,
          borderTop: mode === 'dark' 
            ? '1px solid rgba(255, 255, 255, 0.05)' 
            : '1px solid rgba(0, 0, 0, 0.08)',
          mt: 'auto',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <a
            href="https://github.com/kojira/NostrShrine"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{
                background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 600,
                transition: 'all 0.2s',
                '&:hover': {
                  opacity: 0.8,
                  transform: 'translateY(-1px)',
                }
              }}
            >
              View Source on GitHub · ⭐ Star us if you like it!
            </Typography>
          </a>
        </Box>
      </Box>
    </Box>
  )
}

function App() {
  // GitHub Pagesのベースパスを設定（本番環境のみ）
  const basename = import.meta.env.MODE === 'production' ? '/NostrShrine' : '/'
  
  return (
    <BrowserRouter basename={basename}>
      <AppContent />
    </BrowserRouter>
  )
}

export default App

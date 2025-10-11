import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { RelayProvider } from './contexts/RelayContext'
import { AdminProvider } from './contexts/AdminContext'
import { ThemeProvider as CustomThemeProvider, useThemeContext } from './contexts/ThemeContext'

// テーマ作成関数
export const createAppTheme = (mode: 'dark' | 'light') => createTheme({
  palette: {
    mode,
    primary: {
      main: '#7C3AED', // バイオレット
      light: '#A78BFA',
      dark: '#5B21B6',
    },
    secondary: {
      main: '#EC4899', // ピンク
      light: '#F472B6',
      dark: '#BE185D',
    },
    background: mode === 'dark' ? {
      default: '#0F0F0F', // ディープブラック
      paper: '#1A1A1A', // ダークグレー
    } : {
      default: '#F5F5F7', // ライトグレー
      paper: '#FFFFFF', // ホワイト
    },
    text: mode === 'dark' ? {
      primary: '#F9FAFB',
      secondary: '#D1D5DB',
    } : {
      primary: '#1A1A1A',
      secondary: '#6B7280',
    },
    success: {
      main: '#10B981',
    },
    warning: {
      main: '#F59E0B',
    },
    error: {
      main: '#EF4444',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Hiragino Sans"',
      '"Hiragino Kaku Gothic ProN"',
      'Meiryo',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 700,
      fontSize: '3rem',
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2.25rem',
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.875rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          padding: '10px 24px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.4)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundImage: 'none',
          borderRadius: 16,
          border: theme.palette.mode === 'dark' 
            ? '1px solid rgba(255, 255, 255, 0.05)' 
            : '1px solid rgba(0, 0, 0, 0.08)',
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 16,
          border: theme.palette.mode === 'dark' 
            ? '1px solid rgba(255, 255, 255, 0.05)' 
            : '1px solid rgba(0, 0, 0, 0.08)',
        }),
      },
    },
  },
})

// テーマを使用するラッパーコンポーネント
function AppWithTheme() {
  const { mode } = useThemeContext()
  const theme = createAppTheme(mode)

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <RelayProvider>
          <AdminProvider>
            <App />
          </AdminProvider>
        </RelayProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CustomThemeProvider>
      <AppWithTheme />
    </CustomThemeProvider>
  </StrictMode>,
)

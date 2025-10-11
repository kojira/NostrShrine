import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { RelayProvider } from './contexts/RelayContext'
import { AdminProvider } from './contexts/AdminContext'

// MUIテーマ設定（神社テーマ）
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#8B0000', // 深紅（神社の朱色）
    },
    secondary: {
      main: '#DAA520', // 金色
    },
    background: {
      default: '#FFF8DC', // コーンシルク（和紙のような色）
      paper: '#FFFFFF',
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
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
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
  </StrictMode>,
)

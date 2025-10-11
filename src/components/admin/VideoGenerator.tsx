/**
 * 動画生成コンポーネント（管理者用）
 */

import { useState } from 'react'
import {
  Box,
  Button,
  TextField,
  Typography,
  Card,
  CardContent,
  Alert,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Tabs,
  Tab,
} from '@mui/material'
import { VideoCall as VideoCallIcon, Upload as UploadIcon } from '@mui/icons-material'
import { useVideoManagement } from '../../hooks/useVideoManagement'
import { getDefaultShrineVisitPrompt, validatePrompt } from '../../services/video/sora'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`video-tabpanel-${index}`}
      aria-labelledby={`video-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

export function VideoGenerator() {
  const { generateAndUploadVideo, uploadLocalVideo, isProcessing, progress } =
    useVideoManagement()
  
  const [tabValue, setTabValue] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Sora生成用
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('sora-api-key') || '')
  const [prompt, setPrompt] = useState(getDefaultShrineVisitPrompt())
  const [size, setSize] = useState<'1280x720' | '1920x1080' | '720x1280' | '1080x1920'>('1280x720')
  const [seconds, setSeconds] = useState(5)
  
  // ローカルアップロード用
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [videoTitle, setVideoTitle] = useState('')
  const [videoDescription, setVideoDescription] = useState('')
  
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
    setError(null)
    setSuccess(null)
  }
  
  const handleGenerate = async () => {
    setError(null)
    setSuccess(null)
    
    // バリデーション
    if (!apiKey.trim()) {
      setError('OpenAI API Keyを入力してください')
      return
    }
    
    const validation = validatePrompt(prompt)
    if (!validation.valid) {
      setError(validation.error || 'プロンプトが無効です')
      return
    }
    
    try {
      // API Keyを保存
      localStorage.setItem('sora-api-key', apiKey)
      
      await generateAndUploadVideo(apiKey, {
        prompt,
        size,
        seconds,
      })
      
      setSuccess('動画を生成してアップロードしました！')
      setPrompt(getDefaultShrineVisitPrompt()) // リセット
    } catch (err) {
      console.error('[VideoGenerator] Failed to generate:', err)
      setError(err instanceof Error ? err.message : '動画の生成に失敗しました')
    }
  }
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('video/')) {
        setError('動画ファイルを選択してください')
        return
      }
      setSelectedFile(file)
      setVideoTitle(file.name)
      setError(null)
    }
  }
  
  const handleUpload = async () => {
    setError(null)
    setSuccess(null)
    
    if (!selectedFile) {
      setError('動画ファイルを選択してください')
      return
    }
    
    try {
      await uploadLocalVideo(selectedFile, videoTitle, videoDescription)
      
      setSuccess('動画をアップロードしました！')
      setSelectedFile(null)
      setVideoTitle('')
      setVideoDescription('')
    } catch (err) {
      console.error('[VideoGenerator] Failed to upload:', err)
      setError(err instanceof Error ? err.message : '動画のアップロードに失敗しました')
    }
  }
  
  return (
    <Card
      sx={{
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'rgba(124, 58, 237, 0.05)'
            : 'rgba(124, 58, 237, 0.03)',
        border: (theme) =>
          theme.palette.mode === 'dark'
            ? '1px solid rgba(124, 58, 237, 0.2)'
            : '1px solid rgba(124, 58, 237, 0.15)',
      }}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          🎥 参拝動画の生成・アップロード
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Sora APIで動画を生成するか、ローカルの動画ファイルをアップロードできます
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}
        
        {isProcessing && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {progress}
            </Typography>
          </Box>
        )}
        
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab icon={<VideoCallIcon />} label="Soraで生成" />
          <Tab icon={<UploadIcon />} label="ファイルをアップロード" />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          <Stack spacing={3}>
            <TextField
              label="OpenAI API Key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              fullWidth
              helperText="Sora APIを使用するためのOpenAI API Key（ブラウザに保存されます）"
              disabled={isProcessing}
            />
            
            <TextField
              label="プロンプト"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              fullWidth
              multiline
              rows={6}
              helperText="動画生成のためのプロンプト（英語推奨）"
              disabled={isProcessing}
            />
            
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth disabled={isProcessing}>
                <InputLabel>解像度</InputLabel>
                <Select
                  value={size}
                  onChange={(e) => setSize(e.target.value as '1280x720' | '1920x1080' | '720x1280' | '1080x1920')}
                  label="解像度"
                >
                  <MenuItem value="1280x720">1280x720 (HD横)</MenuItem>
                  <MenuItem value="1920x1080">1920x1080 (Full HD横)</MenuItem>
                  <MenuItem value="720x1280">720x1280 (HD縦)</MenuItem>
                  <MenuItem value="1080x1920">1080x1920 (Full HD縦)</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth disabled={isProcessing}>
                <InputLabel>動画の長さ</InputLabel>
                <Select
                  value={seconds}
                  onChange={(e) => setSeconds(Number(e.target.value))}
                  label="動画の長さ"
                >
                  <MenuItem value={3}>3秒</MenuItem>
                  <MenuItem value={5}>5秒</MenuItem>
                  <MenuItem value={10}>10秒</MenuItem>
                  <MenuItem value={15}>15秒</MenuItem>
                  <MenuItem value={20}>20秒</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={isProcessing}
              startIcon={<VideoCallIcon />}
              sx={{
                background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #6D28D9 0%, #DB2777 100%)',
                },
              }}
            >
              動画を生成してアップロード
            </Button>
          </Stack>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Stack spacing={3}>
            <Box>
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadIcon />}
                disabled={isProcessing}
                fullWidth
              >
                動画ファイルを選択
                <input
                  type="file"
                  accept="video/*"
                  hidden
                  onChange={handleFileSelect}
                />
              </Button>
              {selectedFile && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  選択されたファイル: {selectedFile.name} (
                  {(selectedFile.size / 1024 / 1024).toFixed(2)}MB)
                </Typography>
              )}
            </Box>
            
            <TextField
              label="動画のタイトル"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              fullWidth
              disabled={isProcessing}
            />
            
            <TextField
              label="説明（任意）"
              value={videoDescription}
              onChange={(e) => setVideoDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              disabled={isProcessing}
            />
            
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={isProcessing || !selectedFile}
              startIcon={<UploadIcon />}
              sx={{
                background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #6D28D9 0%, #DB2777 100%)',
                },
              }}
            >
              アップロード
            </Button>
          </Stack>
        </TabPanel>
      </CardContent>
    </Card>
  )
}


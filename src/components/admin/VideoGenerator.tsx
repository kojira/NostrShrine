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
  Paper,
  InputAdornment,
  IconButton,
} from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { VideoCall as VideoCallIcon, Upload as UploadIcon } from '@mui/icons-material'
import { useVideoManagement } from '../../hooks/useVideoManagement'
import { getDefaultShrineVisitPrompt, validatePrompt } from '../../services/video/cometapi'

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
  const { generateVideo, uploadGeneratedVideo, uploadLocalVideo, isProcessing, progress } =
    useVideoManagement()
  
  const [tabValue, setTabValue] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Comet API生成用（専用のAPIキー）
  const [cometApiKey, setCometApiKey] = useState(() => localStorage.getItem('comet_api_key') || '')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const hasCometApiKey = Boolean(cometApiKey)
  
  const [prompt, setPrompt] = useState(getDefaultShrineVisitPrompt())
  const [model, setModel] = useState<'sora-2' | 'sora-turbo' | 'sora-1.5' | 'runway-gen3' | 'kling-2.0'>('sora-2')
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9')
  const [duration, setDuration] = useState(5)
  
  // 生成された動画のプレビュー
  const [generatedVideo, setGeneratedVideo] = useState<File | null>(null)
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('')
  
  // ローカルアップロード用
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [videoTitle, setVideoTitle] = useState('')
  const [videoDescription, setVideoDescription] = useState('')
  
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
    setError(null)
    setSuccess(null)
  }
  
  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem('comet_api_key', apiKeyInput.trim())
      setCometApiKey(apiKeyInput.trim())
      setApiKeyInput('')
      setSuccess('Comet API Keyを保存しました')
    }
  }
  
  const handleClearApiKey = () => {
    if (confirm('Comet API Keyを削除しますか？')) {
      localStorage.removeItem('comet_api_key')
      setCometApiKey('')
      setSuccess('Comet API Keyを削除しました')
    }
  }
  
  const handleGenerate = async () => {
    setError(null)
    setSuccess(null)
    
    // バリデーション
    if (!hasCometApiKey) {
      setError('Comet API Keyを設定してください')
      return
    }
    
    const validation = validatePrompt(prompt)
    if (!validation.valid) {
      setError(validation.error || 'プロンプトが無効です')
      return
    }
    
    try {
      // 動画を生成（アップロードはしない）
      const videoFile = await generateVideo(cometApiKey, {
        prompt,
        model,
        duration,
        aspect_ratio: aspectRatio,
      })
      
      // プレビュー用のURLを作成
      const videoUrl = URL.createObjectURL(videoFile)
      
      setGeneratedVideo(videoFile)
      setGeneratedVideoUrl(videoUrl)
      setGeneratedPrompt(prompt)
      setSuccess('動画を生成しました！プレビューを確認してアップロードしてください。')
    } catch (err) {
      console.error('[VideoGenerator] Failed to generate:', err)
      setError(err instanceof Error ? err.message : '動画の生成に失敗しました')
    }
  }
  
  const handleUploadGenerated = async () => {
    if (!generatedVideo) {
      setError('生成された動画がありません')
      return
    }
    
    setError(null)
    setSuccess(null)
    
    try {
      await uploadGeneratedVideo(generatedVideo, generatedPrompt)
      
      setSuccess('動画をアップロードしました！')
      
      // クリーンアップ
      if (generatedVideoUrl) {
        URL.revokeObjectURL(generatedVideoUrl)
      }
      setGeneratedVideo(null)
      setGeneratedVideoUrl(null)
      setGeneratedPrompt('')
      setPrompt(getDefaultShrineVisitPrompt()) // リセット
    } catch (err) {
      console.error('[VideoGenerator] Failed to upload:', err)
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました')
    }
  }
  
  const handleCancelGenerated = () => {
    if (generatedVideoUrl) {
      URL.revokeObjectURL(generatedVideoUrl)
    }
    setGeneratedVideo(null)
    setGeneratedVideoUrl(null)
    setGeneratedPrompt('')
    setError(null)
    setSuccess(null)
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
            {/* APIキー管理 */}
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" gutterBottom>
                Comet API Key 設定
              </Typography>
              
              {hasCometApiKey ? (
                <Box>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Comet API Keyが設定されています
                  </Alert>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={handleClearApiKey}
                  >
                    APIキーを削除
                  </Button>
                </Box>
              ) : (
                <Box>
                  <TextField
                    fullWidth
                    label="Comet API Key"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="your-comet-api-key"
                    size="small"
                    sx={{ mb: 1 }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowApiKey(!showApiKey)}
                            edge="end"
                          >
                            {showApiKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleSaveApiKey}
                    disabled={!apiKeyInput.trim()}
                  >
                    APIキーを保存
                  </Button>
                </Box>
              )}
            </Paper>
            
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
                <InputLabel>モデル</InputLabel>
                <Select
                  value={model}
                  onChange={(e) => setModel(e.target.value as 'sora-2' | 'sora-turbo' | 'sora-1.5' | 'runway-gen3' | 'kling-2.0')}
                  label="モデル"
                >
                  <MenuItem value="sora-2">Sora 2 (最新・高品質)</MenuItem>
                  <MenuItem value="sora-turbo">Sora Turbo (高速)</MenuItem>
                  <MenuItem value="sora-1.5">Sora 1.5</MenuItem>
                  <MenuItem value="runway-gen3">Runway Gen-3</MenuItem>
                  <MenuItem value="kling-2.0">Kling 2.0</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth disabled={isProcessing}>
                <InputLabel>アスペクト比</InputLabel>
                <Select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as '16:9' | '9:16' | '1:1')}
                  label="アスペクト比"
                >
                  <MenuItem value="16:9">16:9 (横向き)</MenuItem>
                  <MenuItem value="9:16">9:16 (縦向き)</MenuItem>
                  <MenuItem value="1:1">1:1 (正方形)</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            
            <FormControl fullWidth disabled={isProcessing}>
              <InputLabel>動画の長さ</InputLabel>
              <Select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                label="動画の長さ"
              >
                <MenuItem value={3}>3秒</MenuItem>
                <MenuItem value={5}>5秒</MenuItem>
                <MenuItem value={10}>10秒</MenuItem>
                <MenuItem value={15}>15秒</MenuItem>
                <MenuItem value={20}>20秒</MenuItem>
              </Select>
            </FormControl>
            
            {!generatedVideo ? (
              <Button
                variant="contained"
                onClick={handleGenerate}
                disabled={isProcessing || !hasCometApiKey}
                startIcon={<VideoCallIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #6D28D9 0%, #DB2777 100%)',
                  },
                }}
              >
                動画を生成
              </Button>
            ) : (
              <>
                {/* 生成された動画のプレビュー */}
                <Box
                  sx={{
                    border: (theme) =>
                      theme.palette.mode === 'dark'
                        ? '2px solid rgba(124, 58, 237, 0.3)'
                        : '2px solid rgba(124, 58, 237, 0.25)',
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: 'black',
                  }}
                >
                  <video
                    src={generatedVideoUrl || ''}
                    controls
                    autoPlay
                    loop
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                    }}
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary">
                  ファイルサイズ: {(generatedVideo.size / 1024 / 1024).toFixed(2)}MB
                </Typography>
                
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    onClick={handleUploadGenerated}
                    disabled={isProcessing}
                    startIcon={<UploadIcon />}
                    fullWidth
                    sx={{
                      background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #6D28D9 0%, #DB2777 100%)',
                      },
                    }}
                  >
                    アップロード
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleCancelGenerated}
                    disabled={isProcessing}
                    fullWidth
                  >
                    キャンセル
                  </Button>
                </Stack>
              </>
            )}
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


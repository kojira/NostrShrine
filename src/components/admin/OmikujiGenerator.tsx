/**
 * おみくじ生成コンポーネント（管理者用）
 */

import { useState } from 'react'
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Paper,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Stack,
} from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { useOmikujiGenerator } from '../../hooks/useOmikujiGenerator'
import type { OmikujiResult } from '../../lib/nostr/events'
import type { FortuneType } from '../../services/llm/types'

const FORTUNE_TYPES: FortuneType[] = ['大吉', '中吉', '小吉', '吉', '末吉', '凶', '大凶']

export function OmikujiGenerator() {
  const {
    generateAndPublish,
    isGenerating,
    error,
    hasApiKey,
    saveApiKey,
    clearApiKey,
  } = useOmikujiGenerator()
  
  const [open, setOpen] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [batchCount, setBatchCount] = useState(10)
  const [selectedFortune, setSelectedFortune] = useState<FortuneType | ''>('')
  const [useDistribution, setUseDistribution] = useState(false)
  const [distribution, setDistribution] = useState({
    '大吉': 10,
    '中吉': 20,
    '小吉': 30,
    '吉': 20,
    '末吉': 13,
    '凶': 5,
    '大凶': 2,
  })
  const [generatedResult, setGeneratedResult] = useState<OmikujiResult | null>(null)
  const [batchProgress, setBatchProgress] = useState<string>('')
  
  const handleOpen = () => {
    setOpen(true)
    setGeneratedResult(null)
    setBatchProgress('')
  }
  
  const handleClose = () => {
    setOpen(false)
  }
  
  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      saveApiKey(apiKeyInput.trim())
      setApiKeyInput('')
      alert('APIキーを保存しました')
    }
  }
  
  const handleClearApiKey = () => {
    if (confirm('APIキーを削除しますか？')) {
      clearApiKey()
      alert('APIキーを削除しました')
    }
  }
  
  const handleGenerate = async () => {
    const options = selectedFortune ? { fortune: selectedFortune } : undefined
    const result = await generateAndPublish(options)
    if (result) {
      setGeneratedResult(result)
    }
  }
  
  const handleBatchGenerate = async () => {
    const fortuneText = selectedFortune ? `「${selectedFortune}」を` : ''
    if (!confirm(`${fortuneText}${batchCount}個のおみくじを生成しますか？`)) {
      return
    }
    
    setBatchProgress(`0/${batchCount} 生成中...`)
    setGeneratedResult(null)
    
    // 割合指定の場合は配列を作成
    let fortuneArray: (FortuneType | undefined)[] = []
    if (useDistribution) {
      const total = Object.values(distribution).reduce((sum, val) => sum + val, 0)
      FORTUNE_TYPES.forEach((fortune) => {
        const count = Math.round((distribution[fortune] / total) * batchCount)
        for (let i = 0; i < count; i++) {
          fortuneArray.push(fortune)
        }
      })
      // 配列をシャッフル
      fortuneArray.sort(() => Math.random() - 0.5)
      // 足りない分は埋める
      while (fortuneArray.length < batchCount) {
        fortuneArray.push(FORTUNE_TYPES[Math.floor(Math.random() * FORTUNE_TYPES.length)])
      }
      fortuneArray = fortuneArray.slice(0, batchCount)
    } else {
      // 単一運勢または未指定の場合
      fortuneArray = Array(batchCount).fill(selectedFortune || undefined)
    }
    
    let successCount = 0
    for (let i = 0; i < batchCount; i++) {
      const options = fortuneArray[i] ? { fortune: fortuneArray[i]! } : undefined
      const result = await generateAndPublish(options)
      if (result) {
        successCount++
      }
      setBatchProgress(`${i + 1}/${batchCount} 生成中... (成功: ${successCount})`)
      
      if (i < batchCount - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    setBatchProgress(`完了！ ${successCount}/${batchCount} 個のおみくじを生成しました`)
  }
  
  return (
    <>
      <Button
        variant="outlined"
        onClick={handleOpen}
        sx={{ m: 1 }}
      >
        🎴 おみくじ生成（管理者）
      </Button>
      
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>おみくじ生成（管理者機能）</DialogTitle>
        <DialogContent>
          {/* APIキー設定 */}
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
            <Typography variant="subtitle2" gutterBottom>
              OpenAI API キー設定
            </Typography>
            
            {hasApiKey ? (
              <Box>
                <Alert severity="success" sx={{ mb: 2 }}>
                  APIキーが設定されています
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
                  label="OpenAI API Key"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="sk-..."
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
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {/* 運勢選択 */}
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>運勢を指定（任意）</InputLabel>
              <Select
                value={selectedFortune}
                onChange={(e) => setSelectedFortune(e.target.value as FortuneType | '')}
                label="運勢を指定（任意）"
              >
                <MenuItem value="">
                  <em>ランダム</em>
                </MenuItem>
                {FORTUNE_TYPES.map((fortune) => (
                  <MenuItem key={fortune} value={fortune}>
                    {fortune}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              指定しない場合は、LLMがランダムに運勢を選択します
            </Typography>
          </Box>
          
          {/* 単一生成 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              おみくじを1つ生成
            </Typography>
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={!hasApiKey || isGenerating}
              startIcon={isGenerating && <CircularProgress size={16} />}
            >
              {isGenerating ? '生成中...' : '生成して保存'}
            </Button>
          </Box>
          
          {/* 一括生成 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              おみくじを一括生成
            </Typography>
            
            {/* 割合指定スイッチ */}
            <FormControlLabel
              control={
                <Switch
                  checked={useDistribution}
                  onChange={(e) => setUseDistribution(e.target.checked)}
                />
              }
              label="運勢の割合を指定"
              sx={{ mb: 2 }}
            />
            
            {/* 割合設定 */}
            {useDistribution && (
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                <Typography variant="caption" gutterBottom display="block">
                  各運勢の割合（パーセント）
                </Typography>
                <Stack spacing={1}>
                  {FORTUNE_TYPES.map((fortune) => (
                    <TextField
                      key={fortune}
                      label={fortune}
                      type="number"
                      size="small"
                      fullWidth
                      value={distribution[fortune]}
                      onChange={(e) => setDistribution({
                        ...distribution,
                        [fortune]: Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
                      })}
                      inputProps={{ min: 0, max: 100 }}
                      InputProps={{ endAdornment: '%' }}
                    />
                  ))}
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  合計: {Object.values(distribution).reduce((sum, val) => sum + val, 0)}%
                </Typography>
              </Paper>
            )}
            
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                type="number"
                label="生成数"
                value={batchCount}
                onChange={(e) => setBatchCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                size="small"
                sx={{ width: 120 }}
                inputProps={{ min: 1, max: 100 }}
              />
              <Button
                variant="contained"
                color="secondary"
                onClick={handleBatchGenerate}
                disabled={!hasApiKey || isGenerating}
                startIcon={isGenerating && <CircularProgress size={16} />}
              >
                一括生成
              </Button>
            </Box>
            {batchProgress && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {batchProgress}
              </Typography>
            )}
          </Box>
          
          {/* 生成結果プレビュー */}
          {generatedResult && (
            <Paper sx={{ p: 2, bgcolor: 'success.light' }}>
              <Typography variant="subtitle2" gutterBottom>
                生成されたおみくじ
              </Typography>
              <Typography variant="h5" gutterBottom>
                {generatedResult.fortune}
              </Typography>
              <Typography variant="body2" paragraph>
                {generatedResult.general}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ラッキーアイテム: {generatedResult.lucky_item} / カラー: {generatedResult.lucky_color}
              </Typography>
            </Paper>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}


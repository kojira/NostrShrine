/**
 * 動画一覧コンポーネント（管理者用）
 */

import { useState } from 'react'
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Checkbox,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material'
import {
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import { useVideoList } from '../../hooks/useVideoList'
import { useVideoManagement } from '../../hooks/useVideoManagement'

export function VideoList() {
  const { videos, isLoading, error, reload } = useVideoList()
  const { deleteVideo } = useVideoManagement()
  
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [previewVideo, setPreviewVideo] = useState<string | null>(null)
  
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(new Set(videos.map((v) => v.event.id)))
    } else {
      setSelected(new Set())
    }
  }
  
  const handleSelect = (eventId: string) => {
    const newSelected = new Set(selected)
    if (newSelected.has(eventId)) {
      newSelected.delete(eventId)
    } else {
      newSelected.add(eventId)
    }
    setSelected(newSelected)
  }
  
  const handleDeleteSelected = async () => {
    if (selected.size === 0) return
    
    if (!confirm(`${selected.size}件の動画を削除しますか？`)) {
      return
    }
    
    setIsDeleting(true)
    setDeleteError(null)
    
    try {
      for (const eventId of selected) {
        await deleteVideo(eventId)
      }
      
      setSelected(new Set())
      await reload()
    } catch (err) {
      console.error('[VideoList] Failed to delete:', err)
      setDeleteError(err instanceof Error ? err.message : '削除に失敗しました')
    } finally {
      setIsDeleting(false)
    }
  }
  
  const handleDeleteOne = async (eventId: string) => {
    if (!confirm('この動画を削除しますか？')) {
      return
    }
    
    setIsDeleting(true)
    setDeleteError(null)
    
    try {
      await deleteVideo(eventId)
      await reload()
    } catch (err) {
      console.error('[VideoList] Failed to delete:', err)
      setDeleteError(err instanceof Error ? err.message : '削除に失敗しました')
    } finally {
      setIsDeleting(false)
    }
  }
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('ja-JP')
  }
  
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-'
    return `${seconds}秒`
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            📹 登録済み動画一覧
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {selected.size > 0 && (
              <Button
                variant="contained"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                size="small"
              >
                {selected.size}件削除
              </Button>
            )}
            <IconButton onClick={reload} disabled={isLoading} size="small">
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {deleteError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDeleteError(null)}>
            {deleteError}
          </Alert>
        )}
        
        {isLoading ? (
          <Typography color="text.secondary">読み込み中...</Typography>
        ) : videos.length === 0 ? (
          <Typography color="text.secondary">登録された動画はありません</Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selected.size > 0 && selected.size < videos.length}
                      checked={videos.length > 0 && selected.size === videos.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>タイトル</TableCell>
                  <TableCell>長さ</TableCell>
                  <TableCell>作成日時</TableCell>
                  <TableCell>プレビュー</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {videos.map((video) => (
                  <TableRow key={video.event.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.has(video.event.id)}
                        onChange={() => handleSelect(video.event.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {video.data.title || '無題'}
                        </Typography>
                        {video.data.description && (
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {video.data.description.substring(0, 50)}
                            {video.data.description.length > 50 && '...'}
                          </Typography>
                        )}
                        {video.data.prompt && (
                          <Chip
                            label="Sora生成"
                            size="small"
                            color="secondary"
                            sx={{ ml: 1, height: 20 }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{formatDuration(video.data.duration)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(video.event.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => setPreviewVideo(video.data.url)}
                        color="primary"
                      >
                        <PlayArrowIcon />
                      </IconButton>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteOne(video.event.id)}
                        disabled={isDeleting}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          登録数: {videos.length}件
        </Typography>
      </CardContent>
      
      {/* 動画プレビューダイアログ */}
      <Dialog
        open={previewVideo !== null}
        onClose={() => setPreviewVideo(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>動画プレビュー</DialogTitle>
        <DialogContent>
          {previewVideo && (
            <Box sx={{ width: '100%', aspectRatio: '16/9', bgcolor: 'black' }}>
              <video
                src={previewVideo}
                controls
                autoPlay
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewVideo(null)}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}


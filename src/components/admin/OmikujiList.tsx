/**
 * おみくじ一覧コンポーネント（管理者用）
 */

import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  TextField,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import CodeIcon from '@mui/icons-material/Code'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import { useOmikujiList } from '../../hooks/useOmikujiList'
import { useAuth } from '../../contexts/AuthContext'
import { useRelay } from '../../contexts/RelayContext'
import { KIND } from '../../config/constants'
import type { OmikujiResult } from '../../lib/nostr/events'

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

export function OmikujiList() {
  const { omikujiList, isLoading, error, fetchOmikujiList, totalCount } = useOmikujiList()
  const { publicKey } = useAuth()
  const { publishEvent } = useRelay()
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false)
  const [contentDialogOpen, setContentDialogOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<'selected' | 'single' | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [editForm, setEditForm] = useState<OmikujiResult>({
    fortune: '大吉',
    general: '',
    love: '',
    money: '',
    health: '',
    work: '',
    lucky_item: '',
    lucky_color: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  
  useEffect(() => {
    fetchOmikujiList()
  }, []) // 初回マウント時のみ実行
  
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage)
  }
  
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }
  
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, item: any) => {
    setAnchorEl(event.currentTarget)
    setSelectedItem(item)
  }
  
  const handleMenuClose = () => {
    setAnchorEl(null)
  }
  
  const handleShowJson = () => {
    setJsonDialogOpen(true)
    handleMenuClose()
  }
  
  const handleJsonDialogClose = () => {
    setJsonDialogOpen(false)
    setSelectedItem(null)
  }
  
  const handleContentClick = (item: any) => {
    setSelectedItem(item)
    setContentDialogOpen(true)
  }
  
  const handleContentDialogClose = () => {
    setContentDialogOpen(false)
    setSelectedItem(null)
  }
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('クリップボードにコピーしました')
    }).catch(err => {
      console.error('Failed to copy:', err)
    })
  }
  
  // チェックボックス操作
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const allIds = new Set(paginatedList.map(item => item.id))
      setSelectedIds(allIds)
    } else {
      setSelectedIds(new Set())
    }
  }
  
  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }
  
  // 削除処理
  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return
    setDeleteTarget('selected')
    setDeleteConfirmOpen(true)
  }
  
  const handleDeleteSingle = (item: any) => {
    setSelectedItem(item)
    setDeleteTarget('single')
    setDeleteConfirmOpen(true)
    handleMenuClose()
  }
  
  const handleDeleteConfirm = async () => {
    if (!publicKey) return
    
    setIsDeleting(true)
    setDeleteConfirmOpen(false)
    
    try {
      const itemsToDelete = deleteTarget === 'single' 
        ? [selectedItem]
        : omikujiList.filter(item => selectedIds.has(item.id))
      
      // NIP-09削除イベントを作成して公開
      for (const item of itemsToDelete) {
        const deleteEvent = {
          id: '',
          pubkey: publicKey,
          created_at: Math.floor(Date.now() / 1000),
          kind: 5, // NIP-09 Event Deletion
          tags: [
            ['e', item.eventId],
            ['k', KIND.OMIKUJI_DATA.toString()],
          ],
          content: 'おみくじを削除しました',
          sig: '',
        }
        
        // NIP-07で署名して公開
        if (window.nostr) {
          const signedEvent = await window.nostr.signEvent(deleteEvent)
          await publishEvent(signedEvent)
        }
      }
      
      // 選択をクリア
      setSelectedIds(new Set())
      
      // リストを再読み込み
      setTimeout(() => {
        fetchOmikujiList()
      }, 1000)
      
      alert(`${itemsToDelete.length}件のおみくじを削除しました`)
    } catch (err) {
      console.error('[OmikujiList] Delete error:', err)
      alert('削除に失敗しました')
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }
  
  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false)
    setDeleteTarget(null)
    setSelectedItem(null)
  }
  
  // 編集処理
  const handleEdit = (item: any) => {
    setEditingItem(item)
    setEditForm(item.result)
    setEditDialogOpen(true)
    handleMenuClose()
  }
  
  const handleEditCancel = () => {
    setEditDialogOpen(false)
    setEditingItem(null)
    setEditForm({
      fortune: '大吉',
      general: '',
      love: '',
      money: '',
      health: '',
      work: '',
      lucky_item: '',
      lucky_color: '',
    })
  }
  
  const handleEditSave = async () => {
    if (!publicKey || !editingItem) return
    
    setIsSaving(true)
    
    try {
      // 1. 古いイベントを削除（NIP-09）
      const deleteEvent = {
        id: '',
        pubkey: publicKey,
        created_at: Math.floor(Date.now() / 1000),
        kind: 5,
        tags: [
          ['e', editingItem.eventId],
          ['k', KIND.OMIKUJI_DATA.toString()],
        ],
        content: 'おみくじを編集のため削除',
        sig: '',
      }
      
      if (window.nostr) {
        const signedDeleteEvent = await window.nostr.signEvent(deleteEvent)
        await publishEvent(signedDeleteEvent)
      }
      
      // 2. 新しいおみくじを作成（kind 30394）
      const newEvent = {
        id: '',
        pubkey: publicKey,
        created_at: Math.floor(Date.now() / 1000),
        kind: KIND.OMIKUJI_DATA,
        tags: [
          ['d', editingItem.id], // 同じIDを使用
          ['fortune', editForm.fortune],
        ],
        content: JSON.stringify(editForm),
        sig: '',
      }
      
      if (window.nostr) {
        const signedNewEvent = await window.nostr.signEvent(newEvent)
        await publishEvent(signedNewEvent)
      }
      
      // 3. キャッシュをクリア
      const { eventCache } = await import('../../lib/cache/eventCache')
      await eventCache.clearByKind(KIND.OMIKUJI_DATA)
      
      // 4. リストを再読み込み
      setTimeout(() => {
        fetchOmikujiList()
      }, 1000)
      
      alert('おみくじを更新しました')
      handleEditCancel()
    } catch (err) {
      console.error('[OmikujiList] Edit error:', err)
      alert('更新に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }
  
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  
  const getFortuneBgColor = (fortune: string) => {
    switch (fortune) {
      case '大吉': return 'success'
      case '中吉': return 'info'
      case '小吉': return 'default'
      case '吉': return 'default'
      case '末吉': return 'warning'
      case '凶': return 'error'
      case '大凶': return 'error'
      default: return 'default'
    }
  }
  
  const paginatedList = omikujiList.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  )
  
  const isAllSelected = paginatedList.length > 0 && paginatedList.every(item => selectedIds.has(item.id))
  const isSomeSelected = paginatedList.some(item => selectedIds.has(item.id))
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">
            📋 おみくじ一覧
          </Typography>
          {selectedIds.size > 0 && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<DeleteIcon />}
              onClick={handleDeleteSelected}
              disabled={isDeleting}
            >
              選択削除 ({selectedIds.size})
            </Button>
          )}
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={fetchOmikujiList}
          disabled={isLoading || isDeleting}
          size="small"
        >
          更新
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>読み込み中...</Typography>
        </Box>
      )}
      
      {!isLoading && totalCount === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'background.default' }}>
          <Typography color="text.secondary">
            まだおみくじが生成されていません
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            「おみくじ生成」から作成してください
          </Typography>
        </Paper>
      )}
      
      {!isLoading && totalCount > 0 && (
        <>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isSomeSelected && !isAllSelected}
                      onChange={handleSelectAll}
                      disabled={isDeleting}
                    />
                  </TableCell>
                  <TableCell>ID</TableCell>
                  <TableCell>運勢</TableCell>
                  <TableCell>内容</TableCell>
                  <TableCell>作成日時</TableCell>
                  <TableCell>Event ID</TableCell>
                  <TableCell align="right">アクション</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedList.map((item) => (
                  <TableRow key={item.eventId} hover selected={selectedIds.has(item.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onChange={() => handleSelectOne(item.id)}
                        disabled={isDeleting}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {item.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.result.fortune}
                        color={getFortuneBgColor(item.result.fortune) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      onClick={() => handleContentClick(item)}
                    >
                      <Typography variant="body2" noWrap sx={{ maxWidth: 400 }}>
                        {item.result.general.substring(0, 80)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {formatDate(item.timestamp)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {item.eventId.slice(0, 8)}...
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteSingle(item)}
                        disabled={isDeleting}
                        sx={{ mr: 0.5 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, item)}
                        disabled={isDeleting}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
            labelRowsPerPage="表示件数:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}件`}
          />
        </>
      )}
      
      {/* コンテキストメニュー */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedItem && handleEdit(selectedItem)}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          編集
        </MenuItem>
        <MenuItem onClick={handleShowJson}>
          <CodeIcon fontSize="small" sx={{ mr: 1 }} />
          JSONを表示
        </MenuItem>
      </Menu>
      
      {/* 内容全文ダイアログ */}
      <Dialog
        open={contentDialogOpen}
        onClose={handleContentDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          おみくじ内容 ({selectedItem?.result.fortune})
        </DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                総合運
              </Typography>
              <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-line' }}>
                {selectedItem.result.general}
              </Typography>
              
              {selectedItem.result.love && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                    💕 恋愛運
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {selectedItem.result.love}
                  </Typography>
                </>
              )}
              
              {selectedItem.result.money && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                    💰 金運
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {selectedItem.result.money}
                  </Typography>
                </>
              )}
              
              {selectedItem.result.health && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                    🏥 健康運
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {selectedItem.result.health}
                  </Typography>
                </>
              )}
              
              {selectedItem.result.work && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                    💼 仕事運
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {selectedItem.result.work}
                  </Typography>
                </>
              )}
              
              {selectedItem.result.lucky_item && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                    🎁 ラッキーアイテム
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {selectedItem.result.lucky_item}
                  </Typography>
                </>
              )}
              
              {selectedItem.result.lucky_color && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                    🎨 ラッキーカラー
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {selectedItem.result.lucky_color}
                  </Typography>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleContentDialogClose}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* JSONダイアログ */}
      <Dialog
        open={jsonDialogOpen}
        onClose={handleJsonDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          おみくじJSON ({selectedItem?.id})
        </DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Paper
              sx={{
                p: 2,
                bgcolor: 'grey.900',
                color: 'grey.100',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                overflow: 'auto',
                maxHeight: 600,
              }}
            >
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify({
                  id: selectedItem.eventId,
                  author: selectedItem.author,
                  created_at: selectedItem.timestamp,
                  kind: 30394,
                  tags: [['d', selectedItem.id]],
                  content: selectedItem.result,
                }, null, 2)}
              </pre>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => selectedItem && copyToClipboard(JSON.stringify({
              id: selectedItem.eventId,
              author: selectedItem.author,
              created_at: selectedItem.timestamp,
              kind: 30394,
              tags: [['d', selectedItem.id]],
              content: selectedItem.result,
            }, null, 2))}
          >
            コピー
          </Button>
          <Button onClick={handleJsonDialogClose}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
      >
        <DialogTitle>おみくじ削除の確認</DialogTitle>
        <DialogContent>
          <Typography>
            {deleteTarget === 'single'
              ? `おみくじ「${selectedItem?.id}」を削除しますか？`
              : `選択した${selectedIds.size}件のおみくじを削除しますか？`}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            削除イベント（kind 5）をリレーに送信します。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>
            キャンセル
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            削除
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 編集ダイアログ */}
      <Dialog
        open={editDialogOpen}
        onClose={handleEditCancel}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          おみくじ編集 ({editingItem?.id})
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>運勢</InputLabel>
              <Select
                value={editForm.fortune}
                label="運勢"
                onChange={(e) => setEditForm({ ...editForm, fortune: e.target.value as any })}
                disabled={isSaving}
              >
                <MenuItem value="大吉">大吉</MenuItem>
                <MenuItem value="中吉">中吉</MenuItem>
                <MenuItem value="小吉">小吉</MenuItem>
                <MenuItem value="吉">吉</MenuItem>
                <MenuItem value="末吉">末吉</MenuItem>
                <MenuItem value="凶">凶</MenuItem>
                <MenuItem value="大凶">大凶</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="総合運"
              multiline
              rows={4}
              value={editForm.general}
              onChange={(e) => setEditForm({ ...editForm, general: e.target.value })}
              disabled={isSaving}
              fullWidth
              required
            />
            
            <TextField
              label="恋愛運"
              multiline
              rows={2}
              value={editForm.love}
              onChange={(e) => setEditForm({ ...editForm, love: e.target.value })}
              disabled={isSaving}
              fullWidth
            />
            
            <TextField
              label="金運"
              multiline
              rows={2}
              value={editForm.money}
              onChange={(e) => setEditForm({ ...editForm, money: e.target.value })}
              disabled={isSaving}
              fullWidth
            />
            
            <TextField
              label="健康運"
              multiline
              rows={2}
              value={editForm.health}
              onChange={(e) => setEditForm({ ...editForm, health: e.target.value })}
              disabled={isSaving}
              fullWidth
            />
            
            <TextField
              label="仕事運"
              multiline
              rows={2}
              value={editForm.work}
              onChange={(e) => setEditForm({ ...editForm, work: e.target.value })}
              disabled={isSaving}
              fullWidth
            />
            
            <TextField
              label="ラッキーアイテム"
              value={editForm.lucky_item}
              onChange={(e) => setEditForm({ ...editForm, lucky_item: e.target.value })}
              disabled={isSaving}
              fullWidth
            />
            
            <TextField
              label="ラッキーカラー"
              value={editForm.lucky_color}
              onChange={(e) => setEditForm({ ...editForm, lucky_color: e.target.value })}
              disabled={isSaving}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditCancel} disabled={isSaving}>
            キャンセル
          </Button>
          <Button 
            onClick={handleEditSave} 
            color="primary" 
            variant="contained"
            disabled={isSaving || !editForm.general}
            startIcon={isSaving && <CircularProgress size={16} />}
          >
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}


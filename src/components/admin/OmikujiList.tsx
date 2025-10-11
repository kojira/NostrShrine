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
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import CodeIcon from '@mui/icons-material/Code'
import { useOmikujiList } from '../../hooks/useOmikujiList'

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100]

export function OmikujiList() {
  const { omikujiList, isLoading, error, fetchOmikujiList, totalCount } = useOmikujiList()
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false)
  
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
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('クリップボードにコピーしました')
    }).catch(err => {
      console.error('Failed to copy:', err)
    })
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
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          📋 おみくじ一覧
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={fetchOmikujiList}
          disabled={isLoading}
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
                  <TableCell>ID</TableCell>
                  <TableCell>運勢</TableCell>
                  <TableCell>内容</TableCell>
                  <TableCell>ラッキーアイテム</TableCell>
                  <TableCell>作成日時</TableCell>
                  <TableCell>Event ID</TableCell>
                  <TableCell align="right">アクション</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedList.map((item) => (
                  <TableRow key={item.eventId} hover>
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
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                        {item.result.general.substring(0, 50)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {item.result.lucky_item || '-'}
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
                        onClick={(e) => handleMenuOpen(e, item)}
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
        <MenuItem onClick={handleShowJson}>
          <CodeIcon fontSize="small" sx={{ mr: 1 }} />
          JSONを表示
        </MenuItem>
      </Menu>
      
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
    </Box>
  )
}


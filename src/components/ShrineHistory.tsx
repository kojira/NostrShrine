/**
 * 参拝履歴コンポーネント
 */

import { useEffect } from 'react'
import {
  Box,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Divider,
  Avatar,
  ListItemAvatar,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import PersonIcon from '@mui/icons-material/Person'
import { useShrineHistory } from '../hooks/useShrineHistory'

export function ShrineHistory() {
  const { history, isLoading, error, fetchHistory } = useShrineHistory()
  
  // 初回マウント時と定期的に履歴を取得
  useEffect(() => {
    fetchHistory()
    
    // 30秒ごとに更新
    const interval = setInterval(() => {
      fetchHistory()
    }, 30000)
    
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }
  
  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          🙏 みんなの参拝履歴
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={fetchHistory}
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
          <Typography sx={{ ml: 2 }}>履歴を読み込み中...</Typography>
        </Box>
      )}
      
      {!isLoading && history.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'background.default' }}>
          <Typography color="text.secondary">
            まだ参拝記録がありません
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            「参拝する」ボタンから参拝してみましょう
          </Typography>
        </Paper>
      )}
      
      {!isLoading && history.length > 0 && (
        <Paper sx={{ maxHeight: 400, overflow: 'auto' }}>
          <List>
            {history.map((record, index) => (
              <Box key={record.id}>
                {index > 0 && <Divider />}
                <ListItem alignItems="flex-start">
                  <ListItemAvatar>
                    <Avatar
                      src={record.profile?.picture}
                      alt={record.profile?.name || record.profile?.display_name}
                    >
                      {!record.profile?.picture && <PersonIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="subtitle2" component="span">
                            {record.profile?.display_name || record.profile?.name || `npub...${record.pubkey.slice(-8)}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" component="span" sx={{ ml: 1 }}>
                            ⛩️ {record.shrine_name}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(record.timestamp)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box component="span" sx={{ display: 'block' }}>
                        {record.message && (
                          <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                            💬 {record.message}
                          </Box>
                        )}
                        <Box component="span" sx={{ display: 'block', mt: 0.5, fontSize: '0.75rem', color: 'text.secondary', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          Event ID: {record.id}
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              </Box>
            ))}
          </List>
        </Paper>
      )}
      
      {!isLoading && history.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
          全{history.length}件の参拝記録
        </Typography>
      )}
    </Box>
  )
}


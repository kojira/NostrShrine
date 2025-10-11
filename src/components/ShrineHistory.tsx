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
    <Box sx={{ mt: { xs: 3, sm: 4 } }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 2,
        flexWrap: { xs: 'wrap', sm: 'nowrap' },
        gap: { xs: 1, sm: 0 },
      }}>
        <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
          🙏 みんなの参拝履歴
        </Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={fetchHistory}
          disabled={isLoading}
          size="small"
          sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
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
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4, flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: 1 }}>
          <CircularProgress />
          <Typography sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>履歴を読み込み中...</Typography>
        </Box>
      )}
      
      {!isLoading && history.length === 0 && (
        <Paper sx={{ p: { xs: 2, sm: 3 }, textAlign: 'center', bgcolor: 'background.default' }}>
          <Typography color="text.secondary" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
            まだ参拝記録がありません
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
            「参拝する」ボタンから参拝してみましょう
          </Typography>
        </Paper>
      )}
      
      {!isLoading && history.length > 0 && (
        <Paper sx={{ maxHeight: { xs: 500, sm: 400 }, overflow: 'auto' }}>
          <List sx={{ p: { xs: 0, sm: 1 } }}>
            {history.map((record, index) => (
              <Box key={record.id}>
                {index > 0 && <Divider />}
                <ListItem 
                  alignItems="flex-start"
                  sx={{ 
                    py: { xs: 1.5, sm: 2 },
                    px: { xs: 1, sm: 2 },
                    flexDirection: { xs: 'column', sm: 'row' },
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: { xs: '100%', sm: 56 }, mb: { xs: 1, sm: 0 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar
                        src={record.profile?.picture}
                        alt={record.profile?.name || record.profile?.display_name}
                        sx={{ width: { xs: 36, sm: 40 }, height: { xs: 36, sm: 40 } }}
                      >
                        {!record.profile?.picture && <PersonIcon />}
                      </Avatar>
                      <Typography variant="subtitle2" sx={{ display: { xs: 'block', sm: 'none' }, fontSize: '0.9rem' }}>
                        {record.profile?.display_name || record.profile?.name || `npub...${record.pubkey.slice(-8)}`}
                      </Typography>
                    </Box>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: { xs: 0.5, sm: 0 },
                      }}>
                        <Box>
                          <Typography variant="subtitle2" component="span" sx={{ display: { xs: 'none', sm: 'inline' }, fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>
                            {record.profile?.display_name || record.profile?.name || `npub...${record.pubkey.slice(-8)}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" component="span" sx={{ ml: { xs: 0, sm: 1 }, fontSize: { xs: '0.75rem', sm: '0.8rem' } }}>
                            ⛩️ {record.shrine_name}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                          {formatDate(record.timestamp)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box component="span" sx={{ display: 'block' }}>
                        {record.message && (
                          <Box component="span" sx={{ display: 'block', mt: 0.5, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                            💬 {record.message}
                          </Box>
                        )}
                        <Box component="span" sx={{ 
                          display: 'block', 
                          mt: 0.5, 
                          fontSize: { xs: '0.65rem', sm: '0.75rem' }, 
                          color: 'text.secondary', 
                          fontFamily: 'monospace', 
                          wordBreak: 'break-all',
                        }}>
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
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center', fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
          全{history.length}件の参拝記録
        </Typography>
      )}
    </Box>
  )
}


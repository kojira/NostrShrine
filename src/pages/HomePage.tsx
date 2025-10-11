/**
 * ホームページ（一般ユーザー向け）
 */

import { Box, Typography } from '@mui/material'
import { ShrineVisit } from '../components/ShrineVisit'
import { Omikuji } from '../components/Omikuji'
import { ShrineHistory } from '../components/ShrineHistory'

export function HomePage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 4 }}>
        ⛩️ NostrShrine
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph align="center">
        Nostrベースの神社へようこそ。参拝しておみくじを引きましょう。
      </Typography>
      
      {/* 参拝機能 */}
      <ShrineVisit />
      
      {/* おみくじ機能 */}
      <Omikuji />
      
      {/* 参拝履歴 */}
      <ShrineHistory />
    </Box>
  )
}


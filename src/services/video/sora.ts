/**
 * OpenAI Sora API 統合
 */

export interface SoraGenerationOptions {
  prompt: string
  size?: '1280x720' | '1920x1080' | '720x1280' | '1080x1920' // 16:9 横, 16:9 縦, 9:16 縦, 9:16 横
  seconds?: number // 動画の長さ (秒)
}

export interface SoraVideoStatus {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  url?: string
  error?: string
}

/**
 * OpenAI Sora APIで動画を生成
 * 
 * 公式ドキュメント: https://platform.openai.com/docs/guides/video-generation
 * モデル: sora-2
 */
export async function generateVideoWithSora(
  apiKey: string,
  options: SoraGenerationOptions
): Promise<File> {
  const {
    prompt,
    size = '1280x720',
    seconds = 5,
  } = options
  
  console.log(`[Sora] Generating video with prompt: "${prompt}"`)
  console.log(`[Sora] Size: ${size}, Duration: ${seconds}s`)
  
  try {
    // Step 1: 動画生成リクエストを送信
    const createResponse = await fetch('https://api.openai.com/v1/videos/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'sora-2',
        prompt,
        size,
        seconds,
      }),
    })
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      throw new Error(`Sora API error: ${createResponse.status} ${errorText}`)
    }
    
    const createData = await createResponse.json()
    const videoId = createData.id
    
    if (!videoId) {
      throw new Error('No video ID returned from Sora API')
    }
    
    console.log(`[Sora] Video generation started: ${videoId}`)
    
    // Step 2: 動画生成完了をポーリングで待機
    const videoUrl = await pollVideoStatus(apiKey, videoId)
    
    // Step 3: 完成した動画をダウンロード
    console.log(`[Sora] Downloading video from: ${videoUrl}`)
    const videoResponse = await fetch(videoUrl)
    
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`)
    }
    
    const videoBlob = await videoResponse.blob()
    const videoFile = new File(
      [videoBlob],
      `shrine-visit-${Date.now()}.mp4`,
      { type: 'video/mp4' }
    )
    
    console.log(`[Sora] Video generated successfully: ${(videoFile.size / 1024 / 1024).toFixed(2)}MB`)
    
    return videoFile
  } catch (error) {
    console.error('[Sora] Generation failed:', error)
    throw error
  }
}

/**
 * 動画生成ステータスをポーリング
 */
async function pollVideoStatus(
  apiKey: string,
  videoId: string,
  maxAttempts: number = 60,
  intervalMs: number = 5000
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const statusResponse = await fetch(`https://api.openai.com/v1/videos/generations/${videoId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      })
      
      if (!statusResponse.ok) {
        const errorText = await statusResponse.text()
        throw new Error(`Failed to check status: ${statusResponse.status} ${errorText}`)
      }
      
      const status: SoraVideoStatus = await statusResponse.json()
      
      console.log(`[Sora] Status check ${attempt + 1}/${maxAttempts}: ${status.status}`)
      
      if (status.status === 'completed' && status.url) {
        return status.url
      }
      
      if (status.status === 'failed') {
        throw new Error(`Video generation failed: ${status.error || 'Unknown error'}`)
      }
      
      // 次のチェックまで待機
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, intervalMs))
      }
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error
      }
      console.warn(`[Sora] Status check failed, retrying... (${attempt + 1}/${maxAttempts})`)
      await new Promise(resolve => setTimeout(resolve, intervalMs))
    }
  }
  
  throw new Error(`Video generation timeout after ${maxAttempts * intervalMs / 1000}s`)
}

/**
 * 参拝動画用のデフォルトプロンプト
 */
export function getDefaultShrineVisitPrompt(): string {
  return `A serene Japanese shrine visit scene. 
A traditional torii gate stands at the entrance, surrounded by ancient cedar trees. 
Soft sunlight filters through the leaves, creating a peaceful atmosphere. 
The camera slowly moves forward through the torii gate towards the main shrine building. 
Cherry blossoms or autumn leaves gently fall in the breeze. 
The scene is calm, spiritual, and respectful, capturing the essence of a traditional shrine visit.
Cinematic, high quality, 4k.`
}

/**
 * カスタムプロンプトのバリデーション
 */
export function validatePrompt(prompt: string): { valid: boolean; error?: string } {
  if (!prompt || prompt.trim().length === 0) {
    return { valid: false, error: 'プロンプトを入力してください' }
  }
  
  if (prompt.length > 1000) {
    return { valid: false, error: 'プロンプトは1000文字以内にしてください' }
  }
  
  return { valid: true }
}


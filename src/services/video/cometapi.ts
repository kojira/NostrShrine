/**
 * Comet API 経由での動画生成
 * https://api.cometapi.com/doc
 */

export interface CometVideoGenerationOptions {
  prompt: string
  model?: 'sora-2' | 'sora-turbo' | 'sora-1.5' | 'runway-gen3' | 'kling-2.0'
  duration?: number // seconds
  resolution?: string
  aspect_ratio?: '16:9' | '9:16' | '1:1'
}

export interface CometTaskResponse {
  task_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  video_url?: string
  error?: string
}

/**
 * Comet API経由で動画を生成
 */
export async function generateVideoWithCometAPI(
  apiKey: string,
  options: CometVideoGenerationOptions
): Promise<File> {
  const {
    prompt,
    model = 'sora-2',
    duration = 5,
    aspect_ratio = '16:9',
  } = options
  
  console.log(`[CometAPI] Generating video with model: ${model}`)
  console.log(`[CometAPI] Prompt: "${prompt}"`)
  console.log(`[CometAPI] Duration: ${duration}s, Aspect: ${aspect_ratio}`)
  
  try {
    // Step 1: 動画生成リクエストを送信
    const createResponse = await fetch('https://api.cometapi.com/v1/video/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        duration,
        aspect_ratio,
      }),
    })
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      throw new Error(`Comet API error: ${createResponse.status} ${errorText}`)
    }
    
    const createData = await createResponse.json()
    const taskId = createData.task_id
    
    if (!taskId) {
      throw new Error('No task ID returned from Comet API')
    }
    
    console.log(`[CometAPI] Task created: ${taskId}`)
    
    // Step 2: タスク完了をポーリングで待機
    const videoUrl = await pollTaskStatus(apiKey, taskId)
    
    // Step 3: 完成した動画をダウンロード
    console.log(`[CometAPI] Downloading video from: ${videoUrl}`)
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
    
    console.log(`[CometAPI] Video generated successfully: ${(videoFile.size / 1024 / 1024).toFixed(2)}MB`)
    
    return videoFile
  } catch (error) {
    console.error('[CometAPI] Generation failed:', error)
    throw error
  }
}

/**
 * タスクステータスをポーリング
 */
async function pollTaskStatus(
  apiKey: string,
  taskId: string,
  maxAttempts: number = 60,
  intervalMs: number = 5000
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const statusResponse = await fetch(`https://api.cometapi.com/v1/video/task/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      })
      
      if (!statusResponse.ok) {
        const errorText = await statusResponse.text()
        throw new Error(`Failed to check status: ${statusResponse.status} ${errorText}`)
      }
      
      const status: CometTaskResponse = await statusResponse.json()
      
      console.log(`[CometAPI] Status check ${attempt + 1}/${maxAttempts}: ${status.status}`)
      
      if (status.status === 'completed' && status.video_url) {
        return status.video_url
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
      console.warn(`[CometAPI] Status check failed, retrying... (${attempt + 1}/${maxAttempts})`)
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


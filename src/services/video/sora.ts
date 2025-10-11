/**
 * OpenAI Sora API 統合
 */

export interface SoraGenerationOptions {
  prompt: string
  model?: 'sora-1.5' | 'sora-turbo'
  duration?: number // seconds
  resolution?: '480p' | '720p' | '1080p'
}

export interface SoraGenerationResponse {
  videoUrl: string
  videoDuration: number
  videoResolution: string
}

/**
 * OpenAI Sora APIで動画を生成
 * 
 * 注意: 2025年10月時点でSora APIは限定公開中です
 * 実際のエンドポイントは公式ドキュメントを参照してください
 */
export async function generateVideoWithSora(
  apiKey: string,
  options: SoraGenerationOptions
): Promise<File> {
  const {
    prompt,
    model = 'sora-turbo',
    duration = 5,
    resolution = '720p',
  } = options
  
  console.log(`[Sora] Generating video with prompt: "${prompt}"`)
  console.log(`[Sora] Model: ${model}, Duration: ${duration}s, Resolution: ${resolution}`)
  
  try {
    // OpenAI API エンドポイント（実際のエンドポイントに置き換える必要があります）
    // 現時点では公式APIが未公開のため、プレースホルダーです
    const response = await fetch('https://api.openai.com/v1/videos/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        duration,
        resolution,
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Sora API error: ${response.status} ${errorText}`)
    }
    
    const data = await response.json()
    
    // 生成された動画をダウンロード
    if (data.video_url || data.url) {
      const videoUrl = data.video_url || data.url
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
    }
    
    throw new Error('No video URL returned from Sora API')
  } catch (error) {
    console.error('[Sora] Generation failed:', error)
    throw error
  }
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


/**
 * Comet API 経由での動画生成
 * 公式ドキュメント: https://api.cometapi.com/doc
 * 
 * Sora-2はChat Completions形式で動画を生成します。
 * レスポンスのcontent内に動画URLがMarkdown形式で含まれます。
 */

export interface CometVideoGenerationOptions {
  prompt: string
  model?: 'sora-2' | 'sora-2-hd'
  stream?: boolean
  max_tokens?: number
}

interface CometChatResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Comet APIで動画を生成（Chat Completions形式、ストリーミング対応）
 * 
 * Sora動画生成は時間がかかるため、stream: trueで進捗を確認する
 */
export async function generateVideoWithCometAPI(
  apiKey: string,
  options: CometVideoGenerationOptions,
  onProgress?: (message: string) => void
): Promise<File> {
  const {
    prompt,
    model = 'sora-2',
    stream = true, // 動画生成は時間がかかるのでストリーミング推奨
    max_tokens = 3000,
  } = options

  console.log(`[CometAPI] Generating video with model: ${model}`)
  console.log(`[CometAPI] Prompt: "${prompt}"`)
  console.log(`[CometAPI] Stream mode: ${stream}`)

  try {
    // Chat Completions形式でリクエスト
    const response = await fetch('https://api.cometapi.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: prompt,
          }
        ],
        stream,
        max_tokens,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `Comet API error: ${response.status}`
      
      try {
        const errorData = JSON.parse(errorText)
        if (errorData.error?.message) {
          errorMessage = errorData.error.message
          
          // クォータ不足の場合はわかりやすいメッセージに変換
          if (errorData.error.code === 'insufficient_user_quota') {
            errorMessage = 'APIキーのクォータ（利用枠）が不足しています。Comet APIのダッシュボードで残高を確認してください。'
          }
          
          // タイムアウトエラー
          if (response.status === 504) {
            errorMessage = '動画生成がタイムアウトしました。Soraの動画生成は数分かかる場合があります。ストリーミングモードで再試行してください。'
          }
        }
      } catch (parseError) {
        // JSON解析に失敗した場合は元のエラーテキストを使用
        errorMessage += ` ${errorText}`
      }
      
      throw new Error(errorMessage)
    }

    let fullContent = ''

    if (stream) {
      // ストリーミングレスポンスの処理
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) {
        throw new Error('Response body is not readable')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(line => line.trim() !== '')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            
            if (data === '[DONE]') {
              console.log('[CometAPI] Stream completed')
              break
            }

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content
              
              if (content) {
                fullContent += content
                
                // プログレス通知（パーセンテージや状態メッセージを抽出）
                if (onProgress) {
                  if (content.includes('Queuing')) {
                    onProgress('キューに追加中...')
                  } else if (content.includes('Generating')) {
                    onProgress('動画を生成中...')
                  } else if (content.includes('Progress')) {
                    const progressMatch = content.match(/(\d+)\.\./)
                    if (progressMatch) {
                      onProgress(`生成中: ${progressMatch[1]}%`)
                    }
                  } else if (content.includes('Generation complete')) {
                    onProgress('生成完了！')
                  }
                }
                
                console.log('[CometAPI] Streaming chunk:', content.substring(0, 100))
              }
            } catch (parseError) {
              // JSON解析エラーは無視（不完全なチャンクの可能性）
              console.debug('[CometAPI] Failed to parse chunk:', data.substring(0, 50))
            }
          }
        }
      }
    } else {
      // 非ストリーミングレスポンス
      const data: CometChatResponse = await response.json()
      console.log(`[CometAPI] Response:`, data)
      fullContent = data.choices?.[0]?.message?.content || ''
    }

    // レスポンスから動画URLを抽出
    if (!fullContent) {
      throw new Error('No content in response')
    }

    console.log('[CometAPI] Full content length:', fullContent.length)

    // contentから画像/動画URLを抽出
    // 例: ![gen_01jrw0e7j2fc2rp7evwe19y0q7](https://filesystem.site/cdn/...)
    // または: [100](https://videos.openai.com/...)
    // または直接URL: https://...
    const urlRegex = /https?:\/\/[^\s\)]+\.(mp4|png|jpg|jpeg|gif|webm)/i
    const urlMatch = fullContent.match(urlRegex)
    
    if (!urlMatch) {
      console.warn('[CometAPI] No video URL found in content:', fullContent)
      throw new Error(`No video URL found in response. Content: ${fullContent.substring(0, 200)}...`)
    }

    const videoUrl = urlMatch[0]
    console.log(`[CometAPI] Video URL found: ${videoUrl}`)

    // 動画をダウンロード
    console.log(`[CometAPI] Downloading video from: ${videoUrl}`)
    const videoResponse = await fetch(videoUrl)

    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`)
    }

    const videoBlob = await videoResponse.blob()
    
    // MIMEタイプを判定
    const contentType = videoResponse.headers.get('content-type') || videoBlob.type
    const extension = contentType.includes('webm') ? 'webm' : 
                      contentType.includes('png') ? 'png' :
                      contentType.includes('jpg') || contentType.includes('jpeg') ? 'jpg' :
                      'mp4'
    
    const videoFile = new File(
      [videoBlob],
      `shrine-visit-${Date.now()}.${extension}`,
      { type: contentType || 'video/mp4' }
    )

    console.log(`[CometAPI] Video generated successfully: ${(videoFile.size / 1024 / 1024).toFixed(2)}MB (${contentType})`)

    return videoFile
  } catch (error) {
    console.error('[CometAPI] Generation failed:', error)
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
 * 
 * Sora-2は長いプロンプトを受け付けるため、制限は緩めに設定
 */
export function validatePrompt(prompt: string): { valid: boolean; error?: string } {
  if (!prompt || prompt.trim().length === 0) {
    return { valid: false, error: 'プロンプトを入力してください' }
  }
  
  // OpenAI APIの一般的な制限は数千トークン（数万文字）だが、
  // 実用上は5000文字程度で十分と思われる
  if (prompt.length > 5000) {
    return { valid: false, error: 'プロンプトは5000文字以内にしてください' }
  }
  
  return { valid: true }
}

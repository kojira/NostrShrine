/**
 * WebCodecs API を使った動画圧縮
 * 
 * 注意: WebCodecs圧縮は複雑で失敗する可能性があるため、
 * 圧縮なしのオプションも提供する
 */

export interface VideoCompressionOptions {
  targetBitrate?: number // bps (デフォルト: 2Mbps)
  targetWidth?: number   // 幅 (デフォルト: 元の幅)
  targetHeight?: number  // 高さ (デフォルト: 元の高さ)
  codec?: string         // コーデック (デフォルト: 'vp09.00.10.08')
  skipCompression?: boolean // 圧縮をスキップ (デフォルト: false)
}

/**
 * WebCodecs API が使用可能かチェック
 */
export function isWebCodecsSupported(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined'
}

/**
 * 動画ファイルを圧縮
 */
export async function compressVideo(
  inputFile: File,
  options: VideoCompressionOptions = {}
): Promise<File> {
  const {
    targetBitrate = 2_000_000, // 2Mbps
    codec = 'vp09.00.10.08',
    skipCompression = false,
  } = options
  
  // 圧縮スキップオプションが有効な場合
  if (skipCompression) {
    console.log('[VideoCompression] Compression skipped by option')
    return inputFile
  }
  
  if (!isWebCodecsSupported()) {
    console.warn('[VideoCompression] WebCodecs not supported, returning original file')
    return inputFile
  }
  
  try {
    // 動画をVideoElementに読み込む
    const videoElement = document.createElement('video')
    videoElement.src = URL.createObjectURL(inputFile)
    videoElement.muted = true
    
    await new Promise<void>((resolve, reject) => {
      videoElement.onloadedmetadata = () => resolve()
      videoElement.onerror = () => reject(new Error('Failed to load video'))
    })
    
    const width = options.targetWidth || videoElement.videoWidth
    const height = options.targetHeight || videoElement.videoHeight
    const duration = videoElement.duration
    const fps = 30 // 仮定: 30fps
    
    console.log(`[VideoCompression] Input: ${videoElement.videoWidth}x${videoElement.videoHeight}, ${duration}s`)
    console.log(`[VideoCompression] Output: ${width}x${height}, bitrate: ${targetBitrate}bps`)
    
    // エンコード済みチャンクを保存
    const chunks: EncodedVideoChunk[] = []
    
    // VideoEncoderを作成
    const encoder = new VideoEncoder({
      output: (chunk: EncodedVideoChunk) => {
        chunks.push(chunk)
      },
      error: (error: Error) => {
        console.error('[VideoCompression] Encoder error:', error)
      },
    })
    
    // エンコーダーの設定
    const encoderConfig: VideoEncoderConfig = {
      codec,
      width,
      height,
      bitrate: targetBitrate,
      framerate: fps,
    }
    
    // コーデックがサポートされているか確認
    const support = await VideoEncoder.isConfigSupported(encoderConfig)
    if (!support.supported) {
      throw new Error(`Codec ${codec} not supported`)
    }
    
    encoder.configure(encoderConfig)
    
    // Canvas経由でフレームを取得してエンコード
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    
    videoElement.currentTime = 0
    await videoElement.play()
    
    let frameCount = 0
    const totalFrames = Math.floor(duration * fps)
    
    // フレームごとにエンコード
    const encodeFrame = async () => {
      if (videoElement.ended || videoElement.paused) {
        return
      }
      
      // Canvasに現在のフレームを描画
      ctx.drawImage(videoElement, 0, 0, width, height)
      
      // VideoFrameを作成
      const frame = new VideoFrame(canvas, {
        timestamp: (frameCount / fps) * 1_000_000, // マイクロ秒
      })
      
      // エンコード
      encoder.encode(frame, { keyFrame: frameCount % 30 === 0 })
      frame.close()
      
      frameCount++
      
      if (frameCount < totalFrames) {
        requestAnimationFrame(encodeFrame)
      } else {
        videoElement.pause()
      }
    }
    
    // エンコード開始
    await encodeFrame()
    
    // エンコード完了を待つ
    await encoder.flush()
    encoder.close()
    
    videoElement.pause()
    URL.revokeObjectURL(videoElement.src)
    
    console.log(`[VideoCompression] Encoded ${chunks.length} chunks`)
    
    // チャンクをBlobに変換
    const compressedBlob = new Blob(
      chunks.map(chunk => {
        const buffer = new ArrayBuffer(chunk.byteLength)
        chunk.copyTo(buffer)
        return buffer
      }),
      { type: 'video/webm' }
    )
    
    const compressedFile = new File(
      [compressedBlob],
      inputFile.name.replace(/\.[^.]+$/, '.webm'),
      { type: 'video/webm' }
    )
    
    console.log(`[VideoCompression] Original: ${(inputFile.size / 1024 / 1024).toFixed(2)}MB`)
    console.log(`[VideoCompression] Compressed: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`)
    
    return compressedFile
  } catch (error) {
    console.error('[VideoCompression] Compression failed:', error)
    // 圧縮失敗時は元のファイルを返す
    return inputFile
  }
}


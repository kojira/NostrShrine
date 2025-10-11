/**
 * NIP-96 File Upload Service
 * https://github.com/nostr-protocol/nips/blob/master/96.md
 */

export interface NIP96UploadOptions {
  file: File
  serverUrl: string
  apiKey?: string
}

export interface NIP96UploadResponse {
  status: 'success' | 'error'
  message: string
  nip94_event?: {
    tags: string[][]
  }
  url?: string
}

/**
 * NIP-96準拠のファイルアップロード
 * share.yabu.me, nostrcheck.meなど
 */
export async function uploadFileNIP96(options: NIP96UploadOptions): Promise<string> {
  const { file, serverUrl, apiKey } = options
  
  const formData = new FormData()
  formData.append('file', file)
  
  const headers: HeadersInit = {}
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }
  
  try {
    const response = await fetch(`${serverUrl}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Upload failed: ${response.status} ${errorText}`)
    }
    
    const data: NIP96UploadResponse = await response.json()
    
    if (data.status === 'error') {
      throw new Error(data.message || 'Upload failed')
    }
    
    // URLを抽出
    if (data.url) {
      return data.url
    }
    
    // NIP-94イベントからURLを取得
    if (data.nip94_event?.tags) {
      const urlTag = data.nip94_event.tags.find(tag => tag[0] === 'url')
      if (urlTag && urlTag[1]) {
        return urlTag[1]
      }
    }
    
    throw new Error('No URL returned from upload')
  } catch (error) {
    console.error('[NIP-96] Upload failed:', error)
    throw error
  }
}

/**
 * share.yabu.meへのアップロード
 */
export async function uploadToShareYabume(file: File): Promise<string> {
  return uploadFileNIP96({
    file,
    serverUrl: 'https://share.yabu.me',
  })
}


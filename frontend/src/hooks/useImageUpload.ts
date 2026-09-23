import { useState } from 'react'
import { addProductImage } from '@/api/catalog'
import { getErrorMessage } from '@/api/client'

export interface UploadProgress {
  done: number
  total: number
}

/**
 * Sends several pictures, one after the other.
 *
 * Why not all at once: the backend gives the FIRST picture of a product the
 * "main" flag, and only one picture may be main. Two uploads arriving at the
 * same moment would both try to claim it. Sending them in order keeps that
 * simple and predictable, and it also shows honest progress.
 */
export function useImageUpload() {
  const [progress, setProgress] = useState<UploadProgress | null>(null)

  async function uploadAll(
    productId: string,
    files: File[],
    altText?: string,
  ): Promise<{ uploaded: number; errors: string[] }> {
    const errors: string[] = []
    let uploaded = 0

    setProgress({ done: 0, total: files.length })

    for (const file of files) {
      try {
        await addProductImage(productId, { file, alt_text: altText || undefined })
        uploaded++
      } catch (error) {
        // One bad file does not stop the others; it is reported by name.
        errors.push(`${file.name}: ${getErrorMessage(error)}`)
      }

      setProgress({ done: uploaded + errors.length, total: files.length })
    }

    setProgress(null)

    return { uploaded, errors }
  }

  return { uploadAll, progress }
}

/**
 * Supabase Storage Service
 * Handles file uploads to Supabase Storage buckets
 */

const BUCKET_NAME = 'card-images'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

/**
 * Upload a card image to Supabase Storage
 * @param file - The file to upload
 * @param cardId - The card ID to use in the filename
 * @returns The public URL of the uploaded image, or null on error
 */
export async function uploadCardImage(
  file: File,
  cardId: string
): Promise<string> {
  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Type de fichier non supporté. Utilisez: PNG, JPG, WebP ou GIF`)
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Fichier trop volumineux. Maximum: 5MB`)
  }

  const supabase = useSupabaseClient()

  // Generate unique filename
  const extension = file.name.split('.').pop()?.toLowerCase() || 'png'
  const fileName = `${cardId}-${Date.now()}.${extension}`

  // Upload file
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    })

  if (error) {
    console.error('Storage upload error:', error)
    throw new Error(`Erreur lors de l'upload: ${error.message}`)
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName)

  return urlData.publicUrl
}

/**
 * Delete a card image from Supabase Storage
 * @param imageUrl - The full public URL of the image to delete
 */
export async function deleteCardImage(imageUrl: string): Promise<void> {
  if (!imageUrl || !imageUrl.includes(BUCKET_NAME)) {
    return // Not a storage URL, skip
  }

  const supabase = useSupabaseClient()

  // Extract filename from URL
  // URL format: https://xxx.supabase.co/storage/v1/object/public/card-images/filename.ext
  const urlParts = imageUrl.split(`${BUCKET_NAME}/`)
  if (urlParts.length < 2) return

  const fileName = urlParts[1]

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([fileName])

  if (error) {
    console.error('Storage delete error:', error)
    // Don't throw - deletion failure shouldn't block other operations
  }
}

/**
 * Check if a URL is from our storage bucket
 */
export function isStorageUrl(url: string): boolean {
  return url?.includes(`/storage/v1/object/public/${BUCKET_NAME}/`) || false
}

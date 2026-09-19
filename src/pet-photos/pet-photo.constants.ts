/** Maximum accepted upload size before image processing (5 MB). */
export const PET_PHOTO_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const PET_PHOTO_ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

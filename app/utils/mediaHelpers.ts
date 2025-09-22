import type { MediaItem } from '../types';

/**
 * Extract media ID from media URL
 * URLs are in format: /api/media/{mediaId}
 * Also handles R2 URLs and other formats by extracting media- prefixed IDs
 */
export function getMediaId(url: string): string | null {
  // First try the expected API format: /api/media/{mediaId}
  const apiMatch = url.match(/\/api\/media\/([^\/]+)$/);
  if (apiMatch) {
    return apiMatch[1];
  }
  
  // If not API format, try to extract media ID from any part of the URL
  // Look for media-{timestamp}_{randomId} pattern
  const mediaIdMatch = url.match(/media-[\d]+_[a-zA-Z0-9]+/);
  if (mediaIdMatch) {
    return mediaIdMatch[0];
  }
  
  // Fallback: use the URL itself as the media ID (less ideal but functional)
  // This ensures comments can still be associated with media even if URL format changes
  return btoa(url).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
}

/**
 * Get media ID from MediaItem
 */
export function getMediaItemId(mediaItem: MediaItem): string | null {
  return getMediaId(mediaItem.url);
}

/**
 * Check if a media item has comments
 */
export function hasComments(mediaItem: MediaItem): boolean {
  return !!mediaItem.comments && mediaItem.comments.length > 0;
}

/**
 * Get comment count for a media item
 */
export function getCommentCount(mediaItem: MediaItem): number {
  return mediaItem.comments?.length || 0;
}
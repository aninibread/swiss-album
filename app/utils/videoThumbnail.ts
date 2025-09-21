// Video thumbnail generation utility for mobile compatibility

/**
 * Generate a thumbnail from a video URL
 * Returns a data URL for the thumbnail image
 */
export function generateVideoThumbnail(videoUrl: string, timeInSeconds: number = 1): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    video.crossOrigin = 'anonymous';
    video.currentTime = timeInSeconds;
    video.muted = true;
    video.playsInline = true;
    
    video.onloadedmetadata = () => {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    };
    
    video.onseeked = () => {
      try {
        // Draw the current frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to data URL (JPEG for smaller size)
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // Clean up
        video.src = '';
        video.load();
        
        resolve(thumbnailUrl);
      } catch (error) {
        reject(error);
      }
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video for thumbnail generation'));
    };
    
    video.onabort = () => {
      reject(new Error('Video loading aborted'));
    };
    
    // Start loading the video
    video.src = videoUrl;
    video.load();
    
    // Fallback timeout
    setTimeout(() => {
      reject(new Error('Thumbnail generation timeout'));
    }, 10000); // 10 second timeout
  });
}

/**
 * Create a fallback thumbnail with play button overlay
 */
export function createFallbackThumbnail(width: number = 640, height: number = 480): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return '';
  }
  
  canvas.width = width;
  canvas.height = height;
  
  // Create a gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1f2937');
  gradient.addColorStop(1, '#111827');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Draw play button
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.1;
  
  // Play button circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fill();
  
  // Play button triangle
  ctx.beginPath();
  const triangleSize = radius * 0.6;
  ctx.moveTo(centerX - triangleSize * 0.3, centerY - triangleSize * 0.5);
  ctx.lineTo(centerX - triangleSize * 0.3, centerY + triangleSize * 0.5);
  ctx.lineTo(centerX + triangleSize * 0.7, centerY);
  ctx.closePath();
  ctx.fillStyle = '#1f2937';
  ctx.fill();
  
  return canvas.toDataURL('image/jpeg', 0.8);
}

/**
 * Get or generate thumbnail for a video with caching
 */
const thumbnailCache = new Map<string, string>();

export async function getVideoThumbnail(videoUrl: string): Promise<string> {
  // Check cache first
  if (thumbnailCache.has(videoUrl)) {
    return thumbnailCache.get(videoUrl)!;
  }
  
  try {
    // Try to generate actual thumbnail
    const thumbnail = await generateVideoThumbnail(videoUrl, 1);
    thumbnailCache.set(videoUrl, thumbnail);
    return thumbnail;
  } catch (error) {
    console.warn('Failed to generate video thumbnail:', error);
    
    // Use fallback thumbnail
    const fallback = createFallbackThumbnail();
    thumbnailCache.set(videoUrl, fallback);
    return fallback;
  }
}

/**
 * Clear thumbnail cache (call when videos are deleted)
 */
export function clearThumbnailCache(videoUrl?: string) {
  if (videoUrl) {
    thumbnailCache.delete(videoUrl);
  } else {
    thumbnailCache.clear();
  }
}
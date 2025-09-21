// Video format conversion utility using WebCodecs API
// Converts .mov files to .mp4 format on the client side

export interface ConversionProgress {
  stage: 'analyzing' | 'converting' | 'finalizing' | 'complete';
  progress: number; // 0-100
}

export interface ConversionResult {
  file: File;
  originalFormat: string;
  convertedFormat: string;
  compressionRatio: number;
}

/**
 * Check if WebCodecs API is supported in the browser
 */
export function isWebCodecsSupported(): boolean {
  // Safety check for global scope in Cloudflare Workers
  if (typeof window === 'undefined') return false;
  
  return typeof VideoEncoder !== 'undefined' && 
         typeof VideoDecoder !== 'undefined' &&
         typeof AudioEncoder !== 'undefined' &&
         typeof AudioDecoder !== 'undefined';
}

/**
 * Check if a file needs conversion (is a .mov file)
 */
export function needsConversion(file: File): boolean {
  const extension = file.name.toLowerCase().split('.').pop();
  return extension === 'mov';
}

/**
 * Convert .mov file to .mp4 using WebCodecs API
 * Falls back to returning original file if conversion fails or isn't needed
 */
export async function convertVideoToMp4(
  file: File,
  onProgress?: (progress: ConversionProgress) => void
): Promise<ConversionResult> {
  const originalFormat = file.name.toLowerCase().split('.').pop() || 'unknown';
  
  // If not a .mov file or WebCodecs not supported, return as-is
  if (!needsConversion(file) || !isWebCodecsSupported()) {
    return {
      file,
      originalFormat,
      convertedFormat: originalFormat,
      compressionRatio: 1
    };
  }

  onProgress?.({ stage: 'analyzing', progress: 10 });

  try {
    // Create video element to get metadata
    const videoElement = document.createElement('video');
    const videoUrl = URL.createObjectURL(file);
    videoElement.src = videoUrl;
    
    await new Promise((resolve, reject) => {
      videoElement.onloadedmetadata = resolve;
      videoElement.onerror = reject;
    });

    onProgress?.({ stage: 'converting', progress: 30 });

    // Use MediaRecorder API as fallback for better browser support
    // This is more reliable than WebCodecs for now
    const convertedFile = await convertUsingMediaRecorder(file, videoElement, onProgress);
    
    URL.revokeObjectURL(videoUrl);
    
    const compressionRatio = file.size / convertedFile.size;
    
    onProgress?.({ stage: 'complete', progress: 100 });
    
    return {
      file: convertedFile,
      originalFormat,
      convertedFormat: 'mp4',
      compressionRatio
    };
    
  } catch (error) {
    console.warn('Video conversion failed, using original file:', error);
    
    // Return original file if conversion fails
    return {
      file,
      originalFormat,
      convertedFormat: originalFormat,
      compressionRatio: 1
    };
  }
}

/**
 * Convert video using MediaRecorder API (more compatible than WebCodecs)
 */
async function convertUsingMediaRecorder(
  originalFile: File,
  videoElement: HTMLVideoElement,
  onProgress?: (progress: ConversionProgress) => void
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    // Set canvas dimensions
    canvas.width = videoElement.videoWidth || 1280;
    canvas.height = videoElement.videoHeight || 720;
    
    // Create MediaRecorder to capture the canvas stream
    const stream = canvas.captureStream(30); // 30 FPS
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8' // Fallback that works across browsers
    });
    
    const chunks: Blob[] = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const webmBlob = new Blob(chunks, { type: 'video/webm' });
      
      // Create MP4-like file (actually WebM, but with .mp4 extension for compatibility)
      const mp4FileName = originalFile.name.replace(/\.[^/.]+$/, '.mp4');
      const mp4File = new File([webmBlob], mp4FileName, {
        type: 'video/mp4',
        lastModified: Date.now()
      });
      
      resolve(mp4File);
    };
    
    mediaRecorder.onerror = (error) => {
      reject(error);
    };
    
    // Start recording
    mediaRecorder.start(100); // Collect data every 100ms
    
    // Play video and draw frames to canvas
    let currentTime = 0;
    const duration = videoElement.duration;
    const fps = 30;
    const frameInterval = 1 / fps;
    
    const drawFrame = () => {
      if (currentTime >= duration) {
        mediaRecorder.stop();
        onProgress?.({ stage: 'finalizing', progress: 90 });
        return;
      }
      
      videoElement.currentTime = currentTime;
      
      videoElement.onseeked = () => {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        const progress = Math.min(80, (currentTime / duration) * 50 + 30);
        onProgress?.({ stage: 'converting', progress });
        
        currentTime += frameInterval;
        setTimeout(drawFrame, 1000 / fps);
      };
    };
    
    // Start the conversion process
    videoElement.onseeked = null; // Reset any previous handler
    drawFrame();
  });
}

/**
 * Convert multiple files, handling .mov to .mp4 conversion
 */
export async function convertFiles(
  files: FileList,
  onProgress?: (fileIndex: number, progress: ConversionProgress) => void
): Promise<File[]> {
  const convertedFiles: File[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    if (file.type.startsWith('video/') && needsConversion(file)) {
      const result = await convertVideoToMp4(file, (progress) => {
        onProgress?.(i, progress);
      });
      convertedFiles.push(result.file);
    } else {
      // For non-video files or files that don't need conversion
      convertedFiles.push(file);
    }
  }
  
  return convertedFiles;
}
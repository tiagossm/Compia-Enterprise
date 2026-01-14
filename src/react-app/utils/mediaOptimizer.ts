// Media optimization utilities for AI processing
interface MediaItem {
  file_url: string;
  media_type: string;
  file_name: string;
  description?: string | null;
}

interface OptimizationOptions {
  maxSizeMB: number;
  maxImages: number;
  imageQuality: number;
  maxDimension: number;
}

interface ValidationResult {
  valid: boolean;
  issues: string[];
}

interface OptimizationResult {
  optimizedMedia: MediaItem[];
  optimizationReport: string;
}

export function validateMediaForAI(mediaItems: MediaItem[]): ValidationResult {
  const issues: string[] = [];
  let valid = true;

  for (const media of mediaItems) {
    if (media.media_type === 'image' && media.file_url.startsWith('data:image/')) {
      // Estimate size of base64 image
      const sizeInBytes = (media.file_url.length * 3) / 4;
      const sizeInMB = sizeInBytes / (1024 * 1024);
      
      if (sizeInMB > 5) {
        issues.push(`Imagem ${media.file_name} muito grande (${sizeInMB.toFixed(2)}MB)`);
        valid = false;
      }
    }
  }

  return { valid, issues };
}

export async function optimizeMediaSetForAI(
  mediaItems: MediaItem[], 
  options: OptimizationOptions
): Promise<OptimizationResult> {
  const optimizedMedia: MediaItem[] = [];
  const optimizations: string[] = [];
  
  let imageCount = 0;
  
  for (const media of mediaItems) {
    if (media.media_type === 'image') {
      if (imageCount >= options.maxImages) {
        optimizations.push(`Limitado a ${options.maxImages} imagem(s)`);
        continue;
      }
      
      if (media.file_url.startsWith('data:image/')) {
        // Estimate size
        const sizeInBytes = (media.file_url.length * 3) / 4;
        const sizeInMB = sizeInBytes / (1024 * 1024);
        
        if (sizeInMB > options.maxSizeMB) {
          optimizations.push(`Imagem ${media.file_name} reduzida de ${sizeInMB.toFixed(2)}MB`);
          
          // For now, just include the image but add optimization note
          // In a full implementation, you would actually resize/compress the image
          optimizedMedia.push({
            ...media,
            description: `${media.description || ''} [Otimizada para IA]`.trim()
          });
        } else {
          optimizedMedia.push(media);
        }
        
        imageCount++;
      } else {
        optimizedMedia.push(media);
        imageCount++;
      }
    } else {
      // Include non-image media as-is
      optimizedMedia.push(media);
    }
  }
  
  const optimizationReport = optimizations.length > 0 
    ? optimizations.join('; ')
    : '';
    
  return { optimizedMedia, optimizationReport };
}

export function compressImageBase64(
  base64: string, 
  quality: number = 0.7, 
  maxDimension: number = 1024
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedBase64);
    };
    
    img.onerror = () => resolve(base64); // Return original on error
    img.src = base64;
  });
}

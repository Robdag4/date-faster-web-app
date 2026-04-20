/**
 * Resize an image file to max dimensions while preserving aspect ratio.
 * Returns a new File object (JPEG, 0.85 quality).
 */
export async function resizeImage(file: File, maxWidth = 1200, maxHeight = 1600): Promise<File> {
  // Skip non-images (videos pass through)
  if (!file.type.startsWith('image/')) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Only resize if larger than max
      if (width <= maxWidth && height <= maxHeight) {
        URL.revokeObjectURL(img.src);
        resolve(file);
        return;
      }

      // Scale down preserving aspect ratio
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }

      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(img.src);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const resized = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
            type: 'image/jpeg',
          });
          resolve(resized);
        },
        'image/jpeg',
        0.85
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

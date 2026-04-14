/**
 * Extract a cropped sub-region from an image using HTML5 Canvas.
 * Used by ImageCropModal after the user positions their avatar crop.
 *
 * @param imageSrc   - data URL (or object URL) of the source image
 * @param pixelCrop  - { x, y, width, height } in source-image pixels
 * @param outputSize - final square output size in pixels (default 400)
 * @returns          - compressed JPEG data URL at outputSize × outputSize
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  outputSize = 400,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width  = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas 2D context unavailable")); return; }

      // Fill background white (handles PNGs with transparency)
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, outputSize, outputSize);

      // Draw only the cropped region, scaled to the output square
      ctx.drawImage(
        img,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        outputSize,
        outputSize,
      );

      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageSrc;
  });
}

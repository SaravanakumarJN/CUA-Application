import sharp from "sharp";
import { MAX_WIDTH, MAX_HEIGHT, MIN_WIDTH, MIN_HEIGHT } from "@/constants";

export function resolutionUtils(resolution) {
  const [originalWidth, originalHeight] = resolution;

  function pickScaleFactor(width, height) {
    if (
      width <= MAX_WIDTH &&
      width >= MIN_WIDTH &&
      height <= MAX_HEIGHT &&
      height >= MIN_HEIGHT
    ) {
      return 1;
    }

    const widthDown = MAX_WIDTH / width;
    const widthUp = MIN_WIDTH / width;
    const heightDown = MAX_HEIGHT / height;
    const heightUp = MIN_HEIGHT / height;

    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
      return Math.min(widthDown, heightDown);
    }

    return Math.max(widthUp, heightUp);
  }

  const rawScale = pickScaleFactor(originalWidth, originalHeight);
  const scaledWidth = Math.round(originalWidth * rawScale);
  const scaledHeight = Math.round(originalHeight * rawScale);

  const effectiveScaleX = scaledWidth / originalWidth;
  const effectiveScaleY = scaledHeight / originalHeight;
  const scale = Math.sqrt(effectiveScaleX * effectiveScaleY);

  function toOriginal(point) {
    const x = Math.round(point[0] / scale);
    const y = Math.round(point[1] / scale);
    return [x, y];
  }

  function toScaled(point) {
    const x = Math.round(point[0] * scale);
    const y = Math.round(point[1] * scale);
    return [x, y];
  }

  async function scaleScreenshot(image) {
    if (scale === 1) return Buffer.from(image);

    try {
      const result = await sharp(image)
        .resize(scaledWidth, scaledHeight, {
          fit: "fill",
          kernel: "lanczos3",
          fastShrinkOnLoad: false,
        })
        .toBuffer();
      return result;
    } catch (_) {
      return Buffer.from(image);
    }
  }

  return {
    getOriginalResolution: () => [originalWidth, originalHeight],
    getScaledResolution: () => [scaledWidth, scaledHeight],
    getScale: () => scale,
    toOriginal,
    toScaled,
    scaleScreenshot,
  };
}

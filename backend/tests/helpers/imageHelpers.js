/**
 * Image test helper utilities for generating test image buffers.
 *
 * Provides programmatic image generation using Sharp for testing file upload
 * validation, image processing, and storage operations without relying on
 * static fixture files.
 *
 * All functions are async and return Promises.
 */
import sharp from 'sharp';

/**
 * Create a valid JPEG image buffer.
 *
 * @param {number} width - Image width in pixels (default: 100)
 * @param {number} height - Image height in pixels (default: 100)
 * @returns {Promise<Buffer>} JPEG image buffer
 *
 * @example
 * const jpegBuffer = await createTestJPEG(200, 200);
 * // Use in test: .attach('mainImage', jpegBuffer, 'photo.jpg')
 */
export async function createTestJPEG(width = 100, height = 100) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 100, b: 100 }
    }
  })
    .jpeg({ quality: 80 })
    .toBuffer();
}

/**
 * Create a valid PNG image buffer with alpha channel.
 *
 * @param {number} width - Image width in pixels (default: 100)
 * @param {number} height - Image height in pixels (default: 100)
 * @returns {Promise<Buffer>} PNG image buffer
 *
 * @example
 * const pngBuffer = await createTestPNG(150, 150);
 * // Use in test: .attach('mainImage', pngBuffer, 'graphic.png')
 */
export async function createTestPNG(width = 100, height = 100) {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 100, g: 255, b: 100, alpha: 1 }
    }
  })
    .png()
    .toBuffer();
}

/**
 * Create a valid WebP image buffer.
 *
 * @param {number} width - Image width in pixels (default: 100)
 * @param {number} height - Image height in pixels (default: 100)
 * @returns {Promise<Buffer>} WebP image buffer
 *
 * @example
 * const webpBuffer = await createTestWebP(120, 120);
 * // Use in test: .attach('mainImage', webpBuffer, 'optimized.webp')
 */
export async function createTestWebP(width = 100, height = 100) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 100, g: 100, b: 255 }
    }
  })
    .webp({ quality: 85 })
    .toBuffer();
}

/**
 * Create a corrupt/truncated image buffer.
 *
 * Generates a valid JPEG then truncates it to ~30% of original size to simulate
 * a corrupt or incomplete image download/upload.
 *
 * @returns {Promise<Buffer>} Truncated/corrupt image buffer
 *
 * @example
 * const corruptBuffer = await createCorruptImage();
 * // Sharp should reject this buffer when processing
 */
export async function createCorruptImage() {
  // Create valid JPEG first
  const validJpeg = await createTestJPEG(200, 200);

  // Truncate to ~30% to corrupt it
  const truncateSize = Math.floor(validJpeg.length * 0.3);
  return validJpeg.subarray(0, truncateSize);
}

/**
 * Create an oversized image buffer exceeding upload limits.
 *
 * Generates a large PNG buffer that exceeds the default 50MB upload limit.
 * PNG has minimal compression, making file size more predictable.
 *
 * Note: For a 60MB target, create an image with sufficient pixel data.
 * PNG stores ~4 bytes per pixel (RGBA), so 60MB ≈ 15M pixels ≈ 4000x4000.
 *
 * @param {number} targetSizeMB - Target size in megabytes (default: 60)
 * @returns {Promise<Buffer>} Large PNG buffer
 *
 * @example
 * const oversizedBuffer = await createOversizedBuffer(60);
 * // Should be rejected by Multer with LIMIT_FILE_SIZE (413 status)
 */
export async function createOversizedBuffer(targetSizeMB = 60) {
  // PNG with RGBA stores ~4 bytes per pixel (less with compression, but closer to actual size)
  // For 60MB target: 60 * 1024 * 1024 bytes / 4 bytes per pixel ≈ 15.7M pixels
  // sqrt(15.7M) ≈ 3970, so use 4100x4100 to ensure we exceed 50MB even with PNG compression
  const dimension = 4200;

  return sharp({
    create: {
      width: dimension,
      height: dimension,
      channels: 4,
      background: { r: 128, g: 128, b: 128, alpha: 1 }
    }
  })
    .png({ compressionLevel: 0 }) // No compression for predictable size
    .toBuffer();
}

/**
 * Verify if a buffer is a valid image.
 *
 * Attempts to read metadata from the buffer using Sharp. Returns validation
 * result with format details or error information.
 *
 * @param {Buffer} buffer - Image buffer to verify
 * @returns {Promise<Object>} Validation result object
 *
 * Success: { valid: true, format: 'jpeg', width: 100, height: 100 }
 * Failure: { valid: false, error: 'error message' }
 *
 * @example
 * const jpegBuffer = await createTestJPEG();
 * const result = await verifyImageBuffer(jpegBuffer);
 * expect(result.valid).toBe(true);
 * expect(result.format).toBe('jpeg');
 */
export async function verifyImageBuffer(buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    return {
      valid: true,
      format: metadata.format,
      width: metadata.width,
      height: metadata.height
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

/*
 * Expected usage in tests:
 *
 * import {
 *   createTestJPEG,
 *   createTestPNG,
 *   createTestWebP,
 *   createCorruptImage,
 *   createOversizedBuffer,
 *   verifyImageBuffer
 * } from '../helpers/imageHelpers.js';
 *
 * // Generate test images
 * const jpegBuffer = await createTestJPEG(200, 200);
 * const pngBuffer = await createTestPNG();
 * const webpBuffer = await createTestWebP();
 *
 * // Verify generated images
 * const verification = await verifyImageBuffer(jpegBuffer);
 * expect(verification.valid).toBe(true);
 * expect(verification.format).toBe('jpeg');
 *
 * // Test with corrupt image
 * const corruptBuffer = await createCorruptImage();
 * const corruptVerify = await verifyImageBuffer(corruptBuffer);
 * expect(corruptVerify.valid).toBe(false);
 *
 * // Test with oversized image
 * const hugeBuffer = await createOversizedBuffer(60);
 * expect(hugeBuffer.length).toBeGreaterThan(50 * 1024 * 1024);
 */

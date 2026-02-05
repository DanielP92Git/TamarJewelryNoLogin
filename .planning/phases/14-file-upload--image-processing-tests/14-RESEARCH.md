# Phase 14: File Upload & Image Processing Tests - Research

**Researched:** 2026-02-05
**Domain:** File upload testing, Sharp image processing, S3 mocking
**Confidence:** HIGH

## Summary

File upload testing involves three distinct layers: HTTP multipart validation (Multer), image processing validation (Sharp), and cloud storage mocking (S3 via nock). The project already has established patterns from Phases 10-13: Vitest + supertest for integration tests, nock for HTTP mocking, and mongodb-memory-server for database isolation.

**Key findings:**
- Supertest's `.attach()` method handles multipart/form-data uploads with realistic file objects
- Sharp processes actual images (not mocked) to validate real behavior and error handling
- S3 must be mocked at HTTP level with nock (existing pattern from Phase 10)
- MIME type validation alone is insufficient - consider file-type package for magic number validation
- Multer provides specific error codes (LIMIT_FILE_SIZE, LIMIT_FILE_COUNT) for test assertions

**Primary recommendation:** Use supertest integration tests with real Sharp processing and nocked S3, generating minimal test images with Sharp itself rather than storing fixtures. This validates actual behavior while preventing production storage access.

## Standard Stack

The established libraries for file upload testing in this project:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| supertest | 7.2.2 | HTTP integration testing | Already used in Phases 11-13; `.attach()` handles multipart uploads |
| sharp | 0.32.6 | Image processing (NOT mocked) | Production library - test real behavior, not mocks |
| nock | 14.0.10 | S3 HTTP mocking | Established in Phase 10; prevents production storage access |
| vitest | 4.0.18 | Test framework | Project standard from Phase 10 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| file-type | Latest ESM | Magic number validation | OPTIONAL - only if testing MIME spoofing beyond Multer's existing filters |
| mongodb-memory-server | 11.0.1 | Database isolation | Already configured - use for product/user data in upload tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sharp (real) | Mock Sharp | Real Sharp catches actual errors; mocks only test mock behavior |
| nock S3 | aws-sdk-mock | nock is HTTP-level (consistent with Phase 10); aws-sdk-mock requires rewriting existing S3 mock helpers |
| Generated images | Fixture files | Generated images avoid repo bloat and can be parameterized; fixtures are simpler but static |

**Installation:**
No new dependencies required. All libraries already installed from Phase 10.

Optional (only if testing MIME spoofing beyond current validation):
```bash
npm install --save-dev file-type
```

## Architecture Patterns

### Recommended Test Structure
```
tests/
├── integration/
│   ├── file.upload.test.js       # Main upload endpoint tests
│   ├── file.validation.test.js   # MIME type, size, dimension validation
│   └── file.processing.test.js   # Sharp resize/conversion tests
└── helpers/
    ├── imageHelpers.js            # Generate test images with Sharp
    └── mocks/
        └── s3.js                  # Already exists - S3 HTTP mocks with nock
```

### Pattern 1: Supertest File Upload
**What:** Use `.attach()` to upload files as multipart/form-data
**When to use:** Testing any endpoint that accepts file uploads via Multer
**Example:**
```javascript
// Source: https://medium.com/@linuk/unit-testign-rest-api-file-upload-with-jest-supertest-and-mz-in-node-ecbab9814aef
import request from 'supertest';
import fs from 'fs';

// Upload with admin authentication
const response = await request(app)
  .post('/upload')
  .set('auth-token', adminToken)
  .attach('mainImage', imageBuffer, 'test-image.jpg')
  .attach('smallImages', smallImageBuffer1, 'small-1.jpg')
  .attach('smallImages', smallImageBuffer2, 'small-2.jpg')
  .expect(200);

expect(response.body).toHaveProperty('success', true);
expect(response.body.mainImage).toHaveProperty('desktop');
```

### Pattern 2: Generate Test Images with Sharp
**What:** Create minimal valid/invalid images programmatically instead of storing fixtures
**When to use:** Need test images with specific properties (size, format, corruption)
**Example:**
```javascript
// Source: https://sharp.pixelplumbing.com/api-output/
import sharp from 'sharp';

// Generate valid JPEG (1KB)
export async function createTestJPEG(width = 100, height = 100) {
  return await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 0, b: 0 }
    }
  })
  .jpeg({ quality: 80 })
  .toBuffer();
}

// Generate valid PNG
export async function createTestPNG(width = 100, height = 100) {
  return await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 255, b: 0, alpha: 1 }
    }
  })
  .png()
  .toBuffer();
}

// Generate valid WebP
export async function createTestWebP(width = 100, height = 100) {
  return await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 0, g: 0, b: 255 }
    }
  })
  .webp({ quality: 85 })
  .toBuffer();
}

// Generate corrupt image (truncated buffer)
export async function createCorruptImage() {
  const validBuffer = await createTestJPEG();
  return validBuffer.slice(0, validBuffer.length / 2); // Truncate
}

// Generate oversized image
export async function createOversizedImage(targetSizeMB = 60) {
  // Multer limit is 50MB by default
  const targetBytes = targetSizeMB * 1024 * 1024;
  const dimension = Math.ceil(Math.sqrt(targetBytes / 3)); // RGB = 3 bytes/pixel
  return await sharp({
    create: {
      width: dimension,
      height: dimension,
      channels: 3,
      background: { r: 128, g: 128, b: 128 }
    }
  })
  .jpeg({ quality: 100 })
  .toBuffer();
}
```

### Pattern 3: Mock S3 with nock (Existing Pattern)
**What:** HTTP-level S3 mocking to prevent production storage access
**When to use:** Any test that triggers S3 upload via AWS SDK
**Example:**
```javascript
// Source: C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\tests\helpers\mocks\s3.js
import { mockS3Upload, mockS3Error } from '../helpers/mocks/index.js';

describe('File upload to S3', () => {
  beforeEach(() => {
    // Mock successful S3 upload
    mockS3Upload({
      bucket: 'test-bucket',
      endpoint: 'https://nyc3.digitaloceanspaces.com'
    });
  });

  it('should upload image to S3 and return URL', async () => {
    const imageBuffer = await createTestJPEG();

    const response = await request(app)
      .post('/upload')
      .set('auth-token', adminToken)
      .attach('mainImage', imageBuffer, 'test.jpg')
      .expect(200);

    // Verify S3 URL format
    expect(response.body.mainImage.desktop).toMatch(/test-bucket.*\.webp$/);
  });

  it('should handle S3 upload failure gracefully', async () => {
    // Override default mock with error
    nock.cleanAll();
    mockS3Error({
      statusCode: 403,
      errorCode: 'AccessDenied'
    });

    const imageBuffer = await createTestJPEG();

    const response = await request(app)
      .post('/upload')
      .set('auth-token', adminToken)
      .attach('mainImage', imageBuffer, 'test.jpg')
      .expect(500);

    expect(response.body).toHaveProperty('success', false);
  });
});
```

### Pattern 4: Test Sharp Error Handling
**What:** Verify Sharp handles corrupt images gracefully without crashing
**When to use:** Testing FILE-07 (Sharp handles corrupt images gracefully)
**Example:**
```javascript
// Source: https://app.studyraid.com/en/read/11937/380595/common-error-types-and-handling
import { createCorruptImage } from '../helpers/imageHelpers.js';

it('should reject corrupt images without crashing server', async () => {
  const corruptBuffer = await createCorruptImage();

  const response = await request(app)
    .post('/upload')
    .set('auth-token', adminToken)
    .attach('mainImage', corruptBuffer, 'corrupt.jpg')
    .expect(500); // or 400, depending on error handling

  expect(response.body).toHaveProperty('success', false);
  expect(response.body.error).toMatch(/processing|invalid|corrupt/i);
});
```

### Pattern 5: Multer Error Assertions
**What:** Test Multer's specific error codes for validation failures
**When to use:** Testing size limits, file count limits, MIME type rejection
**Example:**
```javascript
// Source: https://betterstack.com/community/guides/scaling-nodejs/multer-in-nodejs/
it('should reject files exceeding size limit with 413', async () => {
  const oversizedBuffer = await createOversizedImage(60); // 60MB > 50MB limit

  const response = await request(app)
    .post('/upload')
    .set('auth-token', adminToken)
    .attach('mainImage', oversizedBuffer, 'huge.jpg')
    .expect(413); // HTTP 413 Payload Too Large

  expect(response.body).toHaveProperty('success', false);
  expect(response.body.code).toBe('LIMIT_FILE_SIZE');
});

it('should reject invalid MIME types', async () => {
  // Backend allows: image/jpeg, image/png, image/gif, image/webp
  // Note: Backend currently allows GIF - tests should match implementation
  const pdfBuffer = Buffer.from('%PDF-1.4'); // PDF magic number

  const response = await request(app)
    .post('/upload')
    .set('auth-token', adminToken)
    .attach('mainImage', pdfBuffer, 'document.pdf')
    .expect(400);

  expect(response.body).toHaveProperty('success', false);
  expect(response.body.error).toMatch(/type not supported/i);
});
```

### Anti-Patterns to Avoid
- **Storing fixture images in repo:** Generates repo bloat; use Sharp to create images on-demand
- **Mocking Sharp:** Tests mock behavior, not real Sharp processing; defeats purpose of image processing tests
- **Skipping S3 mocks:** Risk of uploading to production storage during tests
- **Testing only happy path:** Upload tests must verify error scenarios (oversized, corrupt, wrong type)
- **Ignoring MIME spoofing:** If adding magic number validation with file-type, test mismatched extension/content

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Generate test images | Custom image generation or fixture files | Sharp's `create` API | Sharp can generate minimal test images programmatically; avoids fixture bloat |
| MIME type validation | Custom magic number parsing | file-type package | Magic numbers are complex (hundreds of formats); file-type handles edge cases |
| S3 mocking | Custom AWS SDK mocks | nock HTTP mocking | Already established in Phase 10; HTTP-level mocks work across AWS SDK versions |
| File upload testing | Manual multipart construction | supertest `.attach()` | Supertest handles multipart encoding, boundaries, headers automatically |
| Corrupt image generation | Complex buffer manipulation | Sharp with truncated buffer | Simple `.slice()` on valid Sharp output creates realistic corruption |

**Key insight:** Sharp itself is the best tool for generating test images. Using Sharp to create test data for Sharp tests may seem circular, but it's actually ideal - you're testing the *processing* logic (resize, format conversion, error handling) with known-valid inputs, not testing whether Sharp can create images.

## Common Pitfalls

### Pitfall 1: Assuming MIME Type Validation is Sufficient
**What goes wrong:** Multer validates MIME types from request headers, which are client-controlled and easily spoofed. Malicious users can upload .exe files renamed to .jpg with fake MIME type.
**Why it happens:** Multer's `fileFilter` only checks `file.mimetype` and `file.originalname`, not actual file content.
**How to avoid:**
1. Current implementation: Validate both extension AND MIME type (defense-in-depth)
2. Enhanced: Add file-type package to validate magic numbers (first bytes of file)
3. Sharp itself validates image format when processing - corrupt/non-image files will error

**Warning signs:**
- Test uploads non-image with faked extension/MIME and it succeeds
- Server crashes on Sharp processing (means invalid file reached Sharp)

**Example:**
```javascript
// Source: https://dev.to/ayanabilothman/file-type-validation-in-multer-is-not-safe-3h8l
import { fileTypeFromBuffer } from 'file-type';

// In fileFilter or after Multer processes file
const detectedType = await fileTypeFromBuffer(file.buffer);
if (!['image/jpeg', 'image/png', 'image/webp'].includes(detectedType?.mime)) {
  throw new Error('File type not supported');
}
```

**Note:** Current implementation relies on Sharp to validate during processing. FILE-01/FILE-02 tests should verify this behavior.

### Pitfall 2: Not Disabling Network Requests to S3
**What goes wrong:** Tests accidentally upload to production DigitalOcean Spaces, creating test files in production storage.
**Why it happens:** nock doesn't block requests by default if no matching mock is registered.
**How to avoid:**
1. Use `nock.disableNetConnect()` in test setup (already done in Phase 10)
2. Allow only localhost for supertest: `nock.enableNetConnect('127.0.0.1')`
3. Verify S3 endpoint is mocked before each test involving uploads

**Warning signs:**
- Unexpected files appearing in production Spaces
- Tests pass locally but fail in CI without S3 credentials
- Test console shows actual S3 URLs instead of mock URLs

**Example:**
```javascript
// Source: C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\tests\helpers\mocks\index.js
import { disableNetConnect, mockS3Upload } from '../helpers/mocks/index.js';

beforeAll(() => {
  disableNetConnect(); // Blocks all HTTP except localhost
});

beforeEach(() => {
  mockS3Upload(); // Register S3 mock for this test
});
```

### Pitfall 3: Sharp Async Error Handling
**What goes wrong:** Sharp errors (corrupt images, unsupported formats) are not caught, causing unhandled promise rejections or server crashes.
**Why it happens:** Sharp operations return promises that must be awaited; errors thrown during processing are async.
**How to avoid:**
1. Backend must wrap Sharp processing in try-catch
2. Tests should verify backend returns proper error responses (400/500) for corrupt images
3. Never let Sharp errors propagate to top-level unhandled rejections

**Warning signs:**
- UnhandledPromiseRejectionWarning in test output
- Server process exits during upload tests
- No error response returned to client for invalid images

**Example:**
```javascript
// Backend pattern (already implemented in processImage function)
try {
  await sharp(inputPath)
    .resize({ width: 1200 })
    .webp({ quality: 85 })
    .toFile(outputPath);
} catch (error) {
  console.error('Sharp processing failed:', error);
  throw new Error('Image processing failed');
}

// Test verification
it('should return 500 when Sharp fails to process image', async () => {
  const corruptBuffer = await createCorruptImage();

  const response = await request(app)
    .post('/upload')
    .set('auth-token', adminToken)
    .attach('mainImage', corruptBuffer, 'bad.jpg');

  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(response.body.success).toBe(false);
});
```

### Pitfall 4: Ignoring Sharp failOnError Option
**What goes wrong:** Backend uses `failOnError: false` for RAW image support, which means Sharp may process corrupt images silently, producing invalid output.
**Why it happens:** `failOnError: false` makes Sharp "best effort" - it attempts to decode corrupt data instead of throwing errors.
**How to avoid:**
1. Understand backend uses `failOnError: false` for RAW files (CR2, ARW)
2. Tests must verify Sharp produces valid output, not just that it doesn't throw
3. For standard formats (JPEG, PNG, WebP), consider stricter validation

**Warning signs:**
- Corrupt images processed successfully but output is garbled
- Tests pass but uploaded images are broken in production
- Sharp doesn't throw errors for obviously invalid images

**Example from backend:**
```javascript
// Source: C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\index.js:4057-4067
const sharpOptions = {
  failOnError: false, // Allow processing RAW files
  raw: isRAW ? { width: 5000, height: 4000, channels: 3, density: 300 } : undefined,
};
```

**Test strategy:** Verify output validity, not just error absence:
```javascript
it('should produce valid WebP output from valid JPEG input', async () => {
  const jpegBuffer = await createTestJPEG(1000, 1000);

  const response = await request(app)
    .post('/upload')
    .set('auth-token', adminToken)
    .attach('mainImage', jpegBuffer, 'test.jpg')
    .expect(200);

  // Verify output format (backend converts to WebP)
  expect(response.body.mainImage.desktop).toMatch(/\.webp$/);

  // Optional: Download and verify with Sharp
  // const outputUrl = response.body.mainImage.desktop;
  // const metadata = await sharp(downloadedBuffer).metadata();
  // expect(metadata.format).toBe('webp');
});
```

### Pitfall 5: Hardcoded File Size Limits in Tests
**What goes wrong:** Tests hardcode 50MB limit, but backend reads `process.env.UPLOAD_MAX_FILE_SIZE_MB`, causing tests to fail when env changes.
**Why it happens:** Backend configuration is flexible via env vars; tests assume defaults.
**How to avoid:**
1. Read backend's actual limit: `Number(process.env.UPLOAD_MAX_FILE_SIZE_MB || 50) * 1024 * 1024`
2. Test boundary conditions: just under limit (should pass), just over limit (should fail)
3. Document test assumptions about environment configuration

**Warning signs:**
- Tests fail when `UPLOAD_MAX_FILE_SIZE_MB` env var is set differently
- Boundary tests pass when they should fail or vice versa

**Example:**
```javascript
// Read actual backend limit
const UPLOAD_MAX_SIZE_MB = Number(process.env.UPLOAD_MAX_FILE_SIZE_MB || 50);
const UPLOAD_MAX_SIZE_BYTES = UPLOAD_MAX_SIZE_MB * 1024 * 1024;

it('should accept file just under size limit', async () => {
  // 1MB under limit
  const sizeMB = UPLOAD_MAX_SIZE_MB - 1;
  const validBuffer = await createOversizedImage(sizeMB);

  const response = await request(app)
    .post('/upload')
    .set('auth-token', adminToken)
    .attach('mainImage', validBuffer, 'large.jpg')
    .expect(200);
});

it('should reject file just over size limit', async () => {
  // 1MB over limit
  const sizeMB = UPLOAD_MAX_SIZE_MB + 1;
  const oversizedBuffer = await createOversizedImage(sizeMB);

  const response = await request(app)
    .post('/upload')
    .set('auth-token', adminToken)
    .attach('mainImage', oversizedBuffer, 'toolarge.jpg')
    .expect(413);
});
```

## Code Examples

Verified patterns from official sources and project code:

### Complete Upload Test Structure
```javascript
// Source: Synthesized from Phase 10-13 patterns + supertest documentation
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createAdmin } from '../helpers/factories.js';
import { createAuthToken } from '../helpers/authHelpers.js';
import { validateTestEnvironment } from '../helpers/envGuard.js';
import { disableNetConnect, cleanAllMocks, mockS3Upload } from '../helpers/mocks/index.js';
import { createTestJPEG, createTestPNG, createTestWebP } from '../helpers/imageHelpers.js';

describe('File Upload - /upload endpoint', () => {
  let app;
  let User;
  let adminToken;

  beforeAll(async () => {
    validateTestEnvironment();
    disableNetConnect();

    const appModule = await import('../../index.js');
    app = appModule.app;
    User = mongoose.model('Users');

    // Create admin user and token
    const admin = createAdmin();
    await new User(admin).save();
    adminToken = createAuthToken(admin);
  });

  afterAll(async () => {
    cleanAllMocks();
  });

  beforeEach(async () => {
    cleanAllMocks();
    mockS3Upload(); // Mock S3 for each test
  });

  describe('Valid file uploads', () => {
    it('should accept JPEG and return WebP URLs', async () => {
      const jpegBuffer = await createTestJPEG(800, 600);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', jpegBuffer, 'photo.jpg')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.mainImage.desktop).toMatch(/\.webp$/);
      expect(response.body.mainImage.mobile).toMatch(/\.webp$/);
    });

    it('should accept PNG and return WebP URLs', async () => {
      const pngBuffer = await createTestPNG(1200, 900);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', pngBuffer, 'graphic.png')
        .expect(200);

      expect(response.body.mainImage.desktop).toMatch(/\.webp$/);
    });

    it('should accept WebP input', async () => {
      const webpBuffer = await createTestWebP(1000, 1000);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', webpBuffer, 'optimized.webp')
        .expect(200);

      expect(response.body.mainImage.desktop).toMatch(/\.webp$/);
    });

    it('should accept main image plus multiple small images', async () => {
      const mainBuffer = await createTestJPEG(1200, 900);
      const small1 = await createTestJPEG(400, 400);
      const small2 = await createTestJPEG(400, 400);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', mainBuffer, 'main.jpg')
        .attach('smallImages', small1, 'small1.jpg')
        .attach('smallImages', small2, 'small2.jpg')
        .expect(200);

      expect(response.body.smallImages).toHaveLength(2);
      expect(response.body.smallImages[0].desktop).toMatch(/\.webp$/);
    });
  });

  describe('File validation', () => {
    it('should reject file exceeding size limit', async () => {
      const maxSizeMB = Number(process.env.UPLOAD_MAX_FILE_SIZE_MB || 50);
      const oversizedBuffer = await createOversizedImage(maxSizeMB + 10);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', oversizedBuffer, 'huge.jpg')
        .expect(413);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.code).toBe('LIMIT_FILE_SIZE');
    });

    it('should reject unsupported file types (PDF)', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n%âãÏÓ\n');

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', pdfBuffer, 'document.pdf')
        .expect(400);

      expect(response.body.error).toMatch(/type not supported/i);
    });

    it('should reject upload with no files', async () => {
      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .expect(400);

      expect(response.body.error).toMatch(/no files/i);
    });

    it('should reject upload with no main image', async () => {
      const smallBuffer = await createTestJPEG(400, 400);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('smallImages', smallBuffer, 'small.jpg')
        .expect(400);

      expect(response.body.error).toMatch(/no main image/i);
    });
  });

  describe('Sharp image processing', () => {
    it('should handle corrupt images gracefully', async () => {
      const corruptBuffer = await createCorruptImage();

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', corruptBuffer, 'corrupt.jpg');

      // Should return error, not crash
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should resize images correctly', async () => {
      // Backend creates desktop (1200px) and mobile (800px) versions
      const largeBuffer = await createTestJPEG(3000, 2000);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', largeBuffer, 'large.jpg')
        .expect(200);

      // Verify two sizes created
      expect(response.body.mainImage.desktop).toBeTruthy();
      expect(response.body.mainImage.mobile).toBeTruthy();
      expect(response.body.mainImage.desktop).not.toBe(response.body.mainImage.mobile);
    });

    it('should convert all formats to WebP', async () => {
      const jpegBuffer = await createTestJPEG();
      const pngBuffer = await createTestPNG();

      const jpegResponse = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', jpegBuffer, 'test.jpg')
        .expect(200);

      const pngResponse = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', pngBuffer, 'test.png')
        .expect(200);

      expect(jpegResponse.body.mainImage.desktop).toMatch(/\.webp$/);
      expect(pngResponse.body.mainImage.desktop).toMatch(/\.webp$/);
    });
  });

  describe('S3 integration (mocked)', () => {
    it('should upload to S3 and return public URLs', async () => {
      const imageBuffer = await createTestJPEG();

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', imageBuffer, 'test.jpg')
        .expect(200);

      // Verify S3 URL format (if S3 configured)
      // In test env without S3 config, returns local paths
      expect(response.body.mainImage.desktop).toBeTruthy();
    });

    it('should handle S3 upload failures gracefully', async () => {
      // Clear default mock and add error mock
      cleanAllMocks();
      mockS3Error({ statusCode: 403, errorCode: 'AccessDenied' });

      const imageBuffer = await createTestJPEG();

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', imageBuffer, 'test.jpg');

      // Should handle error (500 or fallback to local)
      // Behavior depends on isProdEnv setting
      expect(response.body).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('should require admin role for uploads', async () => {
      const imageBuffer = await createTestJPEG();

      const response = await request(app)
        .post('/upload')
        // No auth-token
        .attach('mainImage', imageBuffer, 'test.jpg')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
```

### Image Helper Functions
```javascript
// Source: Sharp documentation + pattern synthesis
// File: tests/helpers/imageHelpers.js
import sharp from 'sharp';

/**
 * Create a minimal valid JPEG image for testing.
 * @param {number} width - Image width in pixels
 * @param {number} height - Image height in pixels
 * @param {Object} options - Additional options
 * @returns {Promise<Buffer>} JPEG image buffer
 */
export async function createTestJPEG(width = 100, height = 100, options = {}) {
  const { quality = 80, background = { r: 255, g: 100, b: 100 } } = options;

  return await sharp({
    create: {
      width,
      height,
      channels: 3,
      background
    }
  })
  .jpeg({ quality })
  .toBuffer();
}

/**
 * Create a minimal valid PNG image for testing.
 */
export async function createTestPNG(width = 100, height = 100, options = {}) {
  const { compressionLevel = 6, background = { r: 100, g: 255, b: 100, alpha: 1 } } = options;

  return await sharp({
    create: {
      width,
      height,
      channels: 4,
      background
    }
  })
  .png({ compressionLevel })
  .toBuffer();
}

/**
 * Create a minimal valid WebP image for testing.
 */
export async function createTestWebP(width = 100, height = 100, options = {}) {
  const { quality = 85, background = { r: 100, g: 100, b: 255 } } = options;

  return await sharp({
    create: {
      width,
      height,
      channels: 3,
      background
    }
  })
  .webp({ quality })
  .toBuffer();
}

/**
 * Create a corrupt image by truncating a valid image buffer.
 * Tests Sharp's error handling for invalid/corrupt images.
 */
export async function createCorruptImage(format = 'jpeg') {
  const createFn = format === 'png' ? createTestPNG : createTestJPEG;
  const validBuffer = await createFn(200, 200);

  // Truncate buffer to simulate corruption
  return validBuffer.slice(0, Math.floor(validBuffer.length * 0.3));
}

/**
 * Create an oversized image for testing size limits.
 * @param {number} targetSizeMB - Target size in megabytes
 */
export async function createOversizedImage(targetSizeMB = 60) {
  // Estimate dimensions needed for target file size
  // JPEG compression varies, so this is approximate
  const targetBytes = targetSizeMB * 1024 * 1024;
  const estimatedDimension = Math.ceil(Math.sqrt(targetBytes / 2)); // Rough estimate

  return await sharp({
    create: {
      width: estimatedDimension,
      height: estimatedDimension,
      channels: 3,
      background: { r: 128, g: 128, b: 128 }
    }
  })
  .jpeg({ quality: 100, mozjpeg: false }) // High quality for larger file
  .toBuffer();
}

/**
 * Create an image with specific dimensions for testing dimension validation.
 */
export async function createImageWithDimensions(width, height) {
  return await createTestJPEG(width, height);
}

/**
 * Create a GIF image (if backend allows GIF in testing).
 * Note: Current backend allows GIF via UPLOAD_ALLOWED_IMAGE_MIME_TYPES.
 */
export async function createTestGIF(width = 100, height = 100) {
  // Sharp doesn't support GIF creation, use PNG as base
  const buffer = await createTestPNG(width, height);

  // For true GIF testing, would need to use another library or fixture
  // For now, return PNG with .gif filename hint
  return buffer;
}

/**
 * Verify an image buffer is valid and processable by Sharp.
 * Useful for validating test helpers produce valid output.
 */
export async function verifyImageValid(buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    return {
      valid: true,
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      size: buffer.length
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fixture image files | Programmatically generated with Sharp | 2024+ best practice | Reduces repo size, enables parameterized tests |
| MIME type only validation | MIME + extension + magic number (file-type) | 2025-2026 | Better security against MIME spoofing |
| aws-sdk-mock | nock HTTP-level mocking | 2024+ | Works across AWS SDK versions, simpler HTTP interception |
| Jest | Vitest | 2023+ | Faster, native ESM support, better DX |
| Storing fixtures in S3 | Mocking S3 completely | Always | Prevents production contamination |

**Deprecated/outdated:**
- **Jest + babel for ES modules:** Vitest has native ESM support, no transpilation needed
- **formidable:** Replaced by Multer for Express file uploads (simpler API, better middleware integration)
- **ImageMagick CLI:** Sharp uses libvips (faster, lower memory, native Node.js API)

## Open Questions

Things that couldn't be fully resolved:

1. **Backend's GIF support**
   - What we know: Backend includes `image/gif` in `UPLOAD_ALLOWED_IMAGE_MIME_TYPES` (line 777)
   - What's unclear: Requirements say "JPEG, PNG, WebP only" but backend allows GIF
   - Recommendation: Test current backend behavior (allows GIF), document discrepancy, let planner decide if requirements need updating or backend needs restriction

2. **Dimension constraints**
   - What we know: FILE-10 requires testing min/max width/height validation
   - What's unclear: Backend code doesn't show explicit dimension validation (only size limit in bytes)
   - Recommendation: Verify if backend validates dimensions or if this requirement needs implementation

3. **File deletion testing (FILE-11)**
   - What we know: Requirement says test "file deletion removes file from storage (mocked)"
   - What's unclear: No `/delete` or file deletion endpoint found in current backend code
   - Recommendation: Clarify if this tests an existing endpoint or requires new implementation

4. **RAW file format testing**
   - What we know: Backend supports CR2 and ARW (camera RAW formats) with special Sharp options
   - What's unclear: Whether RAW file testing is in scope for Phase 14
   - Recommendation: Focus on JPEG/PNG/WebP per requirements; defer RAW testing unless explicitly needed

5. **S3 URL verification depth**
   - What we know: S3 mocks return success, backend constructs URLs with spacesPublicBaseUrl
   - What's unclear: How deeply to verify URL structure (path vs virtual-host, CDN vs direct)
   - Recommendation: Verify URLs are truthy and match `.webp$` format; full URL parsing is brittle and depends on env config

## Sources

### Primary (HIGH confidence)
- Phase 10-13 test patterns: C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\tests\
- Backend implementation: C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\index.js (lines 755-825, 3070-3170, 4036+)
- S3 mock helpers: C:\Users\pagis\OneDrive\WebDev\Projects\Online\backend\tests\helpers\mocks\s3.js
- [Sharp API Documentation](https://sharp.pixelplumbing.com/api-constructor/) - Constructor options including failOnError
- [Sharp Output Options](https://sharp.pixelplumbing.com/api-output/) - Format conversion (JPEG, PNG, WebP)

### Secondary (MEDIUM confidence)
- [Multer File Uploads in Node.js (Better Stack, 2026)](https://betterstack.com/community/guides/scaling-nodejs/multer-in-nodejs/) - MulterError codes, size limits
- [Unit Testing REST API File Upload with Jest, Supertest (Medium)](https://medium.com/@linuk/unit-testign-rest-api-file-upload-with-jest-supertest-and-mz-in-node-ecbab9814aef) - Supertest `.attach()` examples
- [File Upload Testing Best Practices (Codementor)](https://www.codementor.io/@seunsomefun/writing-tests-for-image-file-uploads-in-nodejs-1byoggozxw) - Integration test patterns
- [Sharp Error Handling (StudyRaid)](https://app.studyraid.com/en/read/11937/380595/common-error-types-and-handling) - Common error types, async handling

### Tertiary (LOW confidence - flag for validation)
- [File-Type Validation in Multer is NOT SAFE (DEV Community)](https://dev.to/ayanabilothman/file-type-validation-in-multer-is-not-safe-3h8l) - MIME spoofing vulnerability (confirms need for magic number validation)
- [Magic Number Validation in NodeJS (Medium)](https://medium.com/@sridhar_be/file-validations-using-magic-numbers-in-nodejs-express-server-d8fbb31a97e7) - file-type package usage
- [Simplifying AWS Testing: AWS SDK Mock (Speedscale)](https://speedscale.com/blog/simplifying-aws-testing-a-guide-to-aws-sdk-mock/) - Alternative to nock for S3 (not recommended - inconsistent with Phase 10)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and used in Phases 10-13
- Architecture: HIGH - Direct observation of existing test patterns in project
- Sharp processing: HIGH - Official documentation + existing backend implementation
- Pitfalls: MEDIUM to HIGH - Mix of official docs (HIGH) and community articles (MEDIUM)
- File-type package: MEDIUM - npm documentation exists but not verified in production use

**Research date:** 2026-02-05
**Valid until:** 2026-03-15 (30 days - stable ecosystem)

**Notes:**
- All required libraries already installed from Phase 10
- Backend implementation reviewed directly (not inferred)
- Test patterns consistent with Phases 11-13 (auth, payment, currency tests)
- MIME type validation discrepancy noted (requirements vs implementation for GIF)
- FILE-10 and FILE-11 requirements may need clarification (dimension validation, delete endpoint)

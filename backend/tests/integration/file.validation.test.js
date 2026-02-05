/**
 * File Upload Validation Integration Tests
 *
 * Tests the /upload endpoint's validation layer with focus on:
 * - Authentication and authorization requirements (admin only)
 * - Valid MIME type acceptance (JPEG, PNG, WebP, GIF)
 * - Invalid MIME type rejection (PDF, BMP, SVG, TXT, etc.)
 * - File size limit enforcement (413 for oversized files)
 * - Missing file validation (400 for no files or no main image)
 *
 * Covers requirements:
 * - FILE-01: Valid MIME type acceptance
 * - FILE-02: Invalid MIME type rejection with 415 status
 * - FILE-03: File size limit configuration
 * - FILE-04: Oversized file rejection with LIMIT_FILE_SIZE code
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';

// Import environment guard and mocks
import { validateTestEnvironment } from '../helpers/envGuard.js';
import {
  disableNetConnect,
  cleanAllMocks,
  mockS3Upload
} from '../helpers/mocks/index.js';

// Import test data helpers
import { createAdmin, createUser } from '../helpers/factories.js';
import { createAuthToken, TEST_JWT_KEY } from '../helpers/authHelpers.js';

// Import image helpers
import {
  createTestJPEG,
  createTestPNG,
  createTestWebP,
  createOversizedBuffer
} from '../helpers/imageHelpers.js';

// Ensure JWT_KEY is set before importing app
process.env.JWT_KEY = TEST_JWT_KEY;

describe('File Upload Validation - /upload endpoint', () => {
  let app;
  let User;
  let adminToken;
  let regularUserToken;

  beforeAll(async () => {
    // Verify safe test environment
    validateTestEnvironment();

    // Disable real HTTP requests
    disableNetConnect();

    // Import app dynamically after environment validation
    const appModule = await import('../../index.js');
    app = appModule.app;

    // Get User model
    User = mongoose.model('Users');
  });

  afterAll(() => {
    cleanAllMocks();
  });

  beforeEach(async () => {
    cleanAllMocks();
    // Mock S3 for tests that reach the upload stage
    mockS3Upload();

    // Create admin user for auth (after database is cleared in global afterEach)
    const admin = await User.create(createAdmin());
    adminToken = createAuthToken(admin);

    // Create regular user for authorization tests
    const regularUser = await User.create(createUser());
    regularUserToken = createAuthToken(regularUser);
  });

  describe('Authentication Requirements', () => {
    it('should return 401 when no auth token provided', async () => {
      const jpegBuffer = await createTestJPEG();

      const response = await request(app)
        .post('/upload')
        .attach('mainImage', jpegBuffer, 'test.jpg')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });

    it('should return 403 when non-admin user attempts upload', async () => {
      const jpegBuffer = await createTestJPEG();

      const response = await request(app)
        .post('/upload')
        .set('auth-token', regularUserToken)
        .attach('mainImage', jpegBuffer, 'test.jpg')
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('Valid MIME Type Acceptance (FILE-01)', () => {
    it('should accept JPEG image upload', async () => {
      const jpegBuffer = await createTestJPEG(200, 200);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', jpegBuffer, 'photo.jpg')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('mainImage');
      expect(response.body.mainImage).toHaveProperty('desktop');
      expect(response.body.mainImage).toHaveProperty('mobile');
    });

    it('should accept PNG image upload', async () => {
      const pngBuffer = await createTestPNG(150, 150);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', pngBuffer, 'graphic.png')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('mainImage');
    });

    it('should accept WebP image upload', async () => {
      const webpBuffer = await createTestWebP(180, 180);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', webpBuffer, 'optimized.webp')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('mainImage');
    });
  });

  describe('Invalid MIME Type Rejection (FILE-02)', () => {
    it('should reject PDF files with 415', async () => {
      // Create a buffer that looks like a PDF
      const pdfBuffer = Buffer.from('%PDF-1.4\n%âãÏÓ\n');

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', pdfBuffer, 'document.pdf')
        .expect(415);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'File type not supported');
    });

    it('should reject BMP files with 415', async () => {
      // BMP magic bytes: 0x42 0x4D (BM)
      const bmpBuffer = Buffer.from([
        0x42, 0x4D, // BM signature
        0x46, 0x00, 0x00, 0x00, // File size
        0x00, 0x00, 0x00, 0x00, // Reserved
        0x36, 0x00, 0x00, 0x00  // Offset to pixel data
      ]);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', bmpBuffer, 'image.bmp')
        .expect(415);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'File type not supported');
    });

    it('should reject SVG files with 415', async () => {
      const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle r="50"/></svg>');

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', svgBuffer, 'image.svg')
        .expect(415);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'File type not supported');
    });

    it('should reject text files with 415', async () => {
      const textBuffer = Buffer.from('This is not an image file, just plain text.');

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', textBuffer, 'file.txt')
        .expect(415);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'File type not supported');
    });

    it('should reject executable files with 415', async () => {
      // MZ header (DOS/Windows executable)
      const exeBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00]);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', exeBuffer, 'malware.exe')
        .expect(415);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'File type not supported');
    });
  });

  describe('File Size Limits (FILE-03, FILE-04)', () => {
    it('should reject files exceeding size limit with 413', async () => {
      // Create a buffer larger than 50MB limit
      const oversizedBuffer = await createOversizedBuffer(60);

      // Verify buffer is actually oversized (> 50MB)
      const fileSizeMB = oversizedBuffer.length / (1024 * 1024);
      expect(fileSizeMB).toBeGreaterThan(50);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', oversizedBuffer, 'huge.jpg')
        .expect(413);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', 'LIMIT_FILE_SIZE');
      expect(response.body).toHaveProperty('error', 'Upload failed');
    });

    it('should accept files under size limit', async () => {
      // Normal-sized image should be well under 50MB limit
      const normalBuffer = await createTestJPEG(500, 500);

      // Verify buffer is under limit
      const fileSizeMB = normalBuffer.length / (1024 * 1024);
      expect(fileSizeMB).toBeLessThan(50);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', normalBuffer, 'normal.jpg')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Missing Files Validation', () => {
    it('should return 400 when no files uploaded', async () => {
      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'No files were uploaded');
    });

    it('should return 400 when no main image provided', async () => {
      // Upload only smallImages without mainImage
      const smallImageBuffer = await createTestJPEG(100, 100);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('smallImages', smallImageBuffer, 'small.jpg')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'No main image provided');
    });

    it('should accept main image with multiple small images', async () => {
      // Mock S3 with persistence for multiple upload calls
      cleanAllMocks();
      const scope = mockS3Upload();
      scope.persist(); // Allow multiple uploads to succeed

      const mainImageBuffer = await createTestJPEG(400, 400);
      const smallImage1 = await createTestJPEG(150, 150);
      const smallImage2 = await createTestPNG(150, 150);
      const smallImage3 = await createTestWebP(150, 150);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', mainImageBuffer, 'main.jpg')
        .attach('smallImages', smallImage1, 'small1.jpg')
        .attach('smallImages', smallImage2, 'small2.png')
        .attach('smallImages', smallImage3, 'small3.webp')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('mainImage');
      expect(response.body).toHaveProperty('smallImages');
      expect(Array.isArray(response.body.smallImages)).toBe(true);
      expect(response.body.smallImages).toHaveLength(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero-byte file with error', async () => {
      const emptyBuffer = Buffer.alloc(0);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', emptyBuffer, 'empty.jpg')
        .expect(500);

      // Empty file makes it past Multer but fails during Sharp processing
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate file extension even with correct MIME type', async () => {
      // Try uploading JPEG with wrong extension
      const jpegBuffer = await createTestJPEG();

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', jpegBuffer, 'image.bmp')
        .expect(415);

      // Backend checks both extension and MIME type
      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle mixed valid and invalid extensions', async () => {
      const validBuffer = await createTestJPEG(200, 200);
      const invalidBuffer = Buffer.from('not an image');

      // First file valid, second file invalid
      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', validBuffer, 'valid.jpg')
        .attach('smallImages', invalidBuffer, 'invalid.txt')
        .expect(415);

      // Should reject entire upload if any file is invalid
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'File type not supported');
    });
  });
});

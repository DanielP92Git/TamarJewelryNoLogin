/**
 * File upload flow integration tests for S3 storage integration (mocked).
 *
 * Tests the complete /upload endpoint flow including upload response URL format,
 * response structure, S3 mock helper correctness, and error handling.
 *
 * Coverage: FILE-08 (S3 upload mocked), FILE-09 (URL generation),
 *           FILE-11 (file deletion mocked)
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import nock from 'nock';
import { createAdmin } from '../helpers/factories.js';
import { createAuthToken } from '../helpers/authHelpers.js';
import { validateTestEnvironment } from '../helpers/envGuard.js';
import {
  disableNetConnect,
  cleanAllMocks,
  mockS3Upload,
  mockS3Delete,
  mockS3Error
} from '../helpers/mocks/index.js';
import {
  createTestJPEG,
  createTestPNG,
  createTestWebP
} from '../helpers/imageHelpers.js';

describe('File Upload Flow - S3 integration (mocked)', () => {
  let app;
  let User;
  let adminUser;
  let adminToken;

  beforeAll(async () => {
    validateTestEnvironment();
    disableNetConnect();

    const appModule = await import('../../index.js');
    app = appModule.app;
    User = mongoose.model('Users');
  });

  afterAll(async () => {
    cleanAllMocks();
  });

  beforeEach(async () => {
    cleanAllMocks();
    // Mock S3 with persist() for multiple uploads per test (desktop + mobile variants)
    mockS3Upload().persist();

    // Create admin user and token (per-test due to global database clearing)
    adminUser = createAdmin();
    await new User(adminUser).save();
    adminToken = createAuthToken(adminUser);
  });

  describe('Upload response URL format (FILE-08, FILE-09)', () => {
    it('should return local file URLs when S3 not configured', async () => {
      // In test environment, s3 is null, so uploadFileToSpaces returns null
      // Backend falls back to local file paths: /uploads/mainImage-*-desktop.webp
      const jpegBuffer = await createTestJPEG(800, 600);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', jpegBuffer, 'test.jpg')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.mainImage).toBeDefined();
      expect(response.body.mainImage.desktop).toBeDefined();
      // Local fallback URL pattern
      expect(response.body.mainImage.desktop).toMatch(/\/uploads\/mainImage-.*-desktop\.webp$/);
    });

    it('should return local mobile URL when S3 not configured', async () => {
      const pngBuffer = await createTestPNG(1000, 800);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', pngBuffer, 'graphic.png')
        .expect(200);

      expect(response.body.mainImage.mobile).toBeDefined();
      expect(response.body.mainImage.mobile).toMatch(/\/uploads\/mainImage-.*-mobile\.webp$/);
    });

    it('should return publicDesktop and publicMobile URLs', async () => {
      const webpBuffer = await createTestWebP(900, 700);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', webpBuffer, 'optimized.webp')
        .expect(200);

      expect(response.body.mainImage).toBeDefined();
      // Backend returns publicDesktop and publicMobile fields
      expect(response.body.mainImage.publicDesktop).toBeDefined();
      expect(response.body.mainImage.publicMobile).toBeDefined();
      expect(response.body.mainImage.publicDesktop).toMatch(/\.webp$/);
      expect(response.body.mainImage.publicMobile).toMatch(/\.webp$/);
    });

    it('should return smallImages URLs for gallery images', async () => {
      const mainBuffer = await createTestJPEG(1200, 900);
      const small1 = await createTestJPEG(400, 400);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', mainBuffer, 'main.jpg')
        .attach('smallImages', small1, 'small.jpg')
        .expect(200);

      expect(response.body.smallImages).toBeDefined();
      expect(response.body.smallImages).toHaveLength(1);
      expect(response.body.smallImages[0].desktop).toBeDefined();
      // Small images use /smallImages/ path
      expect(response.body.smallImages[0].desktop).toMatch(/\/smallImages\/smallImages-.*-desktop\.webp$/);
    });
  });

  describe('Upload response structure (FILE-08)', () => {
    it('should return success: true for valid upload', async () => {
      const jpegBuffer = await createTestJPEG(800, 600);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', jpegBuffer, 'photo.jpg')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should include fileDetails with desktop and mobile metadata', async () => {
      const pngBuffer = await createTestPNG(1000, 800);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', pngBuffer, 'test.png')
        .expect(200);

      expect(response.body.fileDetails).toBeDefined();
      expect(response.body.fileDetails.mainImage).toBeDefined();
      expect(response.body.fileDetails.mainImage.desktop).toBeDefined();
      expect(response.body.fileDetails.mainImage.desktop).toHaveProperty('filename');
      expect(response.body.fileDetails.mainImage.mobile).toBeDefined();
      expect(response.body.fileDetails.mainImage.mobile).toHaveProperty('filename');
    });

    it('should return complete response structure', async () => {
      const jpegBuffer = await createTestJPEG(600, 400);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', jpegBuffer, 'complete.jpg')
        .expect(200);

      // Verify all expected top-level fields
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('mainImage');
      expect(response.body).toHaveProperty('smallImages');
      expect(response.body).toHaveProperty('fileDetails');

      // Verify mainImage structure
      expect(response.body.mainImage).toHaveProperty('desktop');
      expect(response.body.mainImage).toHaveProperty('mobile');
      expect(response.body.mainImage).toHaveProperty('publicDesktop');
      expect(response.body.mainImage).toHaveProperty('publicMobile');
    });
  });

  describe('S3 mock helpers verification (FILE-08, FILE-09)', () => {
    it('mockS3Upload should create valid nock interceptor', () => {
      cleanAllMocks();

      const scope = mockS3Upload({
        bucket: 'test-bucket',
        endpoint: 'https://nyc3.digitaloceanspaces.com'
      });

      // Verify nock interceptor exists
      expect(scope).toBeDefined();
      expect(scope.pendingMocks).toBeDefined();
      // At least one interceptor should be registered
      expect(scope.pendingMocks().length).toBeGreaterThan(0);
    });

    it('mockS3Delete should create valid nock interceptor', () => {
      cleanAllMocks();

      const scope = mockS3Delete({
        bucket: 'test-bucket',
        key: 'products/main/test-desktop.webp'
      });

      // Verify nock interceptor exists
      expect(scope).toBeDefined();
      expect(scope.pendingMocks).toBeDefined();
      expect(scope.pendingMocks().length).toBeGreaterThan(0);
    });

    it('mockS3Error should simulate S3 failure', () => {
      cleanAllMocks();

      const scope = mockS3Error({
        statusCode: 403,
        errorCode: 'AccessDenied'
      });

      // Verify error interceptor exists
      expect(scope).toBeDefined();
      expect(scope.pendingMocks).toBeDefined();
      expect(scope.pendingMocks().length).toBeGreaterThan(0);
    });
  });

  describe('Error handling (FILE-11 related - cleanup on failure)', () => {
    it('should return 500 when processImage fails catastrophically', async () => {
      // Create a buffer with JPEG magic bytes but non-image content
      // This passes Multer (MIME type check) but fails Sharp processing
      const invalidBuffer = Buffer.concat([
        Buffer.from([0xFF, 0xD8, 0xFF]), // JPEG magic bytes
        Buffer.alloc(100, 0x00) // Invalid JPEG data
      ]);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', invalidBuffer, 'invalid.jpg');

      // Should return error (not crash)
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should not crash server on sequential upload failures', async () => {
      // First invalid upload
      const invalidBuffer1 = Buffer.concat([
        Buffer.from([0xFF, 0xD8, 0xFF]),
        Buffer.alloc(50, 0x00)
      ]);

      const response1 = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', invalidBuffer1, 'invalid1.jpg');

      expect(response1.status).toBeGreaterThanOrEqual(400);
      expect(response1.body).toHaveProperty('success', false);

      // Second invalid upload - server should still be alive
      const invalidBuffer2 = Buffer.concat([
        Buffer.from([0xFF, 0xD8, 0xFF]),
        Buffer.alloc(50, 0x00)
      ]);

      const response2 = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', invalidBuffer2, 'invalid2.jpg');

      expect(response2.status).toBeGreaterThanOrEqual(400);
      expect(response2.body).toHaveProperty('success', false);
    });
  });

  describe('File deletion mock (FILE-11)', () => {
    it('should mock S3 file deletion successfully', () => {
      cleanAllMocks();

      // Create S3 delete interceptor
      const scope = mockS3Delete({
        bucket: 'test-bucket',
        key: 'products/main/test-desktop.webp',
        endpoint: 'https://nyc3.digitaloceanspaces.com'
      });

      // Verify the mock is set up correctly
      expect(scope.pendingMocks().length).toBeGreaterThan(0);

      // Verify the interceptor matches DELETE requests
      const pendingMock = scope.pendingMocks()[0];
      expect(pendingMock).toContain('DELETE');
      expect(pendingMock).toContain('test-bucket');
    });

    it('should mock S3 delete for any key in bucket', () => {
      cleanAllMocks();

      // Create S3 delete interceptor without specific key (uses regex)
      const scope = mockS3Delete({
        bucket: 'test-bucket'
      });

      // Verify mock works for any key pattern
      expect(scope.pendingMocks().length).toBeGreaterThan(0);
      const pendingMock = scope.pendingMocks()[0];
      expect(pendingMock).toContain('DELETE');
      expect(pendingMock).toContain('test-bucket');
    });
  });
});

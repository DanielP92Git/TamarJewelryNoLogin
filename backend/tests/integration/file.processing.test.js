/**
 * Image processing integration tests for Sharp-based file upload pipeline.
 *
 * Tests the /upload endpoint's image processing behavior through HTTP boundary,
 * verifying Sharp converts formats to WebP, creates desktop/mobile variants,
 * handles corrupt images gracefully, and processes extreme dimensions.
 *
 * Coverage: FILE-05 (resize), FILE-06 (format conversion), FILE-07 (corrupt handling),
 *           FILE-10 (dimension handling)
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createAdmin } from '../helpers/factories.js';
import { createAuthToken } from '../helpers/authHelpers.js';
import { validateTestEnvironment } from '../helpers/envGuard.js';
import { disableNetConnect, cleanAllMocks, mockS3Upload } from '../helpers/mocks/index.js';
import {
  createTestJPEG,
  createTestPNG,
  createTestWebP,
  createCorruptImage
} from '../helpers/imageHelpers.js';

describe('Image Processing - Sharp integration', () => {
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

  describe('Format conversion to WebP (FILE-06)', () => {
    it('should convert JPEG to WebP output', async () => {
      const jpegBuffer = await createTestJPEG(800, 600);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', jpegBuffer, 'photo.jpg')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.mainImage).toBeDefined();
      expect(response.body.mainImage.desktop).toMatch(/\.webp$/);
      expect(response.body.mainImage.mobile).toMatch(/\.webp$/);
    });

    it('should convert PNG to WebP output', async () => {
      const pngBuffer = await createTestPNG(1000, 800);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', pngBuffer, 'graphic.png')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.mainImage.desktop).toMatch(/\.webp$/);
      expect(response.body.mainImage.mobile).toMatch(/\.webp$/);
    });

    it('should handle WebP input and produce WebP output', async () => {
      const webpBuffer = await createTestWebP(900, 700);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', webpBuffer, 'optimized.webp')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.mainImage.desktop).toMatch(/\.webp$/);
      expect(response.body.mainImage.mobile).toMatch(/\.webp$/);
    });
  });

  describe('Image resizing (FILE-05)', () => {
    it('should create desktop and mobile variants', async () => {
      // Upload large image - backend creates desktop (1200px) and mobile (600px)
      const largeBuffer = await createTestJPEG(2000, 1500);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', largeBuffer, 'large-photo.jpg')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.mainImage).toBeDefined();
      expect(response.body.mainImage.desktop).toBeTruthy();
      expect(response.body.mainImage.mobile).toBeTruthy();
    });

    it('should return desktop and mobile as distinct URLs', async () => {
      const imageBuffer = await createTestJPEG(1500, 1200);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', imageBuffer, 'test-image.jpg')
        .expect(200);

      const { desktop, mobile } = response.body.mainImage;

      // Verify desktop and mobile are different URLs
      expect(desktop).not.toBe(mobile);
      // Verify naming convention: -desktop.webp vs -mobile.webp
      expect(desktop).toMatch(/-desktop\.webp$/);
      expect(mobile).toMatch(/-mobile\.webp$/);
    });
  });

  describe('Corrupt image handling (FILE-07)', () => {
    it('should handle corrupt/truncated images without crashing', async () => {
      const corruptBuffer = await createCorruptImage();

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', corruptBuffer, 'corrupt.jpg');

      // Server should NOT crash (request completes)
      // Backend uses failOnError: false, so behavior varies:
      // - May return error (500) if Sharp can't process
      // - May return 200 if Sharp processes with best-effort
      // Either way, server stays alive
      expect(response.status).toBeDefined();

      if (response.status >= 400) {
        // Error response - expected for truly corrupt images
        expect(response.body).toHaveProperty('success', false);
      } else if (response.status === 200) {
        // Best-effort processing succeeded (failOnError: false)
        expect(response.body).toHaveProperty('success', true);
        // If successful, verify output exists
        expect(response.body.mainImage).toBeDefined();
      }
    });
  });

  describe('Dimension handling (FILE-10)', () => {
    it('should process very small images (1x1 pixel)', async () => {
      // Backend uses withoutEnlargement: true, so won't upscale
      const tinyBuffer = await createTestJPEG(1, 1);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', tinyBuffer, 'tiny.jpg')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.mainImage).toBeDefined();
      expect(response.body.mainImage.desktop).toBeTruthy();
      expect(response.body.mainImage.mobile).toBeTruthy();
    });

    it('should process very large dimension images', async () => {
      // Backend resizes down to 1200px max width
      const largeBuffer = await createTestJPEG(4000, 3000);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', largeBuffer, 'huge.jpg')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.mainImage).toBeDefined();
    });
  });

  describe('Multiple file upload', () => {
    it('should process main image and small images together', async () => {
      const mainBuffer = await createTestJPEG(1200, 900);
      const small1 = await createTestJPEG(400, 400);
      const small2 = await createTestJPEG(500, 500);

      const response = await request(app)
        .post('/upload')
        .set('auth-token', adminToken)
        .attach('mainImage', mainBuffer, 'main.jpg')
        .attach('smallImages', small1, 'small1.jpg')
        .attach('smallImages', small2, 'small2.jpg')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);

      // Verify main image processed
      expect(response.body.mainImage).toBeDefined();
      expect(response.body.mainImage.desktop).toMatch(/\.webp$/);
      expect(response.body.mainImage.mobile).toMatch(/\.webp$/);

      // Verify small images processed
      expect(response.body.smallImages).toBeDefined();
      expect(response.body.smallImages).toHaveLength(2);
      expect(response.body.smallImages[0].desktop).toMatch(/\.webp$/);
      expect(response.body.smallImages[0].mobile).toMatch(/\.webp$/);
      expect(response.body.smallImages[1].desktop).toMatch(/\.webp$/);
      expect(response.body.smallImages[1].mobile).toMatch(/\.webp$/);
    });
  });
});

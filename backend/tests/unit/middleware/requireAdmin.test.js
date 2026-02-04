import { describe, it, expect, vi } from 'vitest';
import { requireAdmin } from '../../../middleware/auth.js';

/**
 * Create mock Express request object
 */
function createMockReq(userDoc = null) {
  return {
    userDoc: userDoc,
    user: userDoc ? { id: userDoc._id, userType: userDoc.userType } : null
  };
}

/**
 * Create mock Express response object
 */
function createMockRes() {
  const res = {
    statusCode: null,
    jsonData: null,
    status: vi.fn(function(code) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function(data) {
      this.jsonData = data;
      return this;
    })
  };
  return res;
}

/**
 * Create mock next function
 */
function createMockNext() {
  return vi.fn();
}

describe('requireAdmin middleware', () => {
  it('should call next() for admin user', () => {
    const req = createMockReq({ _id: '123', userType: 'admin' });
    const res = createMockRes();
    const next = createMockNext();

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 403 for regular user', () => {
    const req = createMockReq({ _id: '456', userType: 'user' });
    const res = createMockRes();
    const next = createMockNext();

    requireAdmin(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.success).toBe(false);
    expect(res.jsonData.errors).toBe('Admin access required');
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 when req.userDoc is undefined', () => {
    const req = createMockReq(undefined);
    const res = createMockRes();
    const next = createMockNext();

    requireAdmin(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.success).toBe(false);
    expect(res.jsonData.errors).toBe('Admin access required');
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 when req.userDoc is null', () => {
    const req = createMockReq(null);
    const res = createMockRes();
    const next = createMockNext();

    requireAdmin(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.success).toBe(false);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 for userType: "Admin" (case sensitive)', () => {
    const req = createMockReq({ _id: '789', userType: 'Admin' });
    const res = createMockRes();
    const next = createMockNext();

    requireAdmin(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.success).toBe(false);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 for userType: "administrator"', () => {
    const req = createMockReq({ _id: '101', userType: 'administrator' });
    const res = createMockRes();
    const next = createMockNext();

    requireAdmin(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.success).toBe(false);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 for empty userType', () => {
    const req = createMockReq({ _id: '102', userType: '' });
    const res = createMockRes();
    const next = createMockNext();

    requireAdmin(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.jsonData.success).toBe(false);
    expect(next).not.toHaveBeenCalled();
  });

  it('should include success: false in 403 response', () => {
    const req = createMockReq({ _id: '103', userType: 'user' });
    const res = createMockRes();
    const next = createMockNext();

    requireAdmin(req, res, next);

    expect(res.jsonData).toEqual({
      success: false,
      errors: 'Admin access required'
    });
  });

  it('should not modify request object for non-admin', () => {
    const req = createMockReq({ _id: '104', userType: 'user' });
    const res = createMockRes();
    const next = createMockNext();

    const originalUserDoc = req.userDoc;
    requireAdmin(req, res, next);

    expect(req.userDoc).toBe(originalUserDoc);
  });

  it('should return 403 for userDoc with missing userType property', () => {
    const req = createMockReq({ _id: '105' }); // No userType
    const res = createMockRes();
    const next = createMockNext();

    requireAdmin(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});

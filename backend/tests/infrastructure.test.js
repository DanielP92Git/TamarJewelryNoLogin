/**
 * Infrastructure smoke tests
 *
 * Verifies that test infrastructure works correctly:
 * - MongoDB connection is established
 * - Using in-memory server (not production)
 * - CRUD operations work
 */

import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';

describe('Test Infrastructure', () => {
  it('should connect to in-memory MongoDB', () => {
    // Connection state: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    expect(mongoose.connection.readyState).toBe(1);
  });

  it('should use mongodb-memory-server (not production)', () => {
    const uri = mongoose.connection.host;
    // Memory server uses 127.0.0.1, not production hostnames
    expect(uri).toBe('127.0.0.1');
  });

  it('should be able to create and query a test collection', async () => {
    // Create a test model
    const TestModel = mongoose.model('Test', new mongoose.Schema({ name: String }));

    // Create a document
    await TestModel.create({ name: 'test-item' });

    // Query the document
    const found = await TestModel.findOne({ name: 'test-item' });

    // Verify it was found
    expect(found).toBeDefined();
    expect(found.name).toBe('test-item');
  });
});

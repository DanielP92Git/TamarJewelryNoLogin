/**
 * Global test setup for Vitest
 *
 * This file runs before all tests to:
 * 1. Start mongodb-memory-server (in-memory MongoDB)
 * 2. Connect mongoose to the in-memory database
 * 3. Ensure tests are isolated from production database
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll } from 'vitest';

let mongoServer;

/**
 * Start mongodb-memory-server and connect mongoose before all tests
 */
beforeAll(async () => {
  // Suppress mongoose deprecation warnings
  mongoose.set('strictQuery', true);

  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Connect mongoose to in-memory server
  await mongoose.connect(uri);

  console.log('✓ Test database connected (mongodb-memory-server)');
});

/**
 * Disconnect mongoose and stop mongodb-memory-server after all tests
 */
afterAll(async () => {
  // Disconnect mongoose
  await mongoose.disconnect();

  // Stop in-memory server
  await mongoServer.stop();

  console.log('✓ Test database disconnected');
});

/**
 * Database helper functions for tests
 *
 * Provides utilities for:
 * - Manual database connection control
 * - Database cleanup between tests
 * - URI retrieval for debugging
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;

/**
 * Start mongodb-memory-server and connect mongoose
 *
 * Use this for manual control in specific tests.
 * Most tests should rely on global setup in tests/setup.js
 *
 * @returns {Promise<string>} The MongoDB URI
 */
export async function connect() {
  // Suppress mongoose deprecation warnings
  mongoose.set('strictQuery', true);

  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Connect mongoose to in-memory server
  await mongoose.connect(uri);

  return uri;
}

/**
 * Disconnect mongoose and stop mongodb-memory-server
 *
 * Use this to cleanup after manual connection.
 * Most tests should rely on global teardown in tests/setup.js
 *
 * @returns {Promise<void>}
 */
export async function disconnect() {
  // Disconnect mongoose
  await mongoose.disconnect();

  // Stop in-memory server
  if (mongoServer) {
    await mongoServer.stop();
  }
}

/**
 * Clear all collections in the database
 *
 * Use this between tests to ensure clean state.
 * Faster than disconnect/reconnect.
 *
 * @returns {Promise<void>}
 */
export async function clearDatabase() {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
}

/**
 * Get the current mongodb-memory-server URI
 *
 * Useful for debugging connection issues.
 *
 * @returns {string|null} The MongoDB URI, or null if not connected
 */
export function getUri() {
  return mongoServer ? mongoServer.getUri() : null;
}

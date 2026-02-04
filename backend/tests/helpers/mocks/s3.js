/**
 * S3/DigitalOcean Spaces mock patterns.
 * Mocks AWS SDK S3 operations for file upload/delete without real storage.
 */
import nock from 'nock';

// Default Spaces endpoint format
const DEFAULT_SPACES_ENDPOINT = 'https://nyc3.digitaloceanspaces.com';

/**
 * Mock S3 putObject (upload) operation.
 * @param {Object} options - Mock options
 */
export function mockS3Upload({
  bucket = 'test-bucket',
  endpoint = DEFAULT_SPACES_ENDPOINT,
  key = null
} = {}) {
  const scope = nock(endpoint);

  if (key) {
    // Mock specific key
    scope.put(`/${bucket}/${key}`).reply(200, '', {
      'x-amz-request-id': 'test-request-id',
      'ETag': '"test-etag-123"'
    });
  } else {
    // Mock any key in bucket
    scope.put(new RegExp(`/${bucket}/.*`)).reply(200, '', {
      'x-amz-request-id': 'test-request-id',
      'ETag': '"test-etag-123"'
    });
  }

  return scope;
}

/**
 * Mock S3 deleteObject operation.
 * @param {Object} options - Mock options
 */
export function mockS3Delete({
  bucket = 'test-bucket',
  endpoint = DEFAULT_SPACES_ENDPOINT,
  key = null
} = {}) {
  const scope = nock(endpoint);

  if (key) {
    scope.delete(`/${bucket}/${key}`).reply(204);
  } else {
    scope.delete(new RegExp(`/${bucket}/.*`)).reply(204);
  }

  return scope;
}

/**
 * Mock S3 upload error.
 * @param {number} statusCode - HTTP status code
 * @param {string} errorCode - S3 error code
 */
export function mockS3Error({
  bucket = 'test-bucket',
  endpoint = DEFAULT_SPACES_ENDPOINT,
  statusCode = 403,
  errorCode = 'AccessDenied'
} = {}) {
  return nock(endpoint)
    .put(new RegExp(`/${bucket}/.*`))
    .reply(statusCode, `<?xml version="1.0" encoding="UTF-8"?>
      <Error>
        <Code>${errorCode}</Code>
        <Message>Access Denied</Message>
        <RequestId>test-request-id</RequestId>
      </Error>
    `, {
      'Content-Type': 'application/xml'
    });
}

/**
 * Mock S3 getObject operation (for downloads/reads).
 * @param {Object} options - Mock options
 */
export function mockS3GetObject({
  bucket = 'test-bucket',
  endpoint = DEFAULT_SPACES_ENDPOINT,
  key,
  body = Buffer.from('test-file-content')
} = {}) {
  return nock(endpoint)
    .get(`/${bucket}/${key}`)
    .reply(200, body, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': body.length
    });
}

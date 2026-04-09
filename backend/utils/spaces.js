/**
 * DigitalOcean Spaces (S3-compatible) client and upload helper.
 */
const fs = require('fs');
const AWS = require('aws-sdk');
const { normalizeBaseUrl } = require('./urlHelpers');

const isProdEnv = process.env.NODE_ENV === 'production';
const SPACES_BUCKET = process.env.SPACES_BUCKET || null;
const SPACES_REGION = process.env.SPACES_REGION || null;
const SPACES_ENDPOINT = process.env.SPACES_ENDPOINT || null;
const SPACES_CDN_BASE_URL = process.env.SPACES_CDN_BASE_URL || null;

function getSpacesPublicBaseUrl() {
  const cdn = normalizeBaseUrl(SPACES_CDN_BASE_URL);
  if (cdn) return cdn;

  if (SPACES_BUCKET && SPACES_REGION) {
    return `https://${SPACES_BUCKET}.${SPACES_REGION}.digitaloceanspaces.com`;
  }

  const ep = normalizeBaseUrl(SPACES_ENDPOINT);
  if (ep && SPACES_BUCKET) return `${ep}/${SPACES_BUCKET}`;
  return null;
}

const spacesPublicBaseUrl = getSpacesPublicBaseUrl();

const s3 =
  SPACES_ENDPOINT && process.env.SPACES_KEY && process.env.SPACES_SECRET
    ? new AWS.S3({
        endpoint: new AWS.Endpoint(SPACES_ENDPOINT),
        accessKeyId: process.env.SPACES_KEY,
        secretAccessKey: process.env.SPACES_SECRET,
        region: SPACES_REGION || undefined,
      })
    : null;

async function uploadFileToSpaces(key, filePath, contentType) {
  if (!s3 || !SPACES_BUCKET || !spacesPublicBaseUrl) {
    if (!isProdEnv) return null;
    const err = new Error('SPACES_NOT_CONFIGURED');
    err.code = 'SPACES_NOT_CONFIGURED';
    err.statusCode = 500;
    throw err;
  }

  const body = fs.createReadStream(filePath);

  await s3
    .upload({
      Bucket: SPACES_BUCKET,
      Key: key,
      Body: body,
      ACL: 'public-read',
      ContentType: contentType || 'application/octet-stream',
    })
    .promise();

  return `${spacesPublicBaseUrl}/${key}`;
}

module.exports = {
  s3,
  SPACES_BUCKET,
  spacesPublicBaseUrl,
  uploadFileToSpaces,
};

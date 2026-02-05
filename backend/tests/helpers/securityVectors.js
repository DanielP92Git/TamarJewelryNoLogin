/**
 * Security Test Vectors
 *
 * OWASP-based attack payloads for security testing.
 * Sources:
 * - OWASP XSS Filter Evasion Cheat Sheet
 * - OWASP NoSQL Injection Testing Guide
 * - PortSwigger XSS Cheat Sheet
 */

// XSS vectors from OWASP XSS Filter Evasion Cheat Sheet
export const xssVectors = [
  // Basic script injection
  '<script>alert("xss")</script>',
  '<script>alert(String.fromCharCode(88,83,83))</script>',

  // Event handler injection
  '<img src=x onerror=alert(1)>',
  '<svg onload=alert(1)>',
  '<body onload=alert(1)>',

  // Attribute injection
  '"><script>alert(1)</script>',
  "' onclick='alert(1)",
  '" onfocus="alert(1)" autofocus="',

  // URL-based XSS
  "javascript:alert('XSS')",
  'javascript:/*--></title></style></textarea></script></xmp><svg/onload=\'+/"/+/onmouseover=1/+/[*/[]/+alert(1)//\'>',

  // Template injection (Angular/Vue style)
  '{{constructor.constructor("alert(1)")()}}',
  '${alert(1)}',

  // Data URL
  '<a href="data:text/html,<script>alert(1)</script>">click</a>',

  // Unicode/encoding evasion
  '<script>alert(1)</script>',  // Using \u003c \u003e
  '%3Cscript%3Ealert(1)%3C/script%3E',  // URL encoded
];

// NoSQL injection vectors for MongoDB
export const noSqlVectors = [
  // Operator injection (bypass authentication)
  { field: 'email', value: { $gt: '' } },
  { field: 'email', value: { $ne: null } },
  { field: 'email', value: { $ne: '' } },
  { field: 'password', value: { $ne: '' } },

  // Regex injection
  { field: 'email', value: { $regex: '.*' } },
  { field: 'email', value: { $regex: '^admin' } },

  // $where clause injection (if MongoDB allows it)
  { field: '$where', value: '1==1' },
  { field: '$where', value: 'this.password.length > 0' },

  // Array operators
  { field: 'email', value: { $in: ['admin@example.com'] } },
  { field: 'email', value: { $nin: [''] } },
];

// Valid Unicode inputs that should NOT be blocked
export const validUnicodeInputs = [
  'תכשיטים יפים',              // Hebrew product name
  'Sarah (שרה)',                // Mixed Hebrew/English
  'Tamar Kfir Jewelry',         // English
  'Émilie Müller',              // European diacritics
  '日本語テスト',               // Japanese
  'Test 123 @#$%',              // Common special chars
];

// Dangerous Unicode sequences that SHOULD be blocked/sanitized
export const dangerousUnicodeInputs = [
  '\u0000malicious',            // Null byte injection
  'name\u202Eevil',             // RTL override character (text direction manipulation)
  '\u200Bhidden',               // Zero-width space (invisible text)
  'a'.repeat(10001),            // Excessive length (DoS)
];

export default {
  xssVectors,
  noSqlVectors,
  validUnicodeInputs,
  dangerousUnicodeInputs,
};

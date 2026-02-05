# Phase 14: File Upload & Image Processing Tests - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Test file upload validation, Sharp image processing, and DigitalOcean Spaces integration without touching production storage. Verify existing infrastructure behavior, not build new upload features.

</domain>

<decisions>
## Implementation Decisions

### Test File Strategy
- **Sourcing approach:** Claude's discretion - choose between real sample images or generated minimal files
- **Format coverage:** JPEG, PNG, WebP (all three allowed formats per FILE-01)
- **Size coverage:** Files just under and just over size limit (boundary testing)
- **Corrupt files:** Include truncated/invalid image data to test Sharp error handling per FILE-08

### Mock Boundaries
- **Sharp processing:** Real Sharp processing (not mocked) - validates actual behavior and catches Sharp errors
- **S3 upload mocking:** HTTP level with nock (consistent with Phase 10 PayPal/Stripe infrastructure)
- **S3 network enforcement:** Use nock.disableNetConnect() for S3 domains to guarantee no production storage access
- **Mock URLs:** Claude's discretion - choose between realistic test URLs or minimal stubs based on assertion needs

### Validation Coverage
- **MIME type testing:**
  - Valid: JPEG, PNG, WebP acceptance
  - Invalid: GIF, BMP, SVG, PDF rejection
  - MIME spoofing: mismatched extension and MIME type (file.jpg that's really PNG)
- **Size limit testing:**
  - Just over limit (1 byte over max)
  - Massively over limit (10x or 100x over max)
  - Zero size rejection (0 byte files)
- **Dimension constraints:** Test min/max dimension limits (reject 1x1 or 10000x10000 if backend has constraints)
- **Corrupt file handling:** Verify Sharp doesn't crash on corrupt images and returns proper error messages (FILE-08)

### Error Scenarios
- **S3 upload failures:**
  - Network timeouts (nock delayConnection)
  - S3 service errors (500/503 responses)
  - Authentication errors (403 Forbidden)
- **Sharp processing failures:**
  - Corrupt image handling (no server crash)
  - Unsupported format edge cases (exotic JPEG variants)
  - Memory exhaustion (oversized images)
- **Rollback/cleanup:** Verify failed uploads don't leave orphaned files in S3 or database
- **Error response format:** Validate HTTP status codes (400, 413, 500) and error messages match existing patterns from Phases 11-13

### Claude's Discretion
- Test file sourcing method (real samples vs generated)
- Mock URL format (realistic vs minimal)
- Exact test file sizes and dimensions
- Test organization (unit vs integration split)

</decisions>

<specifics>
## Specific Ideas

- Follow Phase 10 infrastructure patterns (nock HTTP mocking, environment safety guards)
- Consistent with Phases 11-13 test patterns (supertest integration tests, error assertions)
- Sharp processing runs for real - validates actual resize/conversion behavior
- S3 completely mocked - zero production storage risk

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-file-upload--image-processing-tests*
*Context gathered: 2026-02-05*

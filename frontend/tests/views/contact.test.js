/**
 * Contact Form View Tests (PAGE-13)
 *
 * Tests contact form validation and anti-spam measures:
 * - PAGE-13: Contact form validates required fields
 * - Anti-spam: Honeypot field detection (silently blocks)
 * - Anti-spam: Timing validation (blocks submissions under 3 seconds)
 * - Content validation: URL limits, name format, message length
 * - Spam pattern detection in messages
 * - Email format validation
 * - Successful submission with form clearing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '../helpers/dom.js';

// Mock emailjs module
vi.mock('@emailjs/browser', () => ({
  default: {
    send: vi.fn().mockResolvedValue({})
  },
  EmailJSResponseStatus: class {}
}));

describe('Contact Form View', () => {
  let contactMeView;
  let emailjs;
  let alertMock;

  beforeEach(async () => {
    // Clear all mocks first
    vi.clearAllMocks();

    // Mock window.alert
    alertMock = vi.fn();
    global.alert = alertMock;

    // Render DOM fixture required by ContactMeView BEFORE import
    render(`
      <header></header>
      <div class="menu"></div>
      <div data-purpose="header-utilities"></div>
      <div class="footer"></div>
      <div class="contact-form">
        <input type="text" id="name" name="name" required />
        <input type="text" id="lastname" name="lastname" required />
        <input type="email" id="contact-email" name="email" required />
        <textarea id="message" name="message" required></textarea>
        <div style="position: absolute; left: -9999px;" aria-hidden="true">
          <input type="text" name="website" id="website" tabindex="-1" autocomplete="off" />
        </div>
        <input type="hidden" name="form_loaded_at" id="formLoadedAt" value="${Date.now()}" />
        <button type="submit" id="submit">Send Message</button>
      </div>
      <div class="contact-title">Get in Touch</div>
      <div class="contact-subtitle">Have a question?</div>
    `);

    // Reset language to default
    localStorage.setItem('language', 'eng');

    // Reset modules to get fresh emailjs mock
    vi.resetModules();

    // Dynamically import ContactMeView after DOM is ready (singleton pattern)
    const contactModule = await import('../../js/Views/contactMeView.js');
    contactMeView = contactModule.default;

    // Import emailjs mock
    const emailjsModule = await import('@emailjs/browser');
    emailjs = emailjsModule.default;
  });

  afterEach(() => {
    // Clear mocks
    vi.restoreAllMocks();
    delete global.alert;

    // Clear emailjs.send mock calls
    if (emailjs && emailjs.send) {
      emailjs.send.mockClear();
    }
  });

  describe('Required Field Validation (PAGE-13)', () => {
    it('should reject submission when name is invalid (content validation)', async () => {
      // Fill form with invalid name (numbers only)
      document.getElementById('name').value = '12345';
      document.getElementById('lastname').value = 'Smith';
      document.getElementById('contact-email').value = 'test@example.com';
      document.getElementById('message').value = 'This is a valid message with enough content to pass validation.';

      // Set form load time to 5 seconds ago (pass timing check)
      contactMeView._formLoadTime = Date.now() - 5000;

      // Call sendEmail
      await contactMeView.sendEmail();

      // Verify alert was shown with error message about invalid name
      expect(alertMock).toHaveBeenCalled();
      const alertMessage = alertMock.mock.calls[0][0];
      expect(alertMessage).toMatch(/valid name|check your input/i);

      // Verify emailjs.send was NOT called
      expect(emailjs.send).not.toHaveBeenCalled();
    });

    it('should reject submission when email is empty or invalid', async () => {
      // Fill form with missing email
      document.getElementById('name').value = 'John';
      document.getElementById('lastname').value = 'Smith';
      document.getElementById('contact-email').value = ''; // Empty email
      document.getElementById('message').value = 'This is a valid message with enough content.';

      // Set form load time to 5 seconds ago
      contactMeView._formLoadTime = Date.now() - 5000;

      // Call sendEmail
      await contactMeView.sendEmail();

      // Verify alert was shown
      expect(alertMock).toHaveBeenCalled();

      // Verify emailjs.send was NOT called
      expect(emailjs.send).not.toHaveBeenCalled();
    });

    it('should reject submission when message is empty', async () => {
      // Fill form with empty message
      document.getElementById('name').value = 'John';
      document.getElementById('lastname').value = 'Smith';
      document.getElementById('contact-email').value = 'test@example.com';
      document.getElementById('message').value = ''; // Empty message

      // Set form load time to 5 seconds ago
      contactMeView._formLoadTime = Date.now() - 5000;

      // Call sendEmail
      await contactMeView.sendEmail();

      // Verify alert was shown with error (will be caught by message_too_short)
      expect(alertMock).toHaveBeenCalled();
      expect(alertMock.mock.calls[0][0]).toContain('detailed message');

      // Verify emailjs.send was NOT called
      expect(emailjs.send).not.toHaveBeenCalled();
    });

    it('should accept submission when all required fields are valid', async () => {
      // Fill form with all valid data
      document.getElementById('name').value = 'John';
      document.getElementById('lastname').value = 'Smith';
      document.getElementById('contact-email').value = 'john.smith@example.com';
      document.getElementById('message').value = 'This is a valid message with enough content to pass all validation checks. It has no spam keywords and is properly formatted.';

      // Clear honeypot
      document.getElementById('website').value = '';

      // Set form load time to 5 seconds ago (pass timing check)
      contactMeView._formLoadTime = Date.now() - 5000;

      // Mock emailjs.send to resolve successfully
      emailjs.send.mockResolvedValue({});

      // Call sendEmail
      await contactMeView.sendEmail();

      // Verify success alert was shown
      expect(alertMock).toHaveBeenCalled();
      expect(alertMock.mock.calls[0][0]).toBe('Message Sent Successfully!');

      // Verify emailjs.send WAS called
      expect(emailjs.send).toHaveBeenCalled();
    });
  });

  describe('Anti-Spam: Honeypot (PAGE-13)', () => {
    it('should silently block submission when honeypot field is filled', async () => {
      // Fill form with valid data
      document.getElementById('name').value = 'John';
      document.getElementById('lastname').value = 'Smith';
      document.getElementById('contact-email').value = 'test@example.com';
      document.getElementById('message').value = 'This is a valid message.';

      // Fill honeypot field (bots do this)
      document.getElementById('website').value = 'http://spam-site.com';

      // Set form load time to 5 seconds ago
      contactMeView._formLoadTime = Date.now() - 5000;

      // Call sendEmail
      await contactMeView.sendEmail();

      // Verify fake success alert was shown (to confuse bots)
      expect(alertMock).toHaveBeenCalled();
      expect(alertMock.mock.calls[0][0]).toBe('Message Sent Successfully!');

      // Verify emailjs.send was NOT called
      expect(emailjs.send).not.toHaveBeenCalled();

      // Verify form was cleared (fake success behavior)
      expect(document.getElementById('name').value).toBe('');
      expect(document.getElementById('lastname').value).toBe('');
    });

    it('should allow submission when honeypot field is empty', async () => {
      // Fill form with valid data
      document.getElementById('name').value = 'John';
      document.getElementById('lastname').value = 'Smith';
      document.getElementById('contact-email').value = 'test@example.com';
      document.getElementById('message').value = 'This is a valid message with enough content to pass validation.';

      // Leave honeypot empty (humans don't see it)
      document.getElementById('website').value = '';

      // Set form load time to 5 seconds ago
      contactMeView._formLoadTime = Date.now() - 5000;

      // Mock emailjs.send
      emailjs.send.mockResolvedValue({});

      // Call sendEmail
      await contactMeView.sendEmail();

      // Verify real success (not blocked)
      expect(emailjs.send).toHaveBeenCalled();
    });
  });

  describe('Anti-Spam: Timing (PAGE-13)', () => {
    it('should block submission when form filled too quickly (under 3 seconds)', async () => {
      // Fill form with valid data
      document.getElementById('name').value = 'John';
      document.getElementById('lastname').value = 'Smith';
      document.getElementById('contact-email').value = 'test@example.com';
      document.getElementById('message').value = 'This is a valid message with enough content.';

      // Clear honeypot
      document.getElementById('website').value = '';

      // Set form load time to NOW (just loaded - too fast)
      contactMeView._formLoadTime = Date.now();

      // Call sendEmail
      await contactMeView.sendEmail();

      // Verify fake success alert (silent block)
      expect(alertMock).toHaveBeenCalled();
      expect(alertMock.mock.calls[0][0]).toBe('Message Sent Successfully!');

      // Verify emailjs.send was NOT called
      expect(emailjs.send).not.toHaveBeenCalled();
    });

    it('should allow submission when form filled after 3+ seconds', async () => {
      // Fill form with valid data
      document.getElementById('name').value = 'John';
      document.getElementById('lastname').value = 'Smith';
      document.getElementById('contact-email').value = 'test@example.com';
      document.getElementById('message').value = 'This is a valid message with enough content to pass validation.';

      // Clear honeypot
      document.getElementById('website').value = '';

      // Set form load time to 5 seconds ago (legitimate fill time)
      contactMeView._formLoadTime = Date.now() - 5000;

      // Mock emailjs.send
      emailjs.send.mockResolvedValue({});

      // Call sendEmail
      await contactMeView.sendEmail();

      // Verify real success (not blocked by timing)
      expect(emailjs.send).toHaveBeenCalled();
    });
  });

  describe('Content Validation (PAGE-13)', () => {
    it('should reject message with too many URLs', async () => {
      // Fill form with message containing 3+ URLs
      document.getElementById('name').value = 'John';
      document.getElementById('lastname').value = 'Smith';
      document.getElementById('contact-email').value = 'test@example.com';
      document.getElementById('message').value = 'Check out https://site1.com and https://site2.com also https://site3.com for more info.';

      // Clear honeypot
      document.getElementById('website').value = '';

      // Set form load time to 5 seconds ago
      contactMeView._formLoadTime = Date.now() - 5000;

      // Call sendEmail
      await contactMeView.sendEmail();

      // Verify rejection alert
      expect(alertMock).toHaveBeenCalled();
      expect(alertMock.mock.calls[0][0]).toContain('check your input');

      // Verify emailjs.send was NOT called
      expect(emailjs.send).not.toHaveBeenCalled();
    });

    it('should reject names with invalid characters (numbers only)', async () => {
      // Fill form with invalid name
      document.getElementById('name').value = '12345';
      document.getElementById('lastname').value = '67890';
      document.getElementById('contact-email').value = 'test@example.com';
      document.getElementById('message').value = 'This is a valid message with enough content.';

      // Clear honeypot
      document.getElementById('website').value = '';

      // Set form load time to 5 seconds ago
      contactMeView._formLoadTime = Date.now() - 5000;

      // Call sendEmail
      await contactMeView.sendEmail();

      // Verify rejection with specific error
      expect(alertMock).toHaveBeenCalled();
      const alertMessage = alertMock.mock.calls[0][0];
      expect(alertMessage).toMatch(/valid name|check your input/i);

      // Verify emailjs.send was NOT called
      expect(emailjs.send).not.toHaveBeenCalled();
    });

    it('should reject message that is too short', async () => {
      // Fill form with very short message
      document.getElementById('name').value = 'John';
      document.getElementById('lastname').value = 'Smith';
      document.getElementById('contact-email').value = 'test@example.com';
      document.getElementById('message').value = 'hi'; // Too short

      // Clear honeypot
      document.getElementById('website').value = '';

      // Set form load time to 5 seconds ago
      contactMeView._formLoadTime = Date.now() - 5000;

      // Call sendEmail
      await contactMeView.sendEmail();

      // Verify rejection with specific error
      expect(alertMock).toHaveBeenCalled();
      expect(alertMock.mock.calls[0][0]).toContain('detailed message');

      // Verify emailjs.send was NOT called
      expect(emailjs.send).not.toHaveBeenCalled();
    });

    it('should reject spam keywords in message', async () => {
      // Fill form with spam keywords
      document.getElementById('name').value = 'John';
      document.getElementById('lastname').value = 'Smith';
      document.getElementById('contact-email').value = 'test@example.com';
      document.getElementById('message').value = 'Click here to buy now and get free money from our casino!';

      // Clear honeypot
      document.getElementById('website').value = '';

      // Set form load time to 5 seconds ago
      contactMeView._formLoadTime = Date.now() - 5000;

      // Call sendEmail
      await contactMeView.sendEmail();

      // Verify rejection
      expect(alertMock).toHaveBeenCalled();
      expect(alertMock.mock.calls[0][0]).toContain('check your input');

      // Verify emailjs.send was NOT called
      expect(emailjs.send).not.toHaveBeenCalled();
    });

    it('should reject invalid email format', async () => {
      // Fill form with invalid email
      document.getElementById('name').value = 'John';
      document.getElementById('lastname').value = 'Smith';
      document.getElementById('contact-email').value = 'notanemail'; // Invalid format
      document.getElementById('message').value = 'This is a valid message with enough content.';

      // Clear honeypot
      document.getElementById('website').value = '';

      // Set form load time to 5 seconds ago
      contactMeView._formLoadTime = Date.now() - 5000;

      // Call sendEmail
      await contactMeView.sendEmail();

      // Verify rejection with specific error
      expect(alertMock).toHaveBeenCalled();
      expect(alertMock.mock.calls[0][0]).toContain('valid email');

      // Verify emailjs.send was NOT called
      expect(emailjs.send).not.toHaveBeenCalled();
    });
  });

  describe('Successful Submission (PAGE-13)', () => {
    it('should call emailjs.send with correct parameters', async () => {
      const testData = {
        name: 'John',
        lastname: 'Smith',
        email: 'john.smith@example.com',
        message: 'This is a legitimate inquiry about your products. I would like to know more about custom jewelry options.'
      };

      // Fill form
      document.getElementById('name').value = testData.name;
      document.getElementById('lastname').value = testData.lastname;
      document.getElementById('contact-email').value = testData.email;
      document.getElementById('message').value = testData.message;

      // Clear honeypot
      document.getElementById('website').value = '';

      // Set form load time to 5 seconds ago
      contactMeView._formLoadTime = Date.now() - 5000;

      // Mock emailjs.send
      emailjs.send.mockResolvedValue({});

      // Call sendEmail
      await contactMeView.sendEmail();

      // Verify emailjs.send was called with correct parameters
      expect(emailjs.send).toHaveBeenCalledWith(
        'service_t4qcx4j',
        'template_kwezl8a',
        expect.objectContaining({
          name: testData.name,
          lastname: testData.lastname,
          email: testData.email,
          message: testData.message
        }),
        expect.objectContaining({
          publicKey: 'dyz9UzngEOQUHFgv3'
        })
      );
    });

    it('should clear form fields after successful submission', async () => {
      // Fill form
      document.getElementById('name').value = 'John';
      document.getElementById('lastname').value = 'Smith';
      document.getElementById('contact-email').value = 'test@example.com';
      document.getElementById('message').value = 'This is a valid message with enough content to pass all validation.';
      document.getElementById('website').value = '';

      // Set form load time to 5 seconds ago
      contactMeView._formLoadTime = Date.now() - 5000;

      // Mock emailjs.send
      emailjs.send.mockResolvedValue({});

      // Call sendEmail
      await contactMeView.sendEmail();

      // Verify all fields are cleared
      expect(document.getElementById('name').value).toBe('');
      expect(document.getElementById('lastname').value).toBe('');
      expect(document.getElementById('contact-email').value).toBe('');
      expect(document.getElementById('message').value).toBe('');
      expect(document.getElementById('website').value).toBe('');
    });
  });
});

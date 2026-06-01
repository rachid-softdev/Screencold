import { describe, it, expect } from 'vitest';
import { 
  registerSchema, 
  loginSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema,
  changePasswordSchema,
  contactFormSchema,
  checkPasswordStrength
} from './user';

describe('user validators', () => {
  describe('registerSchema', () => {
    it('should validate valid registration data', () => {
      const validData = {
        email: 'john@example.com',
        password: 'Password123!',
        name: 'John Doe',
        acceptTerms: true,
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept valid name with special chars', () => {
      const validData = {
        email: 'john@example.com',
        password: 'Password123!',
        name: "Jean-Pierre O'Brien-Smith",
        acceptTerms: true,
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalidData = {
        email: 'john@example.com',
        password: 'Password123!',
        name: '',
        acceptTerms: true,
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('name'))).toBe(true);
      }
    });

    it('should reject name too long (>100 chars)', () => {
      const invalidData = {
        email: 'john@example.com',
        password: 'Password123!',
        name: 'a'.repeat(101),
        acceptTerms: true,
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'Password123!',
        name: 'John',
        acceptTerms: true,
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('email'))).toBe(true);
      }
    });

    it('should reject short password (<8 chars)', () => {
      const invalidData = {
        email: 'john@example.com',
        password: 'short',
        name: 'John',
        acceptTerms: true,
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase', () => {
      const invalidData = {
        email: 'john@example.com',
        password: 'password123!',
        name: 'John',
        acceptTerms: true,
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('password'))).toBe(true);
      }
    });

    it('should reject password without number', () => {
      const invalidData = {
        email: 'john@example.com',
        password: 'Password!',
        name: 'John',
        acceptTerms: true,
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject password without special char', () => {
      const invalidData = {
        email: 'john@example.com',
        password: 'Password123',
        name: 'John',
        acceptTerms: true,
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept valid password with all requirements', () => {
      const validData = {
        email: 'john@example.com',
        password: 'Password123!',
        name: 'John',
        acceptTerms: true,
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject if acceptTerms is false', () => {
      const invalidData = {
        email: 'john@example.com',
        password: 'Password123!',
        name: 'John',
        acceptTerms: false,
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept marketing checkbox optional', () => {
      const validData = {
        email: 'john@example.com',
        password: 'Password123!',
        name: 'John',
        acceptTerms: true,
        acceptMarketing: true,
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept international characters in name', () => {
      const validData = {
        email: 'john@example.com',
        password: 'Password123!',
        name: 'José García',
        acceptTerms: true,
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should lowercase email', () => {
      const validData = {
        email: 'JOHN@EXAMPLE.COM',
        password: 'Password123!',
        name: 'John',
        acceptTerms: true,
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('john@example.com');
      }
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const validData = {
        email: 'john@example.com',
        password: 'password123',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty email', () => {
      const invalidData = {
        email: '',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const invalidData = {
        email: 'john@example.com',
        password: '',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept optional rememberMe', () => {
      const validData = {
        email: 'john@example.com',
        password: 'password123',
        rememberMe: true,
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('forgotPasswordSchema', () => {
    it('should validate email only', () => {
      const validData = {
        email: 'john@example.com',
      };

      const result = forgotPasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid',
      };

      const result = forgotPasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('should validate valid reset data', () => {
      const validData = {
        token: 'abc123def456',
        password: 'Newpassword123!',
      };

      const result = resetPasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty token', () => {
      const invalidData = {
        token: '',
        password: 'Password123!',
      };

      const result = resetPasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const invalidData = {
        token: 'validtoken',
        password: 'short',
      };

      const result = resetPasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('should validate valid change password data', () => {
      const validData = {
        currentPassword: 'Oldpassword123!',
        newPassword: 'Newpassword123!',
      };

      const result = changePasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject if new password same as current', () => {
      const invalidData = {
        currentPassword: 'Samepassword123!',
        newPassword: 'Samepassword123!',
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty current password', () => {
      const invalidData = {
        currentPassword: '',
        newPassword: 'Newpassword123!',
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('contactFormSchema', () => {
    it('should validate valid contact form', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Question about pricing',
        message: 'I would like to know more about your pricing plans for agencies.',
      };

      const result = contactFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject short subject', () => {
      const invalidData = {
        name: 'John',
        email: 'john@example.com',
        subject: 'Hi',
        message: 'This is a longer message that meets the minimum length requirement.',
      };

      const result = contactFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject short message', () => {
      const invalidData = {
        name: 'John',
        email: 'john@example.com',
        subject: 'Valid subject here',
        message: 'Short',
      };

      const result = contactFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('checkPasswordStrength', () => {
    it('should return low score for weak password', () => {
      const result = checkPasswordStrength('abc');
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should return higher score for strong password', () => {
      const result = checkPasswordStrength('MyPassword123!');
      expect(result.score).toBeGreaterThan(3);
      expect(result.feedback.length).toBe(0);
    });

    it('should penalize repeated characters', () => {
      const result = checkPasswordStrength('Password111!');
      // The function checks for (.)\1{2,} which is 3+ repeated
      // Password111 has 3 '1's in a row so it gets penalized
      expect(result.score).toBeLessThanOrEqual(5);
    });

    it('should give bonus for 12+ chars', () => {
      const short = checkPasswordStrength('Pass123!');
      const long = checkPasswordStrength('Password123!');
      
      expect(long.score).toBeGreaterThanOrEqual(short.score);
    });
  });
});
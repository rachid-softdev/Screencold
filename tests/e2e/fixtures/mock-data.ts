export const TEST_USER = {
  email: "e2e-test@example.com",
  password: "TestPass123!",
  name: "E2E Test User",
};

export const TEST_URLS = {
  valid: "https://example.com",
  validHttps: "https://httpbin.org/html",
  redirect: "http://github.com",
  slow: "https://httpbin.org/delay/8",
  invalid: "not-a-url",
  privateIP: "http://10.0.0.1",
  localhost: "http://127.0.0.1:3000",
  awsMetadata: "http://169.254.169.254/latest/meta-data/",
  unicode: "https://münchen.de",
  longURL: "https://example.com/" + "a".repeat(2000),
  nonHTTP: "ftp://files.example.com",
} as const;

export const TEST_CSV = {
  valid: `url,companyName,contactName,contactEmail
https://example.com,Example Inc,John,john@example.com
https://httpbin.org,HTTPBin,Jane,jane@example.com`,
  missingURL: `companyName,contactName
Example Inc,John`,
  empty: `url,companyName,contactName,contactEmail`,
  duplicate: `url
https://example.com
https://example.com`,
  invalidEmail: `url,contactEmail
https://example.com,not-an-email`,
};

export const TEST_CAMPAIGN = {
  name: "E2E Test Campaign",
  longName: "A".repeat(101),
  specialCharsName: "Campagne spéciale été 2024! 🎯",
};

export const TEST_AUDIT_URLS = {
  standard: "https://example.com",
  spa: "https://reactjs.org",
  authWall: "https://www.facebook.com",
  unicode: "https://www.königssee.de",
};

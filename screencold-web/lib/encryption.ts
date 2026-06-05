// ============================================
// OAuth Token Encryption
// AES-256-GCM authenticated encryption
// ============================================

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const KEY_ENV_VAR = "TOKEN_ENCRYPTION_KEY";
const SEPARATOR = ":";

// Cache the key after first successful read
let cachedKey: Buffer | null | undefined = undefined;

/**
 * Get the encryption key from environment variable.
 * Returns null if key is missing or invalid (graceful degradation).
 */
function getKey(): Buffer | null {
  if (cachedKey !== undefined) return cachedKey;

  const hex = process.env[KEY_ENV_VAR];
  if (!hex) {
    console.warn(
      "[Encryption] " + KEY_ENV_VAR + " is not set. Tokens will NOT be encrypted. " +
      "Set a 32-byte hex key via: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
    cachedKey = null;
    return null;
  }

  try {
    const key = Buffer.from(hex, "hex");
    if (key.length !== 32) {
      console.warn(
        "[Encryption] " + KEY_ENV_VAR + " must be 32 bytes (64 hex chars). Got " + key.length + " bytes. Encryption disabled."
      );
      cachedKey = null;
      return null;
    }
    cachedKey = key;
    return key;
  } catch {
    console.warn(
      "[Encryption] " + KEY_ENV_VAR + " is not valid hex. Encryption disabled."
    );
    cachedKey = null;
    return null;
  }
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * Format: iv:authTag:ciphertext (all hex-encoded)
 * - iv: 16 bytes (32 hex chars)
 * - authTag: 16 bytes (32 hex chars)
 * - ciphertext: variable length (hex-encoded)
 *
 * @param text - Plaintext to encrypt
 * @returns Encrypted string in iv:authTag:ciphertext format, or original text if key is not configured
 */
export function encrypt(text: string): string {
  if (!text) return text;

  const key = getKey();
  if (!key) return text; // Graceful degradation

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return [iv.toString("hex"), authTag.toString("hex"), encrypted].join(SEPARATOR);
}

/**
 * Decrypt a ciphertext string that was encrypted with encrypt().
 *
 * Accepts format: iv:authTag:ciphertext
 *
 * @param ciphertext - Encrypted string in iv:authTag:ciphertext format
 * @returns Decrypted plaintext, or original string if:
 *   - Key is not configured (graceful degradation)
 *   - String is not in encrypted format (lazy migration support)
 *   - Decryption fails (tampered data, wrong key)
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ciphertext;

  // Check if this looks like encrypted format: hex:hex:hex
  const parts = ciphertext.split(SEPARATOR);
  if (parts.length !== 3) {
    // Not in encrypted format -- return as-is for lazy migration
    // (handles existing plaintext tokens in the database)
    return ciphertext;
  }

  // Validate that parts look like hex
  const [ivHex, tagHex, encryptedHex] = parts;
  if (!isHex(ivHex) || !isHex(tagHex) || !isHex(encryptedHex)) {
    return ciphertext; // Not encrypted, return as-is
  }

  const key = getKey();
  if (!key) return ciphertext; // Graceful degradation

  try {
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(tagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    // Auth tag mismatch means data was tampered or key changed
    console.error("[Encryption] Decryption failed:", error);
    // Return original -- caller can handle the error
    return ciphertext;
  }
}

/**
 * Check if a string appears to be in encrypted format (iv:authTag:ciphertext).
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;
  const parts = value.split(SEPARATOR);
  if (parts.length !== 3) return false;
  return isHex(parts[0]) && isHex(parts[1]) && isHex(parts[2]);
}

/**
 * Encrypt a JSON-serializable object and return an object
 * compatible with Prisma Json fields: { encrypted: "..." }.
 *
 * @param obj - JSON-serializable object to encrypt
 * @returns Object with encrypted field, or original object if key is not configured
 */
export function encryptJson(obj: unknown): Record<string, string> {
  const key = getKey();
  if (!key) return obj as Record<string, string>;

  return { encrypted: encrypt(JSON.stringify(obj)) };
}

/**
 * Decrypt a UserIntegration tokens field.
 * Handles both encrypted { encrypted: "..." } and
 * plaintext (legacy) { accessToken: "...", ... } formats.
 *
 * @param obj - The Prisma JsonValue from UserIntegration.tokens
 * @returns Decrypted object, or the original if not encrypted
 */
export function decryptJson<T = unknown>(obj: unknown): T {
  if (!obj || typeof obj !== "object") return obj as T;

  const record = obj as Record<string, unknown>;
  if (record.encrypted && typeof record.encrypted === "string") {
    try {
      return JSON.parse(decrypt(record.encrypted)) as T;
    } catch {
      console.error("[Encryption] Failed to decrypt JSON tokens");
    }
  }

  // Not encrypted or decryption failed -- return as-is (lazy migration)
  return obj as T;
}

/**
 * Check if a hex string is valid hex.
 */
function isHex(str: string): boolean {
  return /^[0-9a-fA-F]+$/.test(str);
}

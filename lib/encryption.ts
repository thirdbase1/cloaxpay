import crypto from "crypto"

// AES-256-GCM encryption for sensitive data (webhooks, payment data, etc.)
const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const SALT = "cloaxpay_encryption_salt"

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || process.env.SUPABASE_JWT_SECRET
  if (!key) {
    throw new Error("ENCRYPTION_KEY or SUPABASE_JWT_SECRET must be set")
  }
  return crypto.pbkdf2Sync(key, SALT, 100000, 32, "sha256")
}

/**
 * Encrypts sensitive data using AES-256-GCM
 * Format: iv:authTag:encryptedData (all base64)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, "utf8", "hex")
  encrypted += cipher.final("hex")

  const authTag = cipher.getAuthTag()

  return `${iv.toString("base64")}:${authTag.toString("base64")}:${Buffer.from(encrypted, "hex").toString("base64")}`
}

/**
 * Decrypts data encrypted with encrypt()
 */
export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(":")
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format")
  }

  const iv = Buffer.from(parts[0], "base64")
  const authTag = Buffer.from(parts[1], "base64")
  const encrypted = Buffer.from(parts[2], "base64")

  const key = getEncryptionKey()

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted.toString("hex"), "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}

/**
 * Hash sensitive data for comparison (one-way)
 */
export function hashSensitiveData(data: string): string {
  const salt = process.env.API_KEY_SALT || "cloaxpay_hash_salt"
  return crypto.createHmac("sha256", salt).update(data).digest("hex")
}

/**
 * Secure comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString("base64url")
}

/**
 * Check if a string is encrypted (has our format)
 */
export function isEncrypted(data: string): boolean {
  const parts = data.split(":")
  if (parts.length !== 3) return false
  try {
    Buffer.from(parts[0], "base64")
    Buffer.from(parts[1], "base64")
    Buffer.from(parts[2], "base64")
    return true
  } catch {
    return false
  }
}

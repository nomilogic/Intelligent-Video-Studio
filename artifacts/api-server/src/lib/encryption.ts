import crypto from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env["ENCRYPTION_KEY"];
  if (!raw || raw.length < 32) {
    throw new Error(
      "ENCRYPTION_KEY env var must be set and be at least 32 characters long.",
    );
  }
  // SHA-256 derives a stable 32-byte key from any user-supplied secret.
  cachedKey = crypto.createHash("sha256").update(raw, "utf8").digest();
  return cachedKey;
}

/**
 * Encrypt arbitrary string with AES-256-GCM. Returns base64-encoded
 * concatenation of: 12-byte IV || ciphertext || 16-byte auth tag.
 */
export function encryptString(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, enc, tag]).toString("base64");
}

export function decryptString(blob: string): string {
  const key = getKey();
  const buf = Buffer.from(blob, "base64");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(buf.length - 16);
  const enc = buf.subarray(IV_LEN, buf.length - 16);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

/**
 * Hash an opaque token (session id, verification id, …) with SHA-256 so we
 * never store the cleartext in the DB. Hex-encoded for compact storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString("base64url");
}

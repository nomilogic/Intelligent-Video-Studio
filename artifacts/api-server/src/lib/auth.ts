import argon2 from "argon2";
import { eq, and, gt, isNull } from "drizzle-orm";
import {
  db,
  usersTable,
  sessionsTable,
  emailVerificationTokensTable,
  passwordResetTokensTable,
} from "@workspace/db";
import type { User } from "@workspace/db";
import { generateToken, hashToken } from "./encryption";

export const SESSION_COOKIE = "veditor_session";
const SESSION_DAYS = 30;
const VERIFY_HOURS = 24;
const RESET_HOURS = 1;

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export function emailLower(email: string): string {
  return email.trim().toLowerCase();
}

export function generateReferralCode(): string {
  // 8-char URL-safe code, lowercased for clean URLs.
  return generateToken(6).toLowerCase().replace(/-/g, "0").slice(0, 8);
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const lower = emailLower(email);
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.emailLower, lower));
  return user ?? null;
}

export async function findUserById(id: number): Promise<User | null> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id));
  return user ?? null;
}

export async function findUserByGoogleSub(sub: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.googleSub, sub));
  return user ?? null;
}

export async function findUserByReferralCode(
  code: string,
): Promise<User | null> {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.referralCode, code.toLowerCase()));
  return user ?? null;
}

export interface CreateSessionInput {
  userId: number;
  userAgent?: string;
  ipAddress?: string;
}

export async function createSession({
  userId,
  userAgent,
  ipAddress,
}: CreateSessionInput): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken(32);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessionsTable).values({
    tokenHash,
    userId,
    userAgent: userAgent ?? null,
    ipAddress: ipAddress ?? null,
    expiresAt,
  });
  return { token, expiresAt };
}

export async function findSessionUser(token: string): Promise<User | null> {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const rows = await db
    .select({
      user: usersTable,
      expiresAt: sessionsTable.expiresAt,
    })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(usersTable.id, sessionsTable.userId))
    .where(eq(sessionsTable.tokenHash, tokenHash));
  const row = rows[0];
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  return row.user;
}

export async function revokeSession(token: string): Promise<void> {
  if (!token) return;
  const tokenHash = hashToken(token);
  await db.delete(sessionsTable).where(eq(sessionsTable.tokenHash, tokenHash));
}

export async function createEmailVerificationToken(
  userId: number,
): Promise<string> {
  const token = generateToken(32);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + VERIFY_HOURS * 60 * 60 * 1000);
  await db.insert(emailVerificationTokensTable).values({
    tokenHash,
    userId,
    expiresAt,
  });
  return token;
}

export async function consumeEmailVerificationToken(
  token: string,
): Promise<number | null> {
  const tokenHash = hashToken(token);
  const [row] = await db
    .select()
    .from(emailVerificationTokensTable)
    .where(
      and(
        eq(emailVerificationTokensTable.tokenHash, tokenHash),
        gt(emailVerificationTokensTable.expiresAt, new Date()),
        isNull(emailVerificationTokensTable.consumedAt),
      ),
    );
  if (!row) return null;
  await db
    .update(emailVerificationTokensTable)
    .set({ consumedAt: new Date() })
    .where(eq(emailVerificationTokensTable.id, row.id));
  return row.userId;
}

export async function createPasswordResetToken(
  userId: number,
): Promise<string> {
  const token = generateToken(32);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_HOURS * 60 * 60 * 1000);
  await db.insert(passwordResetTokensTable).values({
    tokenHash,
    userId,
    expiresAt,
  });
  return token;
}

export async function consumePasswordResetToken(
  token: string,
): Promise<number | null> {
  const tokenHash = hashToken(token);
  const [row] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.tokenHash, tokenHash),
        gt(passwordResetTokensTable.expiresAt, new Date()),
        isNull(passwordResetTokensTable.consumedAt),
      ),
    );
  if (!row) return null;
  await db
    .update(passwordResetTokensTable)
    .set({ consumedAt: new Date() })
    .where(eq(passwordResetTokensTable.id, row.id));
  return row.userId;
}

export function sessionCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true as const,
    secure: true as const,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeMs,
  };
}

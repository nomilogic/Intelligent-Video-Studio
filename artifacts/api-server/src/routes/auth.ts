import { Router } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  usersTable,
  oauthStatesTable,
} from "@workspace/db";
import {
  SESSION_COOKIE,
  consumeEmailVerificationToken,
  consumePasswordResetToken,
  createEmailVerificationToken,
  createPasswordResetToken,
  createSession,
  emailLower,
  findUserByEmail,
  findUserByGoogleSub,
  findUserByReferralCode,
  generateReferralCode,
  hashPassword,
  revokeSession,
  sessionCookieOptions,
  verifyPassword,
} from "../lib/auth";
import { sendMail, getPublicBaseUrl } from "../lib/email";
import {
  applyLedger,
} from "../lib/diamonds";
import {
  getNumberSetting,
  SETTING_KEYS,
  DEFAULT_SETTINGS,
} from "../lib/feature-flags";
import {
  googleAuthUrl,
  googleConfig,
  googleLoginCallback,
  GOOGLE_LOGIN_SCOPES,
  publicBaseUrl,
} from "../lib/cloud-providers";
import { generateToken } from "../lib/encryption";
import { requireAuth } from "../middlewares/auth";
import { z } from "zod/v4";

const router = Router();

const SignupBody = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).optional(),
  referralCode: z.string().max(40).optional(),
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const ForgotBody = z.object({ email: z.string().email() });

const ResetBody = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

const VerifyBody = z.object({ token: z.string().min(1) });

async function setSessionCookie(res: any, userId: number, req: any): Promise<void> {
  const { token, expiresAt } = await createSession({
    userId,
    userAgent: req.get("user-agent") ?? undefined,
    ipAddress: req.ip ?? undefined,
  });
  const maxAge = expiresAt.getTime() - Date.now();
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions(maxAge));
}

router.post("/auth/signup", async (req, res) => {
  const body = SignupBody.parse(req.body);
  const lower = emailLower(body.email);
  const existing = await findUserByEmail(lower);
  if (existing) {
    res.status(409).json({ error: "An account with that email already exists." });
    return;
  }
  const passwordHash = await hashPassword(body.password);
  const referralCode = generateReferralCode();
  let referredBy: number | null = null;
  if (body.referralCode) {
    const referrer = await findUserByReferralCode(body.referralCode.trim());
    if (referrer) referredBy = referrer.id;
  }
  const [user] = await db
    .insert(usersTable)
    .values({
      email: body.email.trim(),
      emailLower: lower,
      passwordHash,
      name: body.name ?? null,
      referralCode,
      referredBy,
      role: "user",
    })
    .returning();
  if (!user) {
    res.status(500).json({ error: "Failed to create account" });
    return;
  }

  // Welcome grant
  const welcome = await getNumberSetting(
    SETTING_KEYS.WELCOME_GRANT,
    DEFAULT_SETTINGS[SETTING_KEYS.WELCOME_GRANT],
  );
  if (welcome > 0) {
    await applyLedger({
      userId: user.id,
      amount: welcome,
      kind: "welcome",
      reason: "Welcome bonus",
    });
  }

  const verifyToken = await createEmailVerificationToken(user.id);
  const baseUrl = getPublicBaseUrl();
  const verifyUrl = `${baseUrl}/verify?token=${encodeURIComponent(verifyToken)}`;
  await sendMail({
    to: user.email,
    subject: "Verify your email — AI Video Editor",
    text: `Welcome! Verify your email to unlock all features:\n\n${verifyUrl}\n\nThis link expires in 24 hours.`,
    html: `<p>Welcome! Verify your email to unlock all features:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 24 hours.</p>`,
  });

  await setSessionCookie(res, user.id, req);
  res.status(201).json({
    user: redactUser(user),
    verificationEmailSent: true,
  });
});

router.post("/auth/login", async (req, res) => {
  const body = LoginBody.parse(req.body);
  const user = await findUserByEmail(body.email);
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  if (user.banned) {
    res.status(403).json({ error: "This account has been banned" });
    return;
  }
  const ok = await verifyPassword(user.passwordHash, body.password);
  if (!ok) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  await db
    .update(usersTable)
    .set({ lastLoginAt: new Date() })
    .where(eq(usersTable.id, user.id));
  await setSessionCookie(res, user.id, req);
  res.json({ user: redactUser(user) });
});

router.post("/auth/logout", async (req, res) => {
  const token = (req as any).cookies?.[SESSION_COOKIE];
  if (token) await revokeSession(token);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ ok: true });
});

router.get("/auth/me", async (req, res) => {
  if (!req.user) {
    res.json({ user: null });
    return;
  }
  res.json({ user: redactUser(req.user) });
});

const PatchMeBody = z.object({
  name: z.string().min(1).max(100).nullable().optional(),
  avatarUrl: z.string().url().max(500).nullable().optional(),
});

router.patch("/auth/me", requireAuth, async (req, res) => {
  const body = PatchMeBody.parse(req.body);
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) updates["name"] = body.name;
  if (body.avatarUrl !== undefined) updates["avatarUrl"] = body.avatarUrl;
  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.user!.id))
    .returning();
  res.json({ user: redactUser(user!) });
});

router.post("/auth/verify", async (req, res) => {
  const body = VerifyBody.parse(req.body);
  const userId = await consumeEmailVerificationToken(body.token);
  if (!userId) {
    res.status(400).json({ error: "Invalid or expired verification link" });
    return;
  }
  const [user] = await db
    .update(usersTable)
    .set({ emailVerified: true })
    .where(eq(usersTable.id, userId))
    .returning();

  // Referral bonus on first verification
  if (user?.referredBy) {
    const bonus = await getNumberSetting(
      SETTING_KEYS.REFERRAL_BONUS,
      DEFAULT_SETTINGS[SETTING_KEYS.REFERRAL_BONUS],
    );
    if (bonus > 0) {
      try {
        await applyLedger({
          userId: user.id,
          amount: bonus,
          kind: "referral",
          reason: "Referral bonus (you joined via a referral)",
        });
        await applyLedger({
          userId: user.referredBy,
          amount: bonus,
          kind: "referral_bonus",
          reason: `Referral bonus (you referred ${user.email})`,
        });
      } catch (err) {
        req.log?.warn({ err }, "referral bonus failed");
      }
    }
  }

  res.json({ ok: true });
});

router.post("/auth/forgot-password", async (req, res) => {
  const body = ForgotBody.parse(req.body);
  const user = await findUserByEmail(body.email);
  // Always respond ok to avoid leaking which emails exist.
  if (user) {
    const token = await createPasswordResetToken(user.id);
    const url = `${getPublicBaseUrl()}/reset?token=${encodeURIComponent(token)}`;
    await sendMail({
      to: user.email,
      subject: "Reset your password — AI Video Editor",
      text: `Reset your password using this link:\n\n${url}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore the email.`,
      html: `<p>Reset your password:</p><p><a href="${url}">${url}</a></p><p>Expires in 1 hour.</p>`,
    });
  }
  res.json({ ok: true });
});

router.post("/auth/reset-password", async (req, res) => {
  const body = ResetBody.parse(req.body);
  const userId = await consumePasswordResetToken(body.token);
  if (!userId) {
    res.status(400).json({ error: "Invalid or expired reset link" });
    return;
  }
  const passwordHash = await hashPassword(body.password);
  await db
    .update(usersTable)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));
  res.json({ ok: true });
});

router.post(
  "/auth/resend-verification",
  requireAuth,
  async (req, res) => {
    const user = req.user!;
    if (user.emailVerified) {
      res.json({ ok: true, alreadyVerified: true });
      return;
    }
    const token = await createEmailVerificationToken(user.id);
    const url = `${getPublicBaseUrl()}/verify?token=${encodeURIComponent(token)}`;
    await sendMail({
      to: user.email,
      subject: "Verify your email — AI Video Editor",
      text: `Verify your email:\n\n${url}\n\nThis link expires in 24 hours.`,
    });
    res.json({ ok: true });
  },
);

// ───────────────── Google OAuth (login + signup) ─────────────────

router.get("/auth/google/start", async (req, res) => {
  const cfg = googleConfig();
  if (!cfg.configured) {
    res.status(503).json({ error: cfg.reason ?? "Google sign-in is not configured." });
    return;
  }
  const redirectTo =
    typeof req.query["redirect"] === "string" ? (req.query["redirect"] as string) : "/";
  const state = generateToken(24);
  await db.insert(oauthStatesTable).values({
    state,
    intent: "login",
    provider: "google",
    redirect: redirectTo,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  const url = googleAuthUrl({
    state,
    scopes: GOOGLE_LOGIN_SCOPES,
    redirectUri: `${publicBaseUrl()}/api/auth/google/callback`,
  });
  res.redirect(url);
});

router.get("/auth/google/callback", async (req, res) => {
  const code = typeof req.query["code"] === "string" ? (req.query["code"] as string) : "";
  const state = typeof req.query["state"] === "string" ? (req.query["state"] as string) : "";
  if (!code || !state) {
    res.status(400).send("Missing code/state");
    return;
  }
  const [stateRow] = await db
    .select()
    .from(oauthStatesTable)
    .where(eq(oauthStatesTable.state, state));
  if (!stateRow || stateRow.intent !== "login" || stateRow.expiresAt.getTime() < Date.now()) {
    res.status(400).send("Invalid or expired OAuth state");
    return;
  }
  await db.delete(oauthStatesTable).where(eq(oauthStatesTable.state, state));
  try {
    const tokens = await googleLoginCallback(code);
    if (!tokens.providerAccountId || !tokens.accountEmail) {
      res.status(500).send("Google did not return account info");
      return;
    }
    let user = await findUserByGoogleSub(tokens.providerAccountId);
    if (!user) {
      user = await findUserByEmail(tokens.accountEmail);
      if (user) {
        const [updated] = await db
          .update(usersTable)
          .set({
            googleSub: tokens.providerAccountId,
            emailVerified: true,
          })
          .where(eq(usersTable.id, user.id))
          .returning();
        user = updated ?? user;
      } else {
        const referralCode = generateReferralCode();
        const [created] = await db
          .insert(usersTable)
          .values({
            email: tokens.accountEmail,
            emailLower: emailLower(tokens.accountEmail),
            googleSub: tokens.providerAccountId,
            emailVerified: true,
            name: tokens.accountName ?? null,
            referralCode,
            role: "user",
          })
          .returning();
        user = created!;
        // Welcome grant for new google users
        const welcome = await getNumberSetting(
          SETTING_KEYS.WELCOME_GRANT,
          DEFAULT_SETTINGS[SETTING_KEYS.WELCOME_GRANT],
        );
        if (welcome > 0) {
          await applyLedger({
            userId: user.id,
            amount: welcome,
            kind: "welcome",
            reason: "Welcome bonus (Google sign-up)",
          });
        }
      }
    }
    if (user.banned) {
      res.status(403).send("This account has been banned");
      return;
    }
    await db
      .update(usersTable)
      .set({ lastLoginAt: new Date() })
      .where(eq(usersTable.id, user.id));
    await setSessionCookie(res, user.id, req);
    res.redirect(stateRow.redirect ?? "/");
  } catch (err: any) {
    req.log?.error({ err }, "google callback failed");
    res.status(500).send(`Google sign-in failed: ${err?.message ?? "unknown"}`);
  }
});

export function redactUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    emailVerified: user.emailVerified,
    referralCode: user.referralCode,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
  };
}

export default router;

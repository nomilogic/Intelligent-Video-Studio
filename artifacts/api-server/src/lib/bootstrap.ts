import { eq } from "drizzle-orm";
import {
  db,
  diamondPackagesTable,
  featureFlagsTable,
  platformSettingsTable,
  usersTable,
} from "@workspace/db";
import {
  emailLower,
  generateReferralCode,
  hashPassword,
} from "./auth";
import { applyLedger } from "./diamonds";
import {
  DEFAULT_SETTINGS,
  SETTING_KEYS,
} from "./feature-flags";
import { logger } from "./logger";

interface FeatureFlagSeed {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  requiresDiamonds: boolean;
  costDiamonds: number;
  requiresAuth: boolean;
}

const DEFAULT_FEATURE_FLAGS: FeatureFlagSeed[] = [
  {
    key: "export_hd",
    label: "HD Export (above 720p)",
    description: "Export at resolutions above 720p (Full HD, 4K, etc.)",
    enabled: true,
    requiresDiamonds: true,
    costDiamonds: 10,
    requiresAuth: true,
  },
  {
    key: "export",
    label: "Standard Export (720p and below)",
    description: "Export the project at 720p or below.",
    enabled: true,
    requiresDiamonds: false,
    costDiamonds: 0,
    requiresAuth: true,
  },
  {
    key: "ai_instruction",
    label: "AI Instruction Processing",
    description: "Run a natural-language editing instruction through AI.",
    enabled: true,
    requiresDiamonds: true,
    costDiamonds: 2,
    requiresAuth: true,
  },
  {
    key: "auto_subtitles",
    label: "Auto Subtitles",
    description: "Generate timed captions from the audio of a video/audio clip.",
    enabled: true,
    requiresDiamonds: true,
    costDiamonds: 15,
    requiresAuth: true,
  },
  {
    key: "chroma_key",
    label: "Chroma Key (Green Screen)",
    description: "Per-clip green-screen / chroma key effect.",
    enabled: true,
    requiresDiamonds: true,
    costDiamonds: 5,
    requiresAuth: true,
  },
  {
    key: "lut",
    label: "LUT Color Grading",
    description: "Apply built-in or uploaded .cube LUTs to a clip.",
    enabled: true,
    requiresDiamonds: true,
    costDiamonds: 5,
    requiresAuth: true,
  },
];

interface PackageSeed {
  name: string;
  description: string;
  diamonds: number;
  bonusDiamonds: number;
  priceCents: number;
  sortOrder: number;
  badge?: string;
}

const DEFAULT_PACKAGES: PackageSeed[] = [
  {
    name: "Starter",
    description: "200 diamonds — perfect for trying premium features.",
    diamonds: 200,
    bonusDiamonds: 0,
    priceCents: 499,
    sortOrder: 0,
  },
  {
    name: "Creator",
    description: "1,000 diamonds + 100 bonus — great for regular editors.",
    diamonds: 1000,
    bonusDiamonds: 100,
    priceCents: 1999,
    sortOrder: 1,
    badge: "Popular",
  },
  {
    name: "Studio",
    description: "5,000 diamonds + 1,000 bonus — for power users and teams.",
    diamonds: 5000,
    bonusDiamonds: 1000,
    priceCents: 7999,
    sortOrder: 2,
    badge: "Best Value",
  },
];

let bootstrapped = false;

export async function bootstrap(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;

  // Settings
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db
      .insert(platformSettingsTable)
      .values({ key, value: String(value) })
      .onConflictDoNothing({ target: platformSettingsTable.key });
  }

  // Feature flags
  for (const f of DEFAULT_FEATURE_FLAGS) {
    await db
      .insert(featureFlagsTable)
      .values(f)
      .onConflictDoNothing({ target: featureFlagsTable.key });
  }

  // Diamond packages
  for (const p of DEFAULT_PACKAGES) {
    await db
      .insert(diamondPackagesTable)
      .values({ ...p, currency: "usd", active: true })
      .onConflictDoNothing();
  }

  // Admin bootstrap
  const adminEmail = process.env["ADMIN_EMAIL"];
  const adminPassword = process.env["ADMIN_PASSWORD"];
  if (adminEmail && adminPassword) {
    const lower = emailLower(adminEmail);
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.emailLower, lower));
    if (!existing) {
      const [admin] = await db
        .insert(usersTable)
        .values({
          email: adminEmail,
          emailLower: lower,
          passwordHash: await hashPassword(adminPassword),
          emailVerified: true,
          role: "admin",
          name: "Admin",
          referralCode: generateReferralCode(),
        })
        .returning();
      if (admin) {
        try {
          await applyLedger({
            userId: admin.id,
            amount: 1000,
            kind: "admin_grant",
            reason: "Bootstrap: initial admin grant",
          });
        } catch (err) {
          logger.warn({ err }, "admin bootstrap grant failed");
        }
        logger.info({ email: adminEmail }, "[bootstrap] admin user created");
      }
    } else if (existing.role !== "admin") {
      await db
        .update(usersTable)
        .set({ role: "admin" })
        .where(eq(usersTable.id, existing.id));
      logger.info({ email: adminEmail }, "[bootstrap] promoted existing user to admin");
    }
  } else {
    logger.warn(
      "[bootstrap] ADMIN_EMAIL/ADMIN_PASSWORD not set — no admin will be created on cold start.",
    );
  }
}

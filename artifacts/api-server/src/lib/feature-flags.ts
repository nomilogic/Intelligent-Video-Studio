import { eq, sql } from "drizzle-orm";
import { db, featureFlagsTable, platformSettingsTable } from "@workspace/db";
import type { FeatureFlag } from "@workspace/db";

const flagCache = new Map<string, { flag: FeatureFlag; ts: number }>();
const settingsCache = new Map<string, { value: string; ts: number }>();
const TTL_MS = 5_000;

export async function getFlag(key: string): Promise<FeatureFlag | null> {
  const cached = flagCache.get(key);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.flag;
  const [row] = await db
    .select()
    .from(featureFlagsTable)
    .where(eq(featureFlagsTable.key, key));
  if (!row) return null;
  flagCache.set(key, { flag: row, ts: Date.now() });
  return row;
}

export async function listFlags(): Promise<FeatureFlag[]> {
  return db.select().from(featureFlagsTable).orderBy(featureFlagsTable.key);
}

export async function upsertFlag(
  key: string,
  patch: Partial<Omit<FeatureFlag, "id" | "key" | "createdAt">>,
): Promise<FeatureFlag> {
  const existing = await getFlag(key);
  if (!existing) {
    const [row] = await db
      .insert(featureFlagsTable)
      .values({
        key,
        label: patch.label ?? key,
        description: patch.description,
        enabled: patch.enabled ?? true,
        requiresDiamonds: patch.requiresDiamonds ?? false,
        costDiamonds: patch.costDiamonds ?? 0,
        requiresAuth: patch.requiresAuth ?? false,
      })
      .returning();
    flagCache.delete(key);
    return row!;
  }
  const [row] = await db
    .update(featureFlagsTable)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(featureFlagsTable.key, key))
    .returning();
  flagCache.delete(key);
  return row!;
}

export async function getSetting(
  key: string,
  fallback: string,
): Promise<string> {
  const cached = settingsCache.get(key);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.value;
  const [row] = await db
    .select()
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.key, key));
  const value = row?.value ?? fallback;
  settingsCache.set(key, { value, ts: Date.now() });
  return value;
}

export async function getNumberSetting(
  key: string,
  fallback: number,
): Promise<number> {
  const v = await getSetting(key, String(fallback));
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(platformSettingsTable)
    .values({ key, value })
    .onConflictDoUpdate({
      target: platformSettingsTable.key,
      set: { value, updatedAt: new Date() },
    });
  settingsCache.delete(key);
}

export async function listSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(platformSettingsTable);
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export const SETTING_KEYS = {
  WELCOME_GRANT: "welcome_grant",
  DAILY_GRANT: "daily_grant",
  REFERRAL_BONUS: "referral_bonus",
} as const;

export const DEFAULT_SETTINGS = {
  [SETTING_KEYS.WELCOME_GRANT]: 100,
  [SETTING_KEYS.DAILY_GRANT]: 20,
  [SETTING_KEYS.REFERRAL_BONUS]: 50,
};

import { Router } from "express";
import {
  db,
  usersTable,
  projectsTable,
  diamondTransactionsTable,
  diamondPackagesTable,
  diamondBalancesTable,
  featureFlagsTable,
  adminAuditLogTable,
  platformSettingsTable,
  insertDiamondPackageSchema,
} from "@workspace/db";
import type { User } from "@workspace/db";
import { and, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import { writeAudit } from "../lib/admin-audit";
import { z } from "zod/v4";
import {
  applyLedger,
  StripeEventAlreadyProcessedError,
} from "../lib/diamonds";
import { hashPassword } from "../lib/auth";
import {
  listFlags,
  upsertFlag,
  listSettings,
  setSetting,
} from "../lib/feature-flags";

const router = Router();

router.use(requireAdmin);

// ─────── Dashboard ───────

router.get("/admin/stats", async (_req, res) => {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [usersTotal] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
  const [usersDay] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(gte(usersTable.createdAt, dayAgo));
  const [usersWeek] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(gte(usersTable.createdAt, weekAgo));
  const [usersMonth] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable)
    .where(gte(usersTable.createdAt, monthAgo));
  const [projectsTotal] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projectsTable);
  const [exportsCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(diamondTransactionsTable)
    .where(eq(diamondTransactionsTable.featureKey, "export"));
  const [revenueRow] = await db
    .select({
      totalCents: sql<number>`coalesce(sum(case when ${diamondTransactionsTable.kind}='purchase' then ${diamondTransactionsTable.amount} else 0 end),0)::int`,
    })
    .from(diamondTransactionsTable);

  const topUsers = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      balance: diamondBalancesTable.balance,
    })
    .from(usersTable)
    .leftJoin(diamondBalancesTable, eq(diamondBalancesTable.userId, usersTable.id))
    .orderBy(desc(diamondBalancesTable.balance))
    .limit(10);

  res.json({
    users: {
      total: usersTotal?.count ?? 0,
      today: usersDay?.count ?? 0,
      thisWeek: usersWeek?.count ?? 0,
      thisMonth: usersMonth?.count ?? 0,
    },
    projects: { total: projectsTotal?.count ?? 0 },
    exports: { total: exportsCount?.count ?? 0 },
    diamondsGranted: revenueRow?.totalCents ?? 0,
    topUsers,
  });
});

router.get("/admin/analytics/daily", async (req, res) => {
  const days = Math.min(Number(req.query["days"] ?? 30), 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  // Daily new users
  const dailyUsers = await db
    .select({
      date: sql<string>`to_char(${usersTable.createdAt}::date, 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(usersTable)
    .where(gte(usersTable.createdAt, since))
    .groupBy(sql`${usersTable.createdAt}::date`)
    .orderBy(sql`${usersTable.createdAt}::date`);

  const dailyDiamondsByFeature = await db
    .select({
      date: sql<string>`to_char(${diamondTransactionsTable.createdAt}::date, 'YYYY-MM-DD')`,
      featureKey: diamondTransactionsTable.featureKey,
      total: sql<number>`coalesce(sum(${diamondTransactionsTable.amount}), 0)::int`,
    })
    .from(diamondTransactionsTable)
    .where(
      and(
        gte(diamondTransactionsTable.createdAt, since),
        eq(diamondTransactionsTable.kind, "spend"),
      ),
    )
    .groupBy(sql`${diamondTransactionsTable.createdAt}::date`, diamondTransactionsTable.featureKey)
    .orderBy(sql`${diamondTransactionsTable.createdAt}::date`);

  res.json({ dailyUsers, dailyDiamondsByFeature });
});

// ─────── Users ───────

router.get("/admin/users", async (req, res) => {
  const q =
    typeof req.query["q"] === "string" ? (req.query["q"] as string).trim() : "";
  const limit = Math.min(Number(req.query["limit"] ?? 50), 200);
  const offset = Math.max(Number(req.query["offset"] ?? 0), 0);
  const filters: any[] = [];
  if (q) {
    filters.push(or(ilike(usersTable.emailLower, `%${q.toLowerCase()}%`), ilike(usersTable.name, `%${q}%`)));
  }
  const where = filters.length ? and(...filters) : undefined;
  const rows = await db
    .select({
      user: usersTable,
      balance: diamondBalancesTable.balance,
    })
    .from(usersTable)
    .leftJoin(diamondBalancesTable, eq(diamondBalancesTable.userId, usersTable.id))
    .where(where)
    .orderBy(desc(usersTable.createdAt))
    .limit(limit)
    .offset(offset);
  res.json({
    users: rows.map((r) => ({
      ...r.user,
      passwordHash: undefined,
      googleSub: undefined,
      createdAt: r.user.createdAt.toISOString(),
      updatedAt: r.user.updatedAt.toISOString(),
      lastLoginAt: r.user.lastLoginAt?.toISOString() ?? null,
      balance: r.balance ?? 0,
    })),
  });
});

router.get("/admin/users/:id", async (req, res) => {
  const id = Number(req.params["id"]);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const [balance] = await db
    .select()
    .from(diamondBalancesTable)
    .where(eq(diamondBalancesTable.userId, id));
  const projects = await db.select().from(projectsTable).where(eq(projectsTable.userId, id));
  const txs = await db
    .select()
    .from(diamondTransactionsTable)
    .where(eq(diamondTransactionsTable.userId, id))
    .orderBy(desc(diamondTransactionsTable.id))
    .limit(100);
  res.json({
    user: { ...user, passwordHash: undefined },
    balance: balance?.balance ?? 0,
    projects: projects.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
    transactions: txs.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })),
  });
});

const GrantBody = z.object({
  amount: z.number().int(),
  reason: z.string().min(1).max(200),
});

router.post("/admin/users/:id/grant", async (req, res) => {
  const id = Number(req.params["id"]);
  const body = GrantBody.parse(req.body);
  const tx = await applyLedger({
    userId: id,
    amount: body.amount,
    kind: body.amount > 0 ? "admin_grant" : "admin_revoke",
    reason: `Admin: ${body.reason}`,
  });
  await writeAudit(
    req.user!,
    {
      action: "diamond.adjust",
      targetType: "user",
      targetId: id,
      details: { amount: body.amount, reason: body.reason, txId: tx.id },
    },
    req,
  );
  res.json({ transaction: { ...tx, createdAt: tx.createdAt.toISOString() } });
});

const PatchUserBody = z.object({
  banned: z.boolean().optional(),
  bannedReason: z.string().max(200).nullable().optional(),
  role: z.enum(["user", "admin"]).optional(),
  emailVerified: z.boolean().optional(),
});

router.patch("/admin/users/:id", async (req, res) => {
  const id = Number(req.params["id"]);
  const body = PatchUserBody.parse(req.body);
  const [user] = await db
    .update(usersTable)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  await writeAudit(
    req.user!,
    { action: "user.update", targetType: "user", targetId: id, details: body },
    req,
  );
  res.json({ user: { ...user, passwordHash: undefined } });
});

router.post("/admin/users/:id/force-reset", async (req, res) => {
  const id = Number(req.params["id"]);
  // Generate random password the user must reset.
  const tempPassword = `Reset!${Math.random().toString(36).slice(2, 12)}`;
  await db
    .update(usersTable)
    .set({ passwordHash: await hashPassword(tempPassword), updatedAt: new Date() })
    .where(eq(usersTable.id, id));
  await writeAudit(
    req.user!,
    { action: "user.force_reset", targetType: "user", targetId: id },
    req,
  );
  res.json({ ok: true, tempPassword });
});

router.delete("/admin/users/:id", async (req, res) => {
  const id = Number(req.params["id"]);
  if (id === req.user!.id) {
    res.status(400).json({ error: "Cannot delete your own account" });
    return;
  }
  await db.delete(usersTable).where(eq(usersTable.id, id));
  await writeAudit(
    req.user!,
    { action: "user.delete", targetType: "user", targetId: id },
    req,
  );
  res.json({ ok: true });
});

// ─────── Projects ───────

router.get("/admin/projects", async (req, res) => {
  const limit = Math.min(Number(req.query["limit"] ?? 100), 500);
  const offset = Math.max(Number(req.query["offset"] ?? 0), 0);
  const rows = await db
    .select({
      project: projectsTable,
      ownerEmail: usersTable.email,
    })
    .from(projectsTable)
    .leftJoin(usersTable, eq(usersTable.id, projectsTable.userId))
    .orderBy(desc(projectsTable.updatedAt))
    .limit(limit)
    .offset(offset);
  res.json({
    projects: rows.map((r) => ({
      ...r.project,
      // strip large state field for list view
      state: undefined,
      ownerEmail: r.ownerEmail,
      createdAt: r.project.createdAt.toISOString(),
      updatedAt: r.project.updatedAt.toISOString(),
    })),
  });
});

router.delete("/admin/projects/:id", async (req, res) => {
  const id = Number(req.params["id"]);
  await db.delete(projectsTable).where(eq(projectsTable.id, id));
  await writeAudit(
    req.user!,
    { action: "project.delete", targetType: "project", targetId: id },
    req,
  );
  res.json({ ok: true });
});

// ─────── Feature flags & settings ───────

router.get("/admin/feature-flags", async (_req, res) => {
  const flags = await listFlags();
  const settings = await listSettings();
  res.json({ flags, settings });
});

const PatchFlagBody = z.object({
  label: z.string().optional(),
  description: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  requiresDiamonds: z.boolean().optional(),
  costDiamonds: z.number().int().min(0).optional(),
  requiresAuth: z.boolean().optional(),
});

router.patch("/admin/feature-flags/:key", async (req, res) => {
  const key = req.params["key"] as string;
  const body = PatchFlagBody.parse(req.body);
  const flag = await upsertFlag(key, body);
  await writeAudit(
    req.user!,
    { action: "flag.update", targetType: "flag", targetId: key, details: body },
    req,
  );
  res.json({ flag });
});

const PatchSettingBody = z.object({ value: z.string().max(2000) });

router.patch("/admin/settings/:key", async (req, res) => {
  const key = req.params["key"] as string;
  const body = PatchSettingBody.parse(req.body);
  await setSetting(key, body.value);
  await writeAudit(
    req.user!,
    { action: "setting.update", targetType: "setting", targetId: key, details: body },
    req,
  );
  res.json({ ok: true });
});

// ─────── Diamond packages ───────

router.get("/admin/diamond-packages", async (_req, res) => {
  const rows = await db
    .select()
    .from(diamondPackagesTable)
    .orderBy(diamondPackagesTable.sortOrder);
  res.json({
    packages: rows.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
  });
});

router.post("/admin/diamond-packages", async (req, res) => {
  const body = insertDiamondPackageSchema.parse(req.body);
  const [pkg] = await db.insert(diamondPackagesTable).values(body).returning();
  await writeAudit(
    req.user!,
    { action: "diamond_pkg.create", targetType: "diamond_package", targetId: pkg!.id, details: body },
    req,
  );
  res.json({ package: { ...pkg, createdAt: pkg!.createdAt.toISOString() } });
});

router.patch("/admin/diamond-packages/:id", async (req, res) => {
  const id = Number(req.params["id"]);
  const body = insertDiamondPackageSchema.partial().parse(req.body);
  const [pkg] = await db
    .update(diamondPackagesTable)
    .set(body)
    .where(eq(diamondPackagesTable.id, id))
    .returning();
  if (!pkg) {
    res.status(404).json({ error: "Package not found" });
    return;
  }
  await writeAudit(
    req.user!,
    { action: "diamond_pkg.update", targetType: "diamond_package", targetId: id, details: body },
    req,
  );
  res.json({ package: { ...pkg, createdAt: pkg.createdAt.toISOString() } });
});

router.delete("/admin/diamond-packages/:id", async (req, res) => {
  const id = Number(req.params["id"]);
  await db.delete(diamondPackagesTable).where(eq(diamondPackagesTable.id, id));
  await writeAudit(
    req.user!,
    { action: "diamond_pkg.delete", targetType: "diamond_package", targetId: id },
    req,
  );
  res.json({ ok: true });
});

// ─────── Transactions / refunds ───────

router.get("/admin/transactions", async (req, res) => {
  const limit = Math.min(Number(req.query["limit"] ?? 100), 500);
  const txs = await db
    .select({
      tx: diamondTransactionsTable,
      email: usersTable.email,
    })
    .from(diamondTransactionsTable)
    .leftJoin(usersTable, eq(usersTable.id, diamondTransactionsTable.userId))
    .orderBy(desc(diamondTransactionsTable.id))
    .limit(limit);
  res.json({
    transactions: txs.map((t) => ({
      ...t.tx,
      email: t.email,
      createdAt: t.tx.createdAt.toISOString(),
    })),
  });
});

router.post("/admin/transactions/:id/refund", async (req, res) => {
  const id = Number(req.params["id"]);
  const [orig] = await db
    .select()
    .from(diamondTransactionsTable)
    .where(eq(diamondTransactionsTable.id, id));
  if (!orig) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  if (orig.amount <= 0) {
    res.status(400).json({ error: "Cannot refund a non-credit transaction" });
    return;
  }
  try {
    const tx = await applyLedger({
      userId: orig.userId,
      amount: -orig.amount,
      kind: "refund",
      reason: `Admin refund of #${orig.id}`,
      refundedTransactionId: orig.id,
    });
    await writeAudit(
      req.user!,
      {
        action: "diamond.refund",
        targetType: "transaction",
        targetId: id,
        details: { amount: orig.amount, newTxId: tx.id },
      },
      req,
    );
    res.json({ transaction: { ...tx, createdAt: tx.createdAt.toISOString() } });
  } catch (err) {
    if (err instanceof StripeEventAlreadyProcessedError) {
      res.status(409).json({ error: "Already refunded" });
      return;
    }
    throw err;
  }
});

// ─────── Audit log ───────

router.get("/admin/audit-log", async (req, res) => {
  const limit = Math.min(Number(req.query["limit"] ?? 100), 500);
  const rows = await db
    .select()
    .from(adminAuditLogTable)
    .orderBy(desc(adminAuditLogTable.id))
    .limit(limit);
  res.json({
    entries: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  });
});

// ─────── System ───────

router.get("/admin/system", async (_req, res) => {
  res.json({
    smtp: {
      configured: !!(
        process.env["SMTP_HOST"] &&
        process.env["SMTP_PORT"] &&
        process.env["SMTP_USER"] &&
        process.env["SMTP_PASS"]
      ),
      host: process.env["SMTP_HOST"] ?? null,
      port: process.env["SMTP_PORT"] ?? null,
      from: process.env["SMTP_FROM"] ?? null,
    },
    stripe: {
      configured: !!process.env["STRIPE_SECRET_KEY"],
      publishableKey: process.env["STRIPE_PUBLISHABLE_KEY"] ?? null,
      webhookConfigured: !!process.env["STRIPE_WEBHOOK_SECRET"],
    },
    google: { configured: !!process.env["GOOGLE_OAUTH_CLIENT_ID"] },
    dropbox: { configured: !!process.env["DROPBOX_APP_KEY"] },
    onedrive: { configured: !!process.env["MICROSOFT_OAUTH_CLIENT_ID"] },
    terabox: { configured: false, reason: "TeraBox integration coming soon" },
    encryption: { configured: !!process.env["ENCRYPTION_KEY"] },
  });
});

export default router;

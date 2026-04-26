import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db, oauthStatesTable, userConnectionsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import {
  ALL_PROVIDERS,
  CloudProvider,
  disconnectProvider,
  downloadProviderFile,
  exchangeCode,
  getAuthUrl,
  getConnection,
  getProviderConfig,
  listProviderFolder,
  persistConnection,
  publicBaseUrl,
  uploadProviderFile,
} from "../lib/cloud-providers";
import { generateToken } from "../lib/encryption";
import { writeAudit } from "../lib/admin-audit";

const router = Router();

function parseProvider(p: string): CloudProvider | null {
  return ALL_PROVIDERS.includes(p as CloudProvider) ? (p as CloudProvider) : null;
}

function qstring(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

router.get("/cloud/providers", async (req, res) => {
  const list = ALL_PROVIDERS.map((p) => {
    const cfg = getProviderConfig(p);
    return {
      provider: p,
      configured: cfg.configured,
      reason: cfg.reason ?? null,
    };
  });
  let connections: Record<string, { connected: boolean; accountEmail?: string | null; accountName?: string | null }> = {};
  if (req.user) {
    const rows = await db
      .select()
      .from(userConnectionsTable)
      .where(eq(userConnectionsTable.userId, req.user.id));
    for (const r of rows) {
      connections[r.provider] = {
        connected: true,
        accountEmail: r.accountEmail,
        accountName: r.accountName,
      };
    }
  }
  res.json({ providers: list, connections });
});

router.get("/cloud/:provider/connect", requireAuth, async (req, res) => {
  const provider = parseProvider(req.params["provider"] as string);
  if (!provider) {
    res.status(400).json({ error: "Unknown provider" });
    return;
  }
  const cfg = getProviderConfig(provider);
  if (!cfg.configured) {
    res.status(503).json({ error: cfg.reason ?? "Provider not configured" });
    return;
  }
  const state = generateToken(24);
  await db.insert(oauthStatesTable).values({
    state,
    intent: "cloud",
    provider,
    userId: req.user!.id,
    redirect: qstring(req.query["redirect"]) ?? "/account",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  const url = getAuthUrl(provider, state);
  res.redirect(url);
});

router.get("/cloud/:provider/callback", async (req, res) => {
  const provider = parseProvider(req.params["provider"] as string);
  if (!provider) {
    res.status(400).send("Unknown provider");
    return;
  }
  const code = qstring(req.query["code"]);
  const state = qstring(req.query["state"]);
  if (!code || !state) {
    res.status(400).send("Missing code/state");
    return;
  }
  const [row] = await db
    .select()
    .from(oauthStatesTable)
    .where(eq(oauthStatesTable.state, state));
  if (
    !row ||
    row.intent !== "cloud" ||
    row.provider !== provider ||
    row.expiresAt.getTime() < Date.now() ||
    !row.userId
  ) {
    res.status(400).send("Invalid or expired OAuth state");
    return;
  }
  await db.delete(oauthStatesTable).where(eq(oauthStatesTable.state, state));
  try {
    const tokens = await exchangeCode(provider, code);
    await persistConnection(row.userId, provider, tokens);
    await writeAudit(
      { id: row.userId } as any,
      { action: "cloud.connect", targetType: "provider", targetId: provider },
      req,
    );
    res.redirect(row.redirect ?? "/account");
  } catch (err: any) {
    req.log?.error({ err }, "cloud callback failed");
    res.status(500).send(`Cloud connect failed: ${err?.message ?? "unknown"}`);
  }
});

router.post("/cloud/:provider/disconnect", requireAuth, async (req, res) => {
  const provider = parseProvider(req.params["provider"] as string);
  if (!provider) {
    res.status(400).json({ error: "Unknown provider" });
    return;
  }
  await disconnectProvider(req.user!.id, provider);
  await writeAudit(
    req.user!,
    { action: "cloud.disconnect", targetType: "provider", targetId: provider },
    req,
  );
  res.json({ ok: true });
});

router.get("/cloud/:provider/list", requireAuth, async (req, res) => {
  const provider = parseProvider(req.params["provider"] as string);
  if (!provider) {
    res.status(400).json({ error: "Unknown provider" });
    return;
  }
  const folderId = qstring(req.query["folderId"]);
  try {
    const items = await listProviderFolder(req.user!.id, provider, folderId);
    res.json({ items, folderId });
  } catch (err: any) {
    res.status(err?.status ?? 500).json({ error: err?.message ?? "List failed" });
  }
});

router.get("/cloud/:provider/download/:fileId", requireAuth, async (req, res) => {
  const provider = parseProvider(req.params["provider"] as string);
  if (!provider) {
    res.status(400).json({ error: "Unknown provider" });
    return;
  }
  try {
    const { stream, mimeType, size, filename } = await downloadProviderFile(
      req.user!.id,
      provider,
      req.params["fileId"] as string,
    );
    if (mimeType) res.setHeader("Content-Type", mimeType);
    if (size) res.setHeader("Content-Length", String(size));
    if (filename) res.setHeader("Content-Disposition", `inline; filename="${filename.replace(/"/g, "")}"`);
    stream.pipe(res);
    stream.on("error", (err) => {
      req.log?.error({ err }, "download stream error");
      try { res.end(); } catch { /* ignore */ }
    });
  } catch (err: any) {
    res.status(err?.status ?? 500).json({ error: err?.message ?? "Download failed" });
  }
});

const ExportBody = z.object({
  folderId: z.string().nullable().optional(),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  // base64-encoded file body. Browser-rendered exports tend to be small (<50MB)
  // for short videos which is fine over JSON; if file size becomes a concern
  // we can switch this to multipart streaming.
  base64: z.string().min(1),
});

router.post("/cloud/:provider/export", requireAuth, async (req, res) => {
  const provider = parseProvider(req.params["provider"] as string);
  if (!provider) {
    res.status(400).json({ error: "Unknown provider" });
    return;
  }
  const body = ExportBody.parse(req.body);
  try {
    const buf = Buffer.from(body.base64, "base64");
    const result = await uploadProviderFile(
      req.user!.id,
      provider,
      body.folderId ?? null,
      body.filename,
      body.mimeType,
      buf,
    );
    res.json(result);
  } catch (err: any) {
    res.status(err?.status ?? 500).json({ error: err?.message ?? "Upload failed" });
  }
});

export default router;

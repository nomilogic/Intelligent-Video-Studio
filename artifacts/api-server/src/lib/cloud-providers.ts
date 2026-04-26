/**
 * Cloud-storage provider integrations: Google Drive, Dropbox, OneDrive,
 * TeraBox.
 *
 * Each provider implements a uniform shape:
 *   - getAuthUrl(state): redirect URL to start OAuth.
 *   - handleCallback(code): exchange code for { accessToken, refreshToken,
 *     expiresAt, accountEmail, providerAccountId, scope }.
 *   - listFolder(token, folderId): { items: { id, name, kind, size?,
 *     mimeType? }[] }.
 *   - downloadStream(token, fileId): node Readable for an asset.
 *   - uploadFile(token, folderId, name, mime, buffer): { id, webUrl? }.
 *
 * If the env vars for a provider are missing the helper functions throw
 * `ProviderNotConfiguredError`. The /api/cloud/providers route exposes
 * `configured: boolean` for each so the UI can show a "Configure to enable"
 * state without trying to call OAuth.
 */
import { Readable } from "node:stream";
import {
  decryptString,
  encryptString,
  generateToken,
} from "./encryption";
import { db, userConnectionsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import type { UserConnection } from "@workspace/db";

export type CloudProvider = "google_drive" | "dropbox" | "onedrive" | "terabox";

export class ProviderNotConfiguredError extends Error {
  constructor(public provider: CloudProvider) {
    super(`Provider ${provider} is not configured. Add the required OAuth env vars.`);
  }
}

export class ProviderError extends Error {
  constructor(message: string, public provider: CloudProvider, public status?: number) {
    super(message);
  }
}

export interface CloudFolderItem {
  id: string;
  name: string;
  kind: "folder" | "file";
  mimeType?: string;
  size?: number;
  modifiedAt?: string;
  thumbnail?: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
  accountEmail?: string;
  accountName?: string;
  providerAccountId?: string;
}

export interface ProviderConfig {
  configured: boolean;
  reason?: string;
}

function env(k: string): string | undefined {
  return process.env[k];
}

export function publicBaseUrl(): string {
  const u = env("PUBLIC_BASE_URL");
  if (u) return u.replace(/\/+$/, "");
  const dev = env("REPLIT_DEV_DOMAIN");
  if (dev) return `https://${dev}`;
  return "http://localhost:5000";
}

export function defaultRedirectUri(provider: CloudProvider): string {
  return `${publicBaseUrl()}/api/cloud/${provider}/callback`;
}

// ───────────────────────── Google Drive ─────────────────────────

const GOOGLE_DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.file",
  "openid",
  "email",
  "profile",
];

export const GOOGLE_LOGIN_SCOPES = ["openid", "email", "profile"];

export function googleConfig(includesDrive = false): ProviderConfig {
  const id = env("GOOGLE_OAUTH_CLIENT_ID");
  const sec = env("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!id || !sec) {
    return {
      configured: false,
      reason: "Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET to enable.",
    };
  }
  return { configured: true };
}

export function googleAuthUrl(opts: {
  state: string;
  scopes: string[];
  redirectUri?: string;
}): string {
  const id = env("GOOGLE_OAUTH_CLIENT_ID");
  const sec = env("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!id || !sec) throw new ProviderNotConfiguredError("google_drive");
  const params = new URLSearchParams({
    client_id: id,
    redirect_uri: opts.redirectUri ?? `${publicBaseUrl()}/api/auth/google/callback`,
    response_type: "code",
    scope: opts.scopes.join(" "),
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state: opts.state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function googleExchange(
  code: string,
  redirectUri: string,
): Promise<OAuthTokens> {
  const id = env("GOOGLE_OAUTH_CLIENT_ID");
  const sec = env("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!id || !sec) throw new ProviderNotConfiguredError("google_drive");
  const body = new URLSearchParams({
    code,
    client_id: id,
    client_secret: sec,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) {
    const text = await r.text();
    throw new ProviderError(`Google token exchange failed: ${text}`, "google_drive", r.status);
  }
  const data: any = await r.json();
  // Fetch profile so we can record an account email.
  let email: string | undefined;
  let name: string | undefined;
  let sub: string | undefined;
  try {
    const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (profileRes.ok) {
      const p: any = await profileRes.json();
      email = p.email;
      name = p.name;
      sub = p.sub;
    }
  } catch {
    /* ignore */
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in
      ? new Date(Date.now() + Number(data.expires_in) * 1000)
      : undefined,
    scope: data.scope,
    accountEmail: email,
    accountName: name,
    providerAccountId: sub,
  };
}

export function googleLoginCallback(code: string): Promise<OAuthTokens> {
  return googleExchange(code, `${publicBaseUrl()}/api/auth/google/callback`);
}

export function googleDriveCallback(code: string): Promise<OAuthTokens> {
  return googleExchange(code, defaultRedirectUri("google_drive"));
}

async function googleRefresh(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt?: Date;
}> {
  const id = env("GOOGLE_OAUTH_CLIENT_ID");
  const sec = env("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!id || !sec) throw new ProviderNotConfiguredError("google_drive");
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: id,
    client_secret: sec,
    grant_type: "refresh_token",
  });
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) {
    const text = await r.text();
    throw new ProviderError(
      `Google token refresh failed: ${text}`,
      "google_drive",
      r.status,
    );
  }
  const data: any = await r.json();
  return {
    accessToken: data.access_token,
    expiresAt: data.expires_in
      ? new Date(Date.now() + Number(data.expires_in) * 1000)
      : undefined,
  };
}

async function googleDriveList(
  token: string,
  folderId: string | null,
): Promise<CloudFolderItem[]> {
  const parent = folderId ?? "root";
  const q = `'${parent}' in parents and trashed=false`;
  const fields = "files(id,name,mimeType,size,modifiedTime,thumbnailLink,iconLink)";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&pageSize=200`;
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    throw new ProviderError(
      `Google Drive list failed: ${await r.text()}`,
      "google_drive",
      r.status,
    );
  }
  const data: any = await r.json();
  return (data.files ?? []).map((f: any) => ({
    id: f.id,
    name: f.name,
    kind: f.mimeType === "application/vnd.google-apps.folder" ? "folder" : "file",
    mimeType: f.mimeType,
    size: f.size ? Number(f.size) : undefined,
    modifiedAt: f.modifiedTime,
    thumbnail: f.thumbnailLink ?? f.iconLink,
  }));
}

async function googleDriveDownload(
  token: string,
  fileId: string,
): Promise<{ stream: Readable; mimeType?: string; size?: number; filename?: string }> {
  // Fetch metadata first to know mime/name/size.
  const metaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType,size,name`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!metaRes.ok) {
    throw new ProviderError(
      `Google Drive metadata failed: ${await metaRes.text()}`,
      "google_drive",
      metaRes.status,
    );
  }
  const meta: any = await metaRes.json();
  const downloadRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!downloadRes.ok || !downloadRes.body) {
    throw new ProviderError(
      `Google Drive download failed: ${await downloadRes.text()}`,
      "google_drive",
      downloadRes.status,
    );
  }
  return {
    stream: Readable.fromWeb(downloadRes.body as any),
    mimeType: meta.mimeType,
    size: meta.size ? Number(meta.size) : undefined,
    filename: meta.name,
  };
}

async function googleDriveUpload(
  token: string,
  folderId: string | null,
  name: string,
  mime: string,
  data: Buffer,
): Promise<{ id: string; webUrl?: string }> {
  const meta = {
    name,
    parents: folderId ? [folderId] : undefined,
  };
  const boundary = `----wm_${generateToken(8)}`;
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(meta) +
    `\r\n--${boundary}\r\n` +
    `Content-Type: ${mime}\r\n\r\n`;
  const tail = `\r\n--${boundary}--`;
  const buf = Buffer.concat([Buffer.from(body), data, Buffer.from(tail)]);
  const r = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": String(buf.length),
      },
      body: buf,
    },
  );
  if (!r.ok) {
    throw new ProviderError(
      `Google Drive upload failed: ${await r.text()}`,
      "google_drive",
      r.status,
    );
  }
  const json: any = await r.json();
  return { id: json.id, webUrl: json.webViewLink };
}

// ───────────────────────── Dropbox ─────────────────────────

export function dropboxConfig(): ProviderConfig {
  const id = env("DROPBOX_APP_KEY");
  const sec = env("DROPBOX_APP_SECRET");
  if (!id || !sec) {
    return {
      configured: false,
      reason: "Set DROPBOX_APP_KEY and DROPBOX_APP_SECRET to enable.",
    };
  }
  return { configured: true };
}

export function dropboxAuthUrl(state: string): string {
  const id = env("DROPBOX_APP_KEY");
  if (!id) throw new ProviderNotConfiguredError("dropbox");
  const params = new URLSearchParams({
    client_id: id,
    response_type: "code",
    redirect_uri: defaultRedirectUri("dropbox"),
    state,
    token_access_type: "offline",
  });
  return `https://www.dropbox.com/oauth2/authorize?${params.toString()}`;
}

export async function dropboxCallback(code: string): Promise<OAuthTokens> {
  const id = env("DROPBOX_APP_KEY");
  const sec = env("DROPBOX_APP_SECRET");
  if (!id || !sec) throw new ProviderNotConfiguredError("dropbox");
  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    redirect_uri: defaultRedirectUri("dropbox"),
    client_id: id,
    client_secret: sec,
  });
  const r = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) {
    throw new ProviderError(`Dropbox token exchange failed: ${await r.text()}`, "dropbox", r.status);
  }
  const data: any = await r.json();
  // Account info
  let email: string | undefined;
  let name: string | undefined;
  try {
    const accRes = await fetch("https://api.dropboxapi.com/2/users/get_current_account", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (accRes.ok) {
      const a: any = await accRes.json();
      email = a.email;
      name = a.name?.display_name;
    }
  } catch {
    /* ignore */
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in
      ? new Date(Date.now() + Number(data.expires_in) * 1000)
      : undefined,
    scope: data.scope,
    accountEmail: email,
    accountName: name,
    providerAccountId: data.account_id,
  };
}

async function dropboxRefresh(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt?: Date;
}> {
  const id = env("DROPBOX_APP_KEY");
  const sec = env("DROPBOX_APP_SECRET");
  if (!id || !sec) throw new ProviderNotConfiguredError("dropbox");
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    client_id: id,
    client_secret: sec,
  });
  const r = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new ProviderError(`Dropbox refresh failed`, "dropbox", r.status);
  const d: any = await r.json();
  return {
    accessToken: d.access_token,
    expiresAt: d.expires_in
      ? new Date(Date.now() + Number(d.expires_in) * 1000)
      : undefined,
  };
}

async function dropboxList(
  token: string,
  folderId: string | null,
): Promise<CloudFolderItem[]> {
  const path = folderId ?? "";
  const r = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path, limit: 200 }),
  });
  if (!r.ok) {
    throw new ProviderError(`Dropbox list failed: ${await r.text()}`, "dropbox", r.status);
  }
  const data: any = await r.json();
  return (data.entries ?? []).map((f: any) => ({
    id: f.path_lower ?? f.path_display ?? f.id,
    name: f.name,
    kind: f[".tag"] === "folder" ? "folder" : "file",
    size: f.size,
    modifiedAt: f.client_modified ?? f.server_modified,
  }));
}

async function dropboxDownload(
  token: string,
  fileId: string,
): Promise<{ stream: Readable; mimeType?: string; size?: number; filename?: string }> {
  const r = await fetch("https://content.dropboxapi.com/2/files/download", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Dropbox-API-Arg": JSON.stringify({ path: fileId }),
    },
  });
  if (!r.ok || !r.body) {
    throw new ProviderError(`Dropbox download failed: ${await r.text()}`, "dropbox", r.status);
  }
  const apiResult = r.headers.get("dropbox-api-result");
  let filename: string | undefined;
  let size: number | undefined;
  if (apiResult) {
    try {
      const meta = JSON.parse(apiResult);
      filename = meta.name;
      size = meta.size;
    } catch {
      /* ignore */
    }
  }
  return {
    stream: Readable.fromWeb(r.body as any),
    filename,
    size,
  };
}

async function dropboxUpload(
  token: string,
  folderId: string | null,
  name: string,
  _mime: string,
  data: Buffer,
): Promise<{ id: string; webUrl?: string }> {
  const path = folderId ? `${folderId}/${name}` : `/${name}`;
  const r = await fetch("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "Dropbox-API-Arg": JSON.stringify({
        path,
        mode: "add",
        autorename: true,
        mute: false,
      }),
    },
    body: new Uint8Array(data),
  });
  if (!r.ok) {
    throw new ProviderError(`Dropbox upload failed: ${await r.text()}`, "dropbox", r.status);
  }
  const j: any = await r.json();
  return { id: j.path_lower ?? j.id, webUrl: undefined };
}

// ───────────────────────── OneDrive (Microsoft Graph) ─────────────────────────

const ONEDRIVE_SCOPES = [
  "Files.ReadWrite",
  "User.Read",
  "offline_access",
];

export function onedriveConfig(): ProviderConfig {
  const id = env("MICROSOFT_OAUTH_CLIENT_ID");
  const sec = env("MICROSOFT_OAUTH_CLIENT_SECRET");
  if (!id || !sec) {
    return {
      configured: false,
      reason:
        "Set MICROSOFT_OAUTH_CLIENT_ID and MICROSOFT_OAUTH_CLIENT_SECRET to enable.",
    };
  }
  return { configured: true };
}

export function onedriveAuthUrl(state: string): string {
  const id = env("MICROSOFT_OAUTH_CLIENT_ID");
  if (!id) throw new ProviderNotConfiguredError("onedrive");
  const params = new URLSearchParams({
    client_id: id,
    response_type: "code",
    redirect_uri: defaultRedirectUri("onedrive"),
    response_mode: "query",
    scope: ONEDRIVE_SCOPES.join(" "),
    state,
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function onedriveCallback(code: string): Promise<OAuthTokens> {
  const id = env("MICROSOFT_OAUTH_CLIENT_ID");
  const sec = env("MICROSOFT_OAUTH_CLIENT_SECRET");
  if (!id || !sec) throw new ProviderNotConfiguredError("onedrive");
  const body = new URLSearchParams({
    client_id: id,
    client_secret: sec,
    code,
    grant_type: "authorization_code",
    redirect_uri: defaultRedirectUri("onedrive"),
    scope: ONEDRIVE_SCOPES.join(" "),
  });
  const r = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );
  if (!r.ok) {
    throw new ProviderError(`OneDrive token exchange failed: ${await r.text()}`, "onedrive", r.status);
  }
  const data: any = await r.json();
  let email: string | undefined;
  let name: string | undefined;
  let providerAccountId: string | undefined;
  try {
    const me = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (me.ok) {
      const m: any = await me.json();
      email = m.mail ?? m.userPrincipalName;
      name = m.displayName;
      providerAccountId = m.id;
    }
  } catch {
    /* ignore */
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in
      ? new Date(Date.now() + Number(data.expires_in) * 1000)
      : undefined,
    scope: data.scope,
    accountEmail: email,
    accountName: name,
    providerAccountId,
  };
}

async function onedriveRefresh(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt?: Date;
}> {
  const id = env("MICROSOFT_OAUTH_CLIENT_ID");
  const sec = env("MICROSOFT_OAUTH_CLIENT_SECRET");
  if (!id || !sec) throw new ProviderNotConfiguredError("onedrive");
  const body = new URLSearchParams({
    client_id: id,
    client_secret: sec,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope: ONEDRIVE_SCOPES.join(" "),
  });
  const r = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );
  if (!r.ok) throw new ProviderError(`OneDrive refresh failed`, "onedrive", r.status);
  const d: any = await r.json();
  return {
    accessToken: d.access_token,
    expiresAt: d.expires_in
      ? new Date(Date.now() + Number(d.expires_in) * 1000)
      : undefined,
  };
}

async function onedriveList(
  token: string,
  folderId: string | null,
): Promise<CloudFolderItem[]> {
  const url = folderId
    ? `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(folderId)}/children`
    : `https://graph.microsoft.com/v1.0/me/drive/root/children`;
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new ProviderError(`OneDrive list failed: ${await r.text()}`, "onedrive", r.status);
  const d: any = await r.json();
  return (d.value ?? []).map((f: any) => ({
    id: f.id,
    name: f.name,
    kind: f.folder ? "folder" : "file",
    mimeType: f.file?.mimeType,
    size: f.size,
    modifiedAt: f.lastModifiedDateTime,
    thumbnail: f["@microsoft.graph.downloadUrl"] ? undefined : undefined,
  }));
}

async function onedriveDownload(
  token: string,
  fileId: string,
): Promise<{ stream: Readable; mimeType?: string; size?: number; filename?: string }> {
  const metaRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!metaRes.ok) {
    throw new ProviderError(`OneDrive metadata failed: ${await metaRes.text()}`, "onedrive", metaRes.status);
  }
  const meta: any = await metaRes.json();
  const downloadUrl = meta["@microsoft.graph.downloadUrl"];
  const r = await fetch(downloadUrl);
  if (!r.ok || !r.body) {
    throw new ProviderError(`OneDrive download failed`, "onedrive", r.status);
  }
  return {
    stream: Readable.fromWeb(r.body as any),
    mimeType: meta.file?.mimeType,
    size: meta.size,
    filename: meta.name,
  };
}

async function onedriveUpload(
  token: string,
  folderId: string | null,
  name: string,
  mime: string,
  data: Buffer,
): Promise<{ id: string; webUrl?: string }> {
  const url = folderId
    ? `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}:/${encodeURIComponent(name)}:/content`
    : `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(name)}:/content`;
  const r = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": mime || "application/octet-stream",
      "Content-Length": String(data.length),
    },
    body: new Uint8Array(data),
  });
  if (!r.ok) {
    throw new ProviderError(`OneDrive upload failed: ${await r.text()}`, "onedrive", r.status);
  }
  const j: any = await r.json();
  return { id: j.id, webUrl: j.webUrl };
}

// ───────────────────────── TeraBox (coming soon) ─────────────────────────
//
// TeraBox's open-platform OAuth is region-restricted and the public docs are
// sparse. Until valid credentials can be obtained, we ship a "coming soon"
// state: the provider always reports configured=false with a clear reason
// and the connect button on the frontend is disabled.

export function teraboxConfig(): ProviderConfig {
  const id = env("TERABOX_APP_KEY");
  const sec = env("TERABOX_APP_SECRET");
  if (!id || !sec) {
    return {
      configured: false,
      reason:
        "TeraBox open-platform API is region-restricted. Provide TERABOX_APP_KEY and TERABOX_APP_SECRET to enable a basic integration. Coming soon.",
    };
  }
  // We still mark as not-configured because we have not validated any TeraBox
  // endpoints, to avoid surfacing a half-working flow to users.
  return {
    configured: false,
    reason:
      "TeraBox keys detected but the integration is not yet implemented. Coming soon.",
  };
}

// ───────────────────────── Provider dispatcher ─────────────────────────

export function getProviderConfig(provider: CloudProvider): ProviderConfig {
  switch (provider) {
    case "google_drive":
      return googleConfig(true);
    case "dropbox":
      return dropboxConfig();
    case "onedrive":
      return onedriveConfig();
    case "terabox":
      return teraboxConfig();
  }
}

export const ALL_PROVIDERS: CloudProvider[] = [
  "google_drive",
  "dropbox",
  "onedrive",
  "terabox",
];

export function getAuthUrl(provider: CloudProvider, state: string): string {
  switch (provider) {
    case "google_drive":
      return googleAuthUrl({
        state,
        scopes: GOOGLE_DRIVE_SCOPES,
        redirectUri: defaultRedirectUri("google_drive"),
      });
    case "dropbox":
      return dropboxAuthUrl(state);
    case "onedrive":
      return onedriveAuthUrl(state);
    case "terabox":
      throw new ProviderNotConfiguredError("terabox");
  }
}

export async function exchangeCode(
  provider: CloudProvider,
  code: string,
): Promise<OAuthTokens> {
  switch (provider) {
    case "google_drive":
      return googleDriveCallback(code);
    case "dropbox":
      return dropboxCallback(code);
    case "onedrive":
      return onedriveCallback(code);
    case "terabox":
      throw new ProviderNotConfiguredError("terabox");
  }
}

async function refreshTokens(
  provider: CloudProvider,
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt?: Date }> {
  switch (provider) {
    case "google_drive":
      return googleRefresh(refreshToken);
    case "dropbox":
      return dropboxRefresh(refreshToken);
    case "onedrive":
      return onedriveRefresh(refreshToken);
    case "terabox":
      throw new ProviderNotConfiguredError("terabox");
  }
}

export async function persistConnection(
  userId: number,
  provider: CloudProvider,
  tokens: OAuthTokens,
): Promise<void> {
  await db
    .insert(userConnectionsTable)
    .values({
      userId,
      provider,
      providerAccountId: tokens.providerAccountId ?? null,
      accountEmail: tokens.accountEmail ?? null,
      accountName: tokens.accountName ?? null,
      accessTokenEnc: encryptString(tokens.accessToken),
      refreshTokenEnc: tokens.refreshToken ? encryptString(tokens.refreshToken) : null,
      tokenExpiresAt: tokens.expiresAt ?? null,
      scope: tokens.scope ?? null,
    })
    .onConflictDoUpdate({
      target: [userConnectionsTable.userId, userConnectionsTable.provider],
      set: {
        providerAccountId: tokens.providerAccountId ?? null,
        accountEmail: tokens.accountEmail ?? null,
        accountName: tokens.accountName ?? null,
        accessTokenEnc: encryptString(tokens.accessToken),
        refreshTokenEnc: tokens.refreshToken ? encryptString(tokens.refreshToken) : null,
        tokenExpiresAt: tokens.expiresAt ?? null,
        scope: tokens.scope ?? null,
        updatedAt: new Date(),
      },
    });
}

export async function getConnection(
  userId: number,
  provider: CloudProvider,
): Promise<UserConnection | null> {
  const [row] = await db
    .select()
    .from(userConnectionsTable)
    .where(
      and(
        eq(userConnectionsTable.userId, userId),
        eq(userConnectionsTable.provider, provider),
      ),
    );
  return row ?? null;
}

export async function getValidAccessToken(
  userId: number,
  provider: CloudProvider,
): Promise<string> {
  const conn = await getConnection(userId, provider);
  if (!conn) throw new ProviderError("Not connected", provider, 404);
  // Refresh if expired or expiring within 60s.
  if (
    conn.tokenExpiresAt &&
    conn.tokenExpiresAt.getTime() < Date.now() + 60_000 &&
    conn.refreshTokenEnc
  ) {
    const refreshed = await refreshTokens(
      provider,
      decryptString(conn.refreshTokenEnc),
    );
    await db
      .update(userConnectionsTable)
      .set({
        accessTokenEnc: encryptString(refreshed.accessToken),
        tokenExpiresAt: refreshed.expiresAt ?? null,
        updatedAt: new Date(),
      })
      .where(eq(userConnectionsTable.id, conn.id));
    return refreshed.accessToken;
  }
  return decryptString(conn.accessTokenEnc);
}

export async function disconnectProvider(
  userId: number,
  provider: CloudProvider,
): Promise<void> {
  await db
    .delete(userConnectionsTable)
    .where(
      and(
        eq(userConnectionsTable.userId, userId),
        eq(userConnectionsTable.provider, provider),
      ),
    );
}

export async function listProviderFolder(
  userId: number,
  provider: CloudProvider,
  folderId: string | null,
): Promise<CloudFolderItem[]> {
  const token = await getValidAccessToken(userId, provider);
  switch (provider) {
    case "google_drive":
      return googleDriveList(token, folderId);
    case "dropbox":
      return dropboxList(token, folderId);
    case "onedrive":
      return onedriveList(token, folderId);
    case "terabox":
      throw new ProviderNotConfiguredError("terabox");
  }
}

export async function downloadProviderFile(
  userId: number,
  provider: CloudProvider,
  fileId: string,
): Promise<{ stream: Readable; mimeType?: string; size?: number; filename?: string }> {
  const token = await getValidAccessToken(userId, provider);
  switch (provider) {
    case "google_drive":
      return googleDriveDownload(token, fileId);
    case "dropbox":
      return dropboxDownload(token, fileId);
    case "onedrive":
      return onedriveDownload(token, fileId);
    case "terabox":
      throw new ProviderNotConfiguredError("terabox");
  }
}

export async function uploadProviderFile(
  userId: number,
  provider: CloudProvider,
  folderId: string | null,
  name: string,
  mime: string,
  data: Buffer,
): Promise<{ id: string; webUrl?: string }> {
  const token = await getValidAccessToken(userId, provider);
  switch (provider) {
    case "google_drive":
      return googleDriveUpload(token, folderId, name, mime, data);
    case "dropbox":
      return dropboxUpload(token, folderId, name, mime, data);
    case "onedrive":
      return onedriveUpload(token, folderId, name, mime, data);
    case "terabox":
      throw new ProviderNotConfiguredError("terabox");
  }
}

import nodemailer, { type Transporter } from "nodemailer";
import { logger } from "./logger";

let cachedTransport: Transporter | null = null;

function buildTransport(): Transporter | null {
  const host = process.env["SMTP_HOST"];
  const port = process.env["SMTP_PORT"];
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];
  if (!host || !port || !user || !pass) return null;
  cachedTransport ??= nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });
  return cachedTransport;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send a transactional email.
 *
 * SMTP is optional in development. When SMTP_* env vars are absent the
 * message is logged to the server console with the action link visible so
 * developers can still complete signup/reset flows. In production, missing
 * SMTP config is an error.
 */
export async function sendMail(msg: MailMessage): Promise<void> {
  const transport = buildTransport();
  const from = process.env["SMTP_FROM"] ?? "AI Video Editor <noreply@example.com>";
  if (!transport) {
    if (process.env["NODE_ENV"] === "production") {
      throw new Error(
        "SMTP not configured (SMTP_HOST/PORT/USER/PASS missing). Cannot send transactional email in production.",
      );
    }
    logger.warn(
      { to: msg.to, subject: msg.subject, body: msg.text },
      "[email:dev-fallback] SMTP not configured — printing email to server log instead",
    );
    return;
  }
  await transport.sendMail({
    from,
    to: msg.to,
    subject: msg.subject,
    text: msg.text,
    html: msg.html,
  });
}

export function getPublicBaseUrl(): string {
  const explicit = process.env["PUBLIC_BASE_URL"];
  if (explicit) return explicit.replace(/\/+$/, "");
  const dev = process.env["REPLIT_DEV_DOMAIN"];
  if (dev) return `https://${dev}`;
  return "http://localhost:5000";
}

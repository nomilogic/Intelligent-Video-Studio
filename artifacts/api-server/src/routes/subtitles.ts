import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";
import { z } from "zod/v4";
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import { requireAuth, requireDiamonds } from "../middlewares/auth";

/**
 * SSRF guard for user-supplied http(s) URLs. Resolves the hostname and
 * rejects anything pointing at a private / loopback / link-local /
 * cloud-metadata address, plus rejects non-default ports and
 * non-http(s) schemes outright. Throws an Error with a user-safe
 * message on any policy violation.
 */
async function assertSafePublicUrl(rawUrl: string): Promise<URL> {
  const u = new URL(rawUrl);
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed");
  }
  // Reject explicit credentials in the URL.
  if (u.username || u.password) {
    throw new Error("Credentials in URL are not allowed");
  }
  // Reject odd ports — only standard 80/443 are allowed.
  if (u.port && u.port !== "80" && u.port !== "443") {
    throw new Error("Only ports 80 and 443 are allowed");
  }
  // Resolve all A/AAAA records and reject any private range.
  const hostname = u.hostname;
  // If the hostname is itself a literal IP, validate it directly; otherwise
  // resolve via DNS and check every returned address.
  const literal = isIP(hostname);
  const addresses: { address: string; family: number }[] = literal
    ? [{ address: hostname, family: literal }]
    : await dnsLookup(hostname, { all: true });
  for (const a of addresses) {
    if (isPrivateAddress(a.address)) {
      throw new Error("URL resolves to a non-public address");
    }
  }
  return u;
}

function isPrivateAddress(addr: string): boolean {
  // IPv4 ranges
  if (isIP(addr) === 4) {
    const parts = addr.split(".").map(Number);
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
    const [a, b] = parts as [number, number, number, number];
    if (a === 10) return true;                       // 10.0.0.0/8
    if (a === 127) return true;                      // loopback
    if (a === 0) return true;                        // 0.0.0.0/8
    if (a === 169 && b === 254) return true;         // link-local + AWS metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
    if (a === 192 && b === 168) return true;          // 192.168/16
    if (a === 192 && b === 0) return true;            // 192.0.0.0/24 incl 192.0.2 docs
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
    if (a >= 224) return true;                       // multicast / reserved
    return false;
  }
  // IPv6 — block loopback / link-local / unique-local + IPv4-mapped private
  const lower = addr.toLowerCase();
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("fe80:")) return true;       // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA
  if (lower.startsWith("ff")) return true;          // multicast
  // IPv4-mapped (::ffff:a.b.c.d) — check the embedded v4
  const m = lower.match(/^::ffff:([0-9.]+)$/);
  if (m && isPrivateAddress(m[1]!)) return true;
  return false;
}

const router = Router();

const GenerateBody = z.object({
  // URL of the audio/video clip to transcribe. May be a publicly fetchable URL,
  // a data URL, or a path under /api/cloud/.../download/ (in which case we
  // forward the user's session cookie).
  src: z.string().min(1),
  language: z.string().optional(),
  startOffset: z.number().min(0).optional(),
  // Optional duration cap (seconds) so very long videos don't run away.
  maxDuration: z.number().min(0).optional(),
  // Where on the timeline to place the resulting captions.
  trackIndex: z.number().int().nonnegative().optional(),
});

const SYSTEM_PROMPT = `You are an expert speech-to-text transcriber. Listen to the supplied audio carefully and return SRT-like timed segments as STRICT JSON.

Output schema:
{
  "segments": [
    { "start": 0.0, "end": 2.4, "text": "Welcome to the show." },
    ...
  ],
  "language": "en"
}

Rules:
- Each segment is 1–8 seconds long.
- Use natural sentence breaks; never split mid-word.
- Use punctuation and capitalization.
- Times are seconds with up to one decimal.
- Return ONLY the JSON, no markdown.
`;

router.post(
  "/subtitles/generate",
  requireAuth,
  requireDiamonds("auto_subtitles"),
  async (req, res) => {
    const body = GenerateBody.parse(req.body);

    // Fetch the audio bytes. We support http(s):// and data: URLs only here
    // for safety — never let a user trigger fetches against arbitrary local
    // resources. (Cloud-imported files should be downloaded by the client
    // first or assigned a public URL in advance.)
    let bytes: Buffer;
    let mimeType = "audio/mpeg";
    try {
      if (body.src.startsWith("data:")) {
        const m = body.src.match(/^data:([^;]+);base64,(.*)$/);
        if (!m) throw new Error("Invalid data URL");
        mimeType = m[1]!;
        bytes = Buffer.from(m[2]!, "base64");
      } else if (/^https?:\/\//.test(body.src)) {
        // SSRF guard — refuse to fetch private/loopback/metadata addresses.
        const safeUrl = await assertSafePublicUrl(body.src);
        const r = await fetch(safeUrl.toString(), { redirect: "error" });
        if (!r.ok) throw new Error(`Source fetch failed: ${r.status}`);
        const ct = r.headers.get("content-type");
        if (ct) mimeType = ct.split(";")[0]!.trim();
        bytes = Buffer.from(await r.arrayBuffer());
      } else {
        res.status(400).json({ error: "Unsupported src URL scheme" });
        return;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(400).json({ error: `Failed to load audio: ${msg}` });
      return;
    }

    // Cap at 25 MB (~25 min of mp3 at 128kbps) to keep Gemini happy.
    if (bytes.length > 25 * 1024 * 1024) {
      res.status(413).json({
        error: "Audio too large for transcription. Max 25MB; trim the clip first.",
      });
      return;
    }

    try {
      const langHint = body.language
        ? `\nTranscribe in ${body.language}.`
        : "";
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: `Please transcribe this audio.${langHint}` },
              {
                inlineData: {
                  mimeType,
                  data: bytes.toString("base64"),
                },
              },
            ],
          },
        ],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
          temperature: 0.2,
        },
      });

      interface RawSegment { start?: unknown; end?: unknown; text?: unknown }
      interface ParsedTranscript { segments?: RawSegment[]; language?: unknown }
      interface CleanSegment { start: number; end: number; text: string }
      const content = response.text ?? "{}";
      let parsed: ParsedTranscript;
      try {
        parsed = JSON.parse(content) as ParsedTranscript;
      } catch {
        const m = content.match(/\{[\s\S]*\}/);
        parsed = m ? (JSON.parse(m[0]) as ParsedTranscript) : { segments: [] };
      }
      const rawSegments: RawSegment[] = Array.isArray(parsed.segments)
        ? parsed.segments
        : [];
      const offset = body.startOffset ?? 0;
      const cleaned: CleanSegment[] = rawSegments
        .map((s): CleanSegment => ({
          start: Math.max(0, Number(s.start) || 0) + offset,
          end: Math.max(0, Number(s.end) || 0) + offset,
          text: String(s.text ?? "").trim(),
        }))
        .filter((s) => s.text && s.end > s.start)
        .filter((s) =>
          body.maxDuration ? s.start - offset < body.maxDuration : true,
        );

      res.json({
        segments: cleaned,
        language:
          typeof parsed.language === "string"
            ? parsed.language
            : body.language ?? "en",
        trackIndex: body.trackIndex ?? 0,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      req.log?.error({ err }, "subtitles failed");
      res.status(500).json({ error: msg || "Subtitle generation failed" });
    }
  },
);

export default router;

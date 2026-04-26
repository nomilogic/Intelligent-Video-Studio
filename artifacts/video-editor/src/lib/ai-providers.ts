/**
 * Bring-Your-Own-API-Key AI providers.
 *
 * Keys are stored in `localStorage` under `AI_KEYS_STORAGE_KEY`. Calls run
 * **client-side** so the user's key never touches the Replit server.
 *
 * Special case: `provider === "replit"` falls back to the existing
 * `/api/ai/process-instruction` endpoint (Gemini via Replit AI Integrations).
 *
 * Each provider exposes a single `generateOps(prompt, schemaMd, currentState)`
 * function that returns the model's raw text — the caller is expected to
 * `JSON.parse` it (the schema markdown instructs the model to reply with JSON
 * `{ "operations": [...], "explanation": "…" }`).
 *
 * Add a new provider by:
 *   1. Adding it to `PROVIDERS`.
 *   2. Implementing a `callXxx()` function that posts to that provider's chat API.
 *   3. Wiring it into the `generateWithProvider()` switch.
 */

export type AiProviderId =
  | "replit"
  | "gemini"
  | "openai"
  | "groq"
  | "huggingface"
  | "pollinations";

export interface AiProvider {
  id: AiProviderId;
  label: string;
  /** Default model name preselected in the dialog. */
  defaultModel: string;
  /** A few suggested models — the user can also type their own. */
  modelSuggestions: string[];
  /** Whether the provider needs an API key (Pollinations is keyless). */
  needsKey: boolean;
  /** Where the key is obtained (shown as a help link in the dialog). */
  keyHelpUrl?: string;
  /** Friendly description for the dialog. */
  description: string;
}

export const PROVIDERS: AiProvider[] = [
  {
    id: "replit",
    label: "Replit (default)",
    defaultModel: "gemini-2.5-flash",
    modelSuggestions: ["gemini-2.5-flash", "gemini-2.5-pro"],
    needsKey: false,
    description: "Routes through your Replit AI integration. No extra key required.",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    defaultModel: "gemini-2.5-flash",
    modelSuggestions: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash"],
    needsKey: true,
    keyHelpUrl: "https://aistudio.google.com/apikey",
    description: "Use your own Gemini API key from Google AI Studio.",
  },
  {
    id: "openai",
    label: "OpenAI",
    defaultModel: "gpt-4o-mini",
    modelSuggestions: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
    needsKey: true,
    keyHelpUrl: "https://platform.openai.com/api-keys",
    description: "Use your OpenAI API key.",
  },
  {
    id: "groq",
    label: "Groq",
    defaultModel: "llama-3.3-70b-versatile",
    modelSuggestions: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    needsKey: true,
    keyHelpUrl: "https://console.groq.com/keys",
    description: "Lightning-fast inference. Get a free key from console.groq.com.",
  },
  {
    id: "huggingface",
    label: "HuggingFace",
    defaultModel: "meta-llama/Meta-Llama-3-8B-Instruct",
    modelSuggestions: ["meta-llama/Meta-Llama-3-8B-Instruct", "mistralai/Mistral-7B-Instruct-v0.3"],
    needsKey: true,
    keyHelpUrl: "https://huggingface.co/settings/tokens",
    description: "Use your HF Inference API token.",
  },
  {
    id: "pollinations",
    label: "Pollinations (free)",
    defaultModel: "openai",
    modelSuggestions: ["openai", "mistral", "llama"],
    needsKey: false,
    keyHelpUrl: "https://pollinations.ai",
    description: "Free, keyless. Best for quick experiments — quality varies.",
  },
];

export const AI_KEYS_STORAGE_KEY = "video-editor-ai-keys-v1";

export interface AiKeysConfig {
  /** Currently active provider. */
  provider: AiProviderId;
  /** Model name for the active provider (defaults to provider.defaultModel). */
  model: string;
  /** Per-provider API keys. Pollinations / Replit don't need a key. */
  keys: Partial<Record<AiProviderId, string>>;
}

const DEFAULT_CONFIG: AiKeysConfig = {
  provider: "replit",
  model: "gemini-2.5-flash",
  keys: {},
};

export function loadAiKeys(): AiKeysConfig {
  try {
    const raw = localStorage.getItem(AI_KEYS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw) as Partial<AiKeysConfig>;
    return {
      provider: (parsed.provider ?? "replit") as AiProviderId,
      model: parsed.model ?? "gemini-2.5-flash",
      keys: parsed.keys ?? {},
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveAiKeys(cfg: AiKeysConfig): void {
  try {
    localStorage.setItem(AI_KEYS_STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    /* localStorage may be disabled / full — silent. */
  }
}

/** Result a provider call resolves to. */
export interface AiCallResult {
  text: string;
}

/* ────────────────────── per-provider implementations ────────────────── */

async function callOpenAI(apiKey: string, model: string, prompt: string): Promise<AiCallResult> {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You are a video-editor assistant. Always respond with valid JSON matching the schema in the prompt." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return { text: data.choices?.[0]?.message?.content ?? "" };
}

async function callGroq(apiKey: string, model: string, prompt: string): Promise<AiCallResult> {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You are a video-editor assistant. Respond with valid JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) throw new Error(`Groq ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return { text: data.choices?.[0]?.message?.content ?? "" };
}

async function callGemini(apiKey: string, model: string, prompt: string): Promise<AiCallResult> {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
      }),
    },
  );
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${await r.text()}`);
  const data = await r.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  return { text };
}

async function callHuggingFace(apiKey: string, model: string, prompt: string): Promise<AiCallResult> {
  const r = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { max_new_tokens: 1500, temperature: 0.4, return_full_text: false },
    }),
  });
  if (!r.ok) throw new Error(`HuggingFace ${r.status}: ${await r.text()}`);
  const data = await r.json();
  const text = Array.isArray(data) ? (data[0]?.generated_text ?? "") : (data.generated_text ?? "");
  return { text };
}

async function callPollinations(model: string, prompt: string): Promise<AiCallResult> {
  // Pollinations is a free public proxy — POST to /openai for chat-compatible.
  const r = await fetch("https://text.pollinations.ai/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You are a video-editor assistant. Respond with valid JSON only — no prose." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
    }),
  });
  if (!r.ok) throw new Error(`Pollinations ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return { text: data.choices?.[0]?.message?.content ?? "" };
}

/**
 * Dispatch a chat completion to the configured provider. Caller is
 * responsible for `JSON.parse`-ing `result.text`.
 */
export async function generateWithProvider(
  cfg: AiKeysConfig,
  prompt: string,
): Promise<AiCallResult> {
  const provider = PROVIDERS.find((p) => p.id === cfg.provider);
  if (!provider) throw new Error(`Unknown provider: ${cfg.provider}`);

  const key = cfg.keys[cfg.provider];
  if (provider.needsKey && !key) {
    throw new Error(`No API key set for ${provider.label}. Open Settings → AI Providers to add one.`);
  }

  const model = cfg.model || provider.defaultModel;

  switch (cfg.provider) {
    case "openai":      return callOpenAI(key!, model, prompt);
    case "groq":        return callGroq(key!, model, prompt);
    case "gemini":      return callGemini(key!, model, prompt);
    case "huggingface": return callHuggingFace(key!, model, prompt);
    case "pollinations":return callPollinations(model, prompt);
    case "replit":
      throw new Error("Replit provider should use the existing /api/ai endpoint, not generateWithProvider().");
  }
}

/* ────────────────────── Pollinations free image gen ─────────────────── */

/**
 * Pollinations free text-to-image. Returns a URL that points at an image
 * generated server-side — no key required.
 */
export function pollinationsImageUrl(
  prompt: string,
  opts: { width?: number; height?: number; seed?: number; nologo?: boolean; model?: string } = {},
): string {
  const { width = 1024, height = 1024, seed = Math.floor(Math.random() * 1_000_000), nologo = true, model = "flux" } = opts;
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    seed: String(seed),
    nologo: String(nologo),
    model,
  });
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
}

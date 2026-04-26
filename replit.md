# AI Video Editor

## Overview

A professional browser-based video editor with AI instruction processing, multi-track timeline, canvas composition, keyframe animation, and full clip property controls — similar to CapCut/After Effects.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/video-editor)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM (lib/db)
- **Validation**: Zod (zod/v4), drizzle-zod
- **API codegen**: Orval (from OpenAPI spec)
- **AI Integration**: Gemini 2.5 Flash via Replit AI Integrations
- **Build**: esbuild (CJS bundle for API), Vite (for frontend)

## Architecture

### Frontend (artifacts/video-editor)
- Single-page video editor layout
- `useReducer` for editor state management
- Components: Toolbar, MediaPanel, Canvas, PropertiesInspector, Timeline, AIInstructionBar
- Wouter for routing (single route at `/`)

### Editor State
- `clips[]` — video/media clips with full canvas + timeline properties (cropX/Y/Width/Height for visual cropping)
- `transitions[]` — transitions between clips
- `keyframes[]` — per-property animation keyframes
- `tracks[]` — named track lanes in the timeline
- `markers[]` — colored ruler markers (id, time, label, color)
- `tool` — `"select" | "blade"` for the timeline tool mode

### CapCut-Style Features
- **Per-clip Transition In** (`transitionIn: { type, duration }`) — Fade, Slide L/R/U/D, Zoom, Blur, Wipe. During the first `duration` seconds of a clip, if a previous clip on the same track ends within ~0.1s, that prev clip is "ghost-rendered" with the outgoing side of the same transition. No timeline overlap required. UI: Anim tab → "Transition In" section.
- **Stackable Visual Effects** (`effects: Effect[]` per clip) — Vignette (radial dark gradient), Glow (color drop-shadow), Shake (deterministic sin/cos wobble), Scanlines (horizontal line overlay), Tint (color blend), Soft Blur. Each effect has 0–1 intensity; tint/glow take a color. UI: Effects tab → "Visual Effects" section (chips toggle, intensity slider per active effect).
- **Per-clip Mask** (`mask: ClipMask` on any clip type — text/image/video/etc.) — Pick a mask image (built-in presets: Circle, Rounded, Heart, Star, Fade ↓/→, Radial, Vignette, or upload your own). Modes: `alpha` (use the image's transparency) or `luminance` (use grayscale: white = visible, black = hidden, supports gradient masks). Controls: invert, fit (stretch/contain/cover), scale, X/Y offset, opacity. Preview uses CSS `mask-image` with `mask-mode`; export uses an offscreen canvas with `destination-in` compositing on a per-clip prepared alpha (luminance computed via Rec.601). UI: Effects tab → "Mask" section.
- **Text auto-scale toggle** (`textAutoScale: boolean` on text clips, default true) — Controls whether resizing the text clip's box scales the text along with it (true, font in `cqw` of the clip) or only the box and the text stays at a fixed canvas-relative size (false, font in `calc(var(--canvas-w) * fontSize / 1000)`). Same behavior in preview and export. UI: Text tab → "Resize scales text" checkbox.
- **Project Templates** (`lib/templates.ts`) — 4 starter layouts (Social Reel 9:16, Photo Slideshow 16:9, Square Promo 1:1, Cinematic Title 16:9). Apply via Media panel → Templates tab. Replaces timeline + canvas size while preserving the user's imported assets, zoom, and AI history. Slots are blank color blocks that the user replaces with their own media.
- Both transitions and effects render identically in the live canvas preview AND the export pipeline (`use-export.ts`), so what you see is what you save.

### Pro Features
- **Video playback** — frame-accurate seek when paused (drift threshold 0.03s), permissive while playing (0.25s). videoTime correctly maps timeline → source via `trimStart + localTime * speed`.
- **On-canvas transform** — anchor-based resize keeps the opposite edge/corner pinned (no position drift). Per-clip **Lock Ratio** toggle (link icon in Inspector header), Shift = one-off ratio lock, Alt = scale from center. Inspector W/H sliders also obey the ratio lock.
- **Visual cropping** — `cropX/Y/Width/Height` (0-1) zoom into a region of any video/image clip. Includes an **on-canvas crop tool** (C key or "Crop on Canvas" button): dimmed surround, draggable crop rectangle with 8 resize handles, rule-of-thirds overlay, drag inside to pan, Esc/Done to exit.
- **Pro splitting** — Blade tool (B): click any clip to split at cursor. Split @ (S): split at playhead. Split into N parts and Split every N seconds in the inspector.
- **Pro timeline** — Audio waveforms (decoded with Web Audio API and cached), draggable zoom slider (0.1x–10x), frame ticks at high zoom, live frame counter, Shift+click ruler to add markers, blade hover indicator, snap to clips/markers/playhead.
- **Ripple delete** — Shift+Delete removes a clip and shifts later clips left to close the gap.
- **Markers** — M to add at playhead, click to jump, right-click to delete, full list in the project sidebar.
- **Aspect ratios** — 14 presets (TikTok, Reels, YouTube Short, FB Cover, IG Post, Pinterest, Cinema, Ultrawide, etc.) plus a Rotate Canvas swap button. Custom width/height inputs always available.
- **Keyboard shortcuts** — Space/play, S/split, B/blade, V/select, M/marker, J/K/L scrub, ←/→ frame step, Shift+Del ripple, ⌘D dupe, ⌘Z/Y undo/redo, +/- zoom.

### Backend (artifacts/api-server)
- `GET/POST /api/projects` — project CRUD
- `GET/PUT/DELETE /api/projects/:id` — single project
- `POST /api/ai/process-instruction` — AI instruction → JSON operations

### AI Pipeline
1. User types natural language instruction in the AI bar
2. Backend sends to OpenAI with a structured system prompt defining all operation types
3. Returns JSON array of operations (addClip, cutClip, cropClip, moveClip, setAnimation, etc.)
4. Frontend reducer applies operations to editor state

### Database
- `projects` table — stores editor state as JSON string with canvas metadata

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Editor Operations (via AI or reducers)

- `addClip`, `cutClip`, `trimClip`, `cropClip`
- `moveClip`, `resizeClip`, `setOpacity`, `setRotation`
- `setAnimation`, `addTransition`, `setKeyframe`
- `setBlendMode`, `setVolume`, `deleteClip`
- `setCanvasSize`, `setDuration`

## Environment Variables Required

- `DATABASE_URL` — PostgreSQL connection string
- `AI_INTEGRATIONS_GEMINI_BASE_URL` — Replit AI proxy base URL
- `AI_INTEGRATIONS_GEMINI_API_KEY` — Replit AI proxy key
- `SESSION_SECRET` — Session secret

## Phase-1 Updates (April 2026)

- **Blue-frame export glitch fixed.** Default clip color was `#3b82f6` (a bright blue used as a chip swatch) and the export's blank-clip fallback painted that color onto the frame, causing visible blue frames at clip boundaries during transitions. Reducer / templates / MediaPanel defaults switched to `#1f1f24` (canvas-grey). Export now paints the blank-clip fallback as **transparent** (no fill, no label) so seams between clips never flash a solid color.
- **Smaller export resolutions.** `Resolution` type extended with `360p`, `240p`, `144p`, and `quarter`. `computeScale` in `use-export.ts` derives the scale from the source canvas height for each tier. ExportDialog now lists Full / 720p / 480p / 360p / 240p / 144p / Half / Quarter.
- **Per-mask depth control.** Added `maskAffectsTracksBelow?: number` to `Clip`. Default `0` = "all tracks below" (legacy). Numeric value N restricts the cutout to the N tracks immediately beneath the mask layer. Applied in both the live preview (`Canvas.tsx → clipMaskStyle(clip)` builds a per-clip CSS mask SVG that only includes mask layers in reach of that clip's track) and the export pipeline (`use-export.ts → DrawBatch grouping by mask signature`).
- **Per-clip mask compositing.** The Canvas no longer wraps the entire media composite in a single global CSS mask. Each media clip with at least one mask in reach is wrapped in its own canvas-sized mask box (`pointer-events-none` on the wrapper, `auto` on the inner content so clips remain selectable). Clips outside the depth window render unmasked.
- **Universal Canvas Fit & Align section.** New `CanvasFitAlignSection` in `PropertiesInspector.tsx` replaces the old video/image-only "Canvas Fit" buttons. Works on every transformable clip type (video, image, text, color, mask layer, blur, shape, …). Provides icon-based Fill / Fit / Cover / Reset actions plus a 3×3 alignment grid that snaps the clip's bounding rect to canvas corners/edges/center while preserving size.
- **Icon-based mask fit.** The Mask section's "Fit" dropdown was replaced with an icon row (Stretch / Fit / Cover) matching the universal section's visual language. Mask Layer clips additionally show a numeric "Affects tracks below" input bound to `maskAffectsTracksBelow`.

## Phase-2 Updates (April 2026)

- **GIF export.** New `exportGif()` branch in `use-export.ts` using the `gifenc` package (palette quantization via `quantize()` + `applyPalette()`, frame writing via `GIFEncoder.writeFrame()`). `Format` extended to `"mp4" | "webm" | "gif"`; `ExportDialog.tsx` exposes the new option. Output bytes are copied into a fresh `ArrayBuffer` before wrapping in a `Blob` to satisfy strict TS BlobPart typing.
- **Shape Library (50).** `lib/shape-library.ts` defines 50 named SVG shapes (basic, geometric, arrows, callouts, decorative). Each entry stores raw inner SVG markup in a 100×100 viewBox plus a category. New `mediaType: "shape"` clip carries `shapeKind`, `fill: Fill`, `strokeColor`, `strokeWidth`. Live preview renders an inline `<svg>`; export rasterizes the SVG to an HTMLImageElement via the `rasterizeShape()` helper (supports linear & radial gradient defs through `buildGradientDefs()`).
- **Font Library (~52).** `FONT_OPTIONS` in `types.ts` extended with ~30 additional Google Font families covering display, script, mono, and decorative styles. Font CSS preloaded so they render immediately in both preview and export.
- **Effect Library (50+).** `lib/effect-library.ts` exports `EFFECT_LIBRARY` (50+ entries grouped by `EFFECT_CATEGORIES`: Vignette, Light, Texture, Color, Distort, Stylize, Blur, Glitch). Render branches added in both `Canvas.tsx` (CSS overlays + filters) and `use-export.ts` (canvas 2d operations). PropertiesInspector renders effects grouped by category with a scrollable grid.
- **Transition Library (50).** `lib/transition-library.ts` exports `TRANSITION_LIBRARY` (50 transitions: fades, slides, wipes, zooms, geometric, shape-mask, glitch). Transition selection in inspector groups options by category. Animation pipeline (`animation.ts`) and export pipeline both honor the new transition kinds.
- **Template Library (50).** `lib/templates.ts` keeps 4 hand-crafted templates plus 46 procedurally-built entries via `buildTitleTpl()`, `buildSlideshowTpl()`, and `buildLowerThirdTpl()` factories. Mix of 9:16 vertical, 1:1 square, and 16:9 landscape covering social, marketing, education, news, vlog, podcast, ecommerce, and cinematic use cases.
- **Special Layers (50).** `lib/special-layers.ts` exports `SPECIAL_LAYERS` — 50 cinematic overlay presets (light leaks, grain, vignette family, color grades, geometry overlays, atmosphere). New `mediaType: "specialLayer"` clip with `specialKind`, `specialIntensity`, `specialColor`. Each preset has a default blend mode (e.g. `screen` for light leaks). MediaPanel exposes them in a category-grouped grid; inspector lets users tweak intensity & tint after adding.
- **Custom Library (localStorage).** `lib/custom-library.ts` provides `loadPresets()`, `savePreset()`, `deletePreset()`, `renamePreset()`, `presetToClipPatch()`. `CustomPreset` shape: `{ id, name, savedAt, data: Partial<Clip> }`. Inspector's new "Saved Presets" section lets users name and save the current clip's styling fields (`PRESET_FIELDS`); MediaPanel's new "Saved" tab lists all presets and clicking one drops a fresh clip carrying that styling onto the timeline.
- **AI Control Schema.** `lib/ai-schema.ts` exports `AI_SCHEMA`, `AI_ACTIONS`, `buildAiSchema()`, and `buildAiSchemaMarkdown()` — a single source of truth listing every effect, transition, shape, special layer, template, font and reducer action with their parameters. `AIInstructionBar.tsx` prepends the schema markdown to every user prompt so Gemini knows the full library catalog when emitting operations.
- **Color & Gradient Picker.** New `components/ColorGradientPicker.tsx` — fully controlled solid / linear / radial gradient editor. Toggles between modes (preserves stops when flipping), supports angle for linear, cx/cy/r for radial, and add/remove/edit color stops. Wired into PropertiesInspector's `ShapeSection` for the shape clip's Fill field. The `Fill` discriminated union is rendered identically in both Canvas preview (via SVG `<linearGradient>` / `<radialGradient>` defs) and the export pipeline.

## Phase-3 Updates (April 2026)

- **Slider snapping.** `components/ui/slider.tsx` now defaults to even-step snapping (0, 2, 4, …, max) when no explicit `step` is provided. All existing callers benefit automatically.
- **Font Library (50+).** `lib/font-library.ts` exports a curated list of 50 Google fonts. The CSS `<link>` is injected once at app boot so all fonts are available across preview & export without per-clip loading.
- **Text Presets (100).** `lib/text-presets.ts` ships 100 categorized text style presets (color, gradient, glow, shadow, stroke combos). Rendered as a category-filtered grid in the MediaPanel "Text" tab.
- **Effect Library +100.** `lib/effect-library.ts` extended with 100 new entries spanning Color Grading, Light, Distort, Texture, Stylized, and Cinematic categories. Render branches added in `lib/animation.ts` (CSS-filter only, no shaders); export uses the same `getEffectImpact()` pipeline so preview = export.
- **Draw tool.** New `tool: "draw"` mode plus `mediaType: "drawing"` clip with `paths: { id, color, width, opacity, kind, points }[]`. Draw overlay sits above the canvas when active and captures pointer strokes (normalized 0..1 coords). 4 brush presets in `lib/draw-library.ts` (Marker / Pencil / Highlighter / Neon). Rendered as inline SVG in preview, replayed via Canvas2D `stroke()` in export. Brush picker popover in the Timeline tool toggle.
- **Asset Libraries.** New `/api/assets/search?provider=...&q=...` route in `artifacts/api-server/src/routes/assets.ts` proxies Giphy, Pexels (require server `GIPHY_API_KEY` / `PEXELS_API_KEY`), Iconify (keyless), and Lottiefiles (keyless with fallback). MediaPanel "Assets" tab: provider switcher + search + 2-col results grid; clicking a result drops it as an `image` clip with an optional `assetKind` hint (`"lottie" | "icon"`).
- **BYO AI Keys.** `lib/ai-providers.ts` defines six providers (Replit / Gemini / OpenAI / Groq / Pollinations / HuggingFace) plus a keyless Pollinations image-URL helper. `components/SettingsDialog.tsx` (gear icon in the Toolbar) lets users paste API keys + pick models. Keys persist in `localStorage["ai-keys-v1"]`. `AIInstructionBar.tsx` calls the user-selected provider client-side and only falls back to `/api/ai/process-instruction` (Gemini via Replit AI) when the "Replit (default)" provider is chosen.

## Phase-4 Updates (April 2026) — Multi-tenant platform

The single-tenant editor was transformed into a multi-user SaaS-style platform.
Anonymous use is still allowed for the editor itself, but premium actions
(export, AI when using the Replit-default provider, chroma-key, etc.) are
gated behind sign-in.

### New schema (lib/db)
- `users` (email, passwordHash via argon2, googleId, name, avatarUrl, role `user|admin`, isBanned, emailVerified)
- `sessions` (token, userId, expiresAt) — opaque session token in an HTTP-only cookie
- `email_verification_tokens`, `password_reset_tokens`, `login_grants`
- `diamond_balances` (userId, balance) — single row per user
- `diamond_transactions` (userId, delta, kind: `signup|daily|referral|purchase|spend|refund|admin_grant`, featureKey, stripeRef)
- `diamond_packages` (label, diamonds, priceCents, stripePriceId)
- `feature_flags` (key, label, requiresAuth, requiresDiamonds, costDiamonds, settings JSON)
- `user_connections` (userId, provider: `google_drive|dropbox|onedrive|terabox`, encrypted access/refresh tokens via AES-GCM)
- `referrals` (referrerId, referredUserId, grantedDiamonds)
- `admin_audit_log` (adminId, action, targetType, targetId, payload JSON)
- `projects.user_id` made **nullable** so anonymous projects keep working.

### Server foundation (artifacts/api-server/src/lib)
- `auth.ts` — argon2 password hash + verify; opaque session token gen/verify.
- `sessions.ts` — set/clear HTTP-only `sid` cookie; resolve user from cookie.
- `email.ts` — Nodemailer SMTP transport (`SMTP_HOST/PORT/USER/PASS/FROM`); dev fallback prints emails to the server log.
- `encryption.ts` — AES-256-GCM helpers using `ENCRYPTION_KEY` (base64). Used to encrypt cloud OAuth tokens at rest.
- `diamonds.ts` — atomic `grantDiamonds`, `spendDiamonds` (throws `InsufficientDiamondsError`), `purchaseDiamonds`, `refundTransaction` inside a single Drizzle transaction.
- `cloud-providers.ts` — per-provider OAuth start URL + token exchange + refresh + list/import/export helpers for Google Drive, Dropbox, OneDrive. TeraBox marked "coming soon" (UI only).
- `admin-audit.ts` — `auditAdmin(adminId, action, target, payload)` writes one row per mutation.
- `feature-flags.ts` — DB-backed flag/cost lookup with bootstrap defaults.
- Middlewares: `requireAuth`, `optionalAuth` (sets `req.user` if cookie present), `requireAdmin`, `requireDiamonds(featureKey)` (looks up cost from `feature_flags`, spends in same tx, sets `x-diamond-balance` response header).

### Server routes
- `routes/auth.ts` — `POST /signup`, `POST /login`, `POST /logout`, `GET /me`, `PATCH /me`, `GET /verify`, `POST /forgot`, `POST /reset`, `GET /google` (OAuth start), `GET /google/callback`.
- `routes/diamonds.ts` — `GET /me`, `GET /transactions`, `GET /packages`, `POST /claim-daily`, `POST /redeem-referral`, `POST /checkout` (Stripe Checkout Session), `POST /webhook` (Stripe → grants diamonds, idempotent on `stripeRef`).
- `routes/cloud.ts` — `GET /providers`, `GET /:provider/connect`, `GET /:provider/callback`, `POST /:provider/disconnect`, `GET /:provider/list`, `POST /:provider/import`, `POST /:provider/export`. TeraBox returns "coming soon".
- `routes/admin.ts` — dashboard stats, users CRUD with `balance` + ban toggle, projects CRUD, diamond-packages CRUD, feature-flags CRUD, transactions, audit log, analytics (daily users, daily diamonds-spent by feature). Every mutation writes an `admin_audit_log` row.
- `routes/subtitles.ts` — Gemini-powered caption generation (`POST /generate` with audio URL → returns time-stamped caption clips). Premium (auth required, costs diamonds).
- `routes/projects.ts` updated — projects scoped by `userId`; anonymous reads/writes still allowed but only for projects with `userId IS NULL`. Adds `POST /:id/duplicate`, thumbnail support.

### Bootstrap + seed
- On cold start: `bootstrap.ts` ensures the default `feature_flags` rows (export, ai_instruction, auto_subtitles, chroma_key, etc.), default `diamond_packages` (Starter / Plus / Pro), and an admin user from `ADMIN_EMAIL` + `ADMIN_PASSWORD` (argon2-hashed). Logs an `[admin-bootstrap]` line so first-cold-start visibility is obvious.

### Frontend (artifacts/video-editor)
- **Routing.** `App.tsx` rewritten on `wouter` with a base of `BASE_URL` and `AuthProvider` + `DiamondsProvider`. Routes: `/`, `/projects`, `/diamonds`, `/account`, `/editor/:id`, `/editor` (anonymous passthrough), `/verify`, `/reset`, `/oauth/callback`, `/admin/:rest*`. `GlobalModals` mounts `InsufficientDiamondsModal` and `LoginRequiredModal` (which opens `AuthModal`).
- **Auth context.** `lib/auth-context.tsx` — fetches `/auth/me` on mount, exposes `user`, `login`, `signup`, `logout`, `refresh`. Cookies are `credentials: "include"`.
- **API client.** `lib/api-client.ts` — `apiFetch<T>(path, init)` wraps `fetch` with credentials, JSON, throws typed `ApiError` (status + body), and feeds responses to `useDiamonds().applyHeaderHints` so the diamond pill stays in sync after a spend.
- **Diamonds context.** `lib/diamonds-context.tsx` — `useDiamonds()` for balance + claim-daily + insufficient/login modal helpers. `useGatedRequest()` wraps any API call so 402 → insufficient-diamonds modal, 401 → login modal.
- **Editor extracted.** `components/Editor.tsx` accepts `projectId / projectName / initialEditorState` and dispatches `REPLACE_STATE` to hydrate. `pages/EditorPage.tsx` fetches `/projects/:id`, parses the JSON state with `initialState` defaults (so older projects don't crash on missing newer fields), and handles 401/403/404. `/editor` (no id) renders an anonymous local-storage editor.
- **Toolbar.** Adds `DiamondPill` + `AccountDropdown` to the right of Save/Export. Export button gates anonymous users to `LoginRequiredModal`. AI instruction send pre-checks for the Replit provider + anonymous user and prompts sign-in instead of hitting a 401. Chroma-key toggle in the inspector also gates anonymous users.
- **Pages.** `HomePage`, `ProjectsPage` (grid: thumbnail/title/duration/last-modified, new/rename/duplicate/delete), `DiamondsPage` (packages + earn-free tab), `AccountPage` (profile + cloud Connections via `/cloud/providers` + disconnect via `POST /cloud/:provider/disconnect`), `AuthModal`, `VerifyEmailPage`, `ResetPasswordPage`, `OAuthCallbackPage`.
- **Admin panel.** `AdminLayout` with sidebar + 7 sub-pages — Dashboard (`users.{total,today,thisWeek,thisMonth}`, projects total, top users), Users (balance + Ban toggle), Projects, Diamonds (`email` field), Features (`requiresAuth`/`requiresDiamonds`/`costDiamonds`/settings record), Analytics (`dailyUsers` + `dailyDiamondsByFeature`), System.

### Environment variables (additions)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` — bootstrap admin (required)
- `ENCRYPTION_KEY` — base64 32-byte key for AES-GCM cloud-token encryption (required)
- `SESSION_SECRET` — already present; signs session tokens
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — diamond purchases
- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` — Google sign-in + Drive
- `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET` — Dropbox cloud
- `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` — OneDrive cloud
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — transactional email
- `PUBLIC_BASE_URL` — used in email links and OAuth redirect URIs

Any of the cloud/email/OAuth secrets that are missing simply mark the
provider as "Configure" in the UI rather than failing the boot — the
single-tenant editor still works without them.

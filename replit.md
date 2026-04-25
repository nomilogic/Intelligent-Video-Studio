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

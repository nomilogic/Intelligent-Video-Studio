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
- `clips[]` — video/media clips with full canvas + timeline properties
- `transitions[]` — transitions between clips
- `keyframes[]` — per-property animation keyframes
- `tracks[]` — named track lanes in the timeline

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

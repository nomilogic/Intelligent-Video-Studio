import { useProcessInstruction } from "@workspace/api-client-react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles, Loader2, Wand2, ChevronDown, ChevronUp,
  Zap, Palette, Film, Music, Star, Layers, Brush, LayoutTemplate,
} from "lucide-react";
import { EditorState, EditorAction } from "../lib/types";
import { useToast } from "@/hooks/use-toast";
import { buildAiSchemaMarkdown } from "../lib/ai-schema";
import { loadAiKeys, generateWithProvider, PROVIDERS } from "../lib/ai-providers";
import { useAuth } from "@/lib/auth-context";
import { useDiamonds } from "@/lib/diamonds-context";

const AI_SCHEMA_MD = buildAiSchemaMarkdown();

// ── Quick action categories ───────────────────────────────────────────────────
const QUICK_ACTIONS = [
  // Edit polish
  { group: "✨ Auto", label: "✨ Auto-edit", prompt: "Create a polished professional edit: add smooth fade transitions between all adjacent clips on the same track, a subtle zoom-in animation on the first clip, and a fade-out on the last clip. Apply the cinematic preset to any video clips." },
  { group: "✨ Auto", label: "🎯 Tighten up", prompt: "Remove any gaps between clips on the same track by nudging them together (update startTime so they abut). Also trim any clip longer than 8 seconds to 8s." },
  { group: "✨ Auto", label: "🔥 Make punchy", prompt: "Make the edit more dynamic: add a subtle zoomIn animationIn to each clip under 3 seconds, increase contrast to 1.2 and saturation to 1.3 on all video/image clips, and add fast 0.3s fade transitions." },

  // Looks
  { group: "🎨 Look", label: "🎬 Cinematic", prompt: "Apply the cinematic color preset to all video and image clips. Add a subtle vignette effect (type: vignette, intensity: 0.5) to the same clips. Add a film-grain special layer on track 0, startTime 0, duration matching the project duration." },
  { group: "🎨 Look", label: "📺 Vintage", prompt: "Apply the vintage preset to all video clips. Add a grain special-layer overlay spanning the full duration at 50% opacity with blend mode 'multiply'. Desaturate slightly: set filters.saturation to 0.7 on all clips." },
  { group: "🎨 Look", label: "⚫ B&W Drama", prompt: "Convert all video and image clips to black & white (filters.saturation=0). Add high contrast (filters.contrast=1.4). Add a subtle vignette effect (intensity 0.7) to each." },
  { group: "🎨 Look", label: "🌈 Vibrant Pop", prompt: "Make the edit vivid: set filters.saturation=1.6 and filters.contrast=1.1 on all clips. Add a glow effect (intensity 0.3) to any text clips. Use a bright zoomIn animation on each clip." },
  { group: "🎨 Look", label: "🌙 Moody Dark", prompt: "Apply a dark, moody look: set filters.brightness=0.8, filters.contrast=1.2 on all video clips. Add a vignette effect (intensity 0.8). Set any text clip's text color to white." },

  // Titles & Text
  { group: "📝 Titles", label: "🎬 Intro title", prompt: "Add a large centered intro title at time 0 lasting 3s with text 'My Video'. Use font 'Montserrat', fontSize 100, bold, white color. Add a zoomIn animationIn over 0.8s and a fade animationOut over 0.5s. Place it on track 0." },
  { group: "📝 Titles", label: "📺 Lower third", prompt: "Add a lower-third text clip starting at 2s for 4s. Position: x:0.02, y:0.72, width:0.6, height:0.12. Use font 'Poppins', fontSize 40, white color. Add a slideRight animationIn over 0.4s." },
  { group: "📝 Titles", label: "🏷️ Caption bar", prompt: "Add a semi-transparent caption bar: a blank clip at y:0.75, height:0.15, x:0, width:1 with color '#00000088' spanning the project duration. Add a text clip inside it for subtitles." },

  // Overlays & FX
  { group: "🌟 FX", label: "❄️ Snow overlay", prompt: "Add a particles clip (mediaType:'particles', particleKind:'snow') spanning the full duration on track 0 at x:0, y:0, width:1, height:1 with particleCount:120, particleOpacity:0.7, particleSpeed:0.3. Set blendMode:'screen'." },
  { group: "🌟 FX", label: "✨ Sparkles FX", prompt: "Add a particles clip (mediaType:'particles', particleKind:'sparkles') spanning the full duration on track 0. Set particleCount:80, particleColor:'#ffe066', particleOpacity:0.9, blendMode:'screen'." },
  { group: "🌟 FX", label: "🔥 Embers", prompt: "Add an embers particle overlay (particleKind:'embers') spanning the full duration, full canvas, blendMode:'screen', particleCount:60, particleColor:'#ff6600', particleColor2:'#ffcc00'." },
  { group: "🌟 FX", label: "💧 Rain", prompt: "Add a rain particle overlay (particleKind:'rain') spanning the full duration, blendMode:'multiply', particleCount:200, particleSpeed:0.8, particleDirection:190, particleOpacity:0.4." },
  { group: "🌟 FX", label: "🌊 Wave BG", prompt: "Add an animated wave background (mediaType:'wave') at z-order bottom — use trackIndex equal to the highest track number + 1. Use waveKind:'ocean', waveColor:'#1e3a5f', waveColor2:'#0ea5e9', spanning the full duration." },
  { group: "🌟 FX", label: "💡 Light leak", prompt: "Add a light-leak special layer (mediaType:'specialLayer', specialKind:'lightLeak') spanning the full duration on track 0 with blendMode:'screen', opacity:0.6, specialIntensity:0.7." },
  { group: "🌟 FX", label: "🎞 Film grain", prompt: "Add a film-grain special layer (specialKind:'grain') spanning the full duration on track 0. Set blendMode:'overlay', opacity:0.4, specialIntensity:0.5." },

  // Shapes & Graphics
  { group: "🔷 Shapes", label: "🔷 Logo bar", prompt: "Add a rounded-rectangle shape clip (shapeKind:'roundedRect') at x:0.02, y:0.02, width:0.2, height:0.08 on track 0. Set fill to a solid dark color '#0f172a', strokeColor:'#3b82f6', strokeWidth:2, borderRadius:8." },
  { group: "🔷 Shapes", label: "⭕ Focus ring", prompt: "Add a ring/circle shape (shapeKind:'ring') centered at x:0.35, y:0.3, width:0.3, height:0.3 with no fill (fill:{type:'solid',color:'transparent'}), strokeColor:'#ffffff', strokeWidth:3. Add a pulse scale keyframe: scale 1 at t=0, scale 1.05 at t=0.5, scale 1 at t=1." },

  // Transitions
  { group: "🔀 Transitions", label: "💫 Smooth fades", prompt: "Add a 0.5s fade transition (type:'fade', duration:0.5) to the start of every clip that has another clip ending within 0.2s before it on the same track." },
  { group: "🔀 Transitions", label: "⚡ Glitch cuts", prompt: "Set a 0.3s glitch transition on every clip. Use presetKey from the 'Glitch' category of transition presets." },
  { group: "🔀 Transitions", label: "🎠 Cinematic push", prompt: "Add a 0.6s push-left transition (use a Push-Left preset from the transitionPresets) to every video clip." },

  // Templates
  { group: "📐 Templates", label: "📱 Social Reel", prompt: "Apply the social-reel-9-16 template. Set canvas to 1080x1920." },
  { group: "📐 Templates", label: "🎬 Cinematic Title", prompt: "Apply the cinematic-title-16-9 template and set the canvas to 1920x1080." },

  // Speed / Audio
  { group: "⏩ Speed", label: "🐢 Slow-mo last", prompt: "Set the last video clip to 0.5x speed for a slow-motion effect." },
  { group: "⏩ Speed", label: "⚡ Speed ramp", prompt: "Create a speed ramp on the selected (or first) video clip: add keyframes for speed — 1.0 at startTime, 0.3 at the midpoint, 1.0 at the end." },
];

// ── Mega template builder prompts ───────────────────────────────────────────
const TEMPLATE_PROMPTS = [
  {
    label: "🚀 Product launch reel",
    prompt: `Build a complete 15-second product launch reel from scratch:
1. Set canvas to 1080x1920 (9:16 vertical).
2. Set duration to 15s.
3. Add 3 blank clips as colored section backgrounds at trackIndex 3, each 5s long (times 0,5,10). Colors: #0f172a, #1e1b4b, #0c1a2e.
4. Add a large headline text 'NEW ARRIVAL' at t=0 for 5s, centered, font Montserrat 120px bold, white, zoomIn 0.6s.
5. Add a subheading 'Shop now →' at t=3 for 2s, centered lower, font Poppins 50px, color #94a3b8, fadeIn 0.4s.
6. Add a stars particle overlay (mediaType:particles, particleKind:stars) spanning 0-15s at full canvas, blendMode:screen.
7. Add a light-leak specialLayer overlay blendMode:screen at 0.4 opacity.
8. Add a fade transition at the start of the 2nd and 3rd background clips.`
  },
  {
    label: "🎵 Music visualizer",
    prompt: `Build a music visualizer scene:
1. Set canvas to 1920x1080 (16:9).
2. Add a dark gradient background (mediaType:wave, waveKind:pulse or first available, full canvas, waveColor:#0f172a, waveColor2:#1e1b4b).
3. Add a visualizer clip (mediaType:visualizer, visualizerKind:bars) at x:0.05, y:0.5, width:0.9, height:0.4.
4. Add a particles clip (particleKind:bokeh) spanning full canvas, blendMode:screen, particleCount:60.
5. Add a centered title text 'NOW PLAYING' at top, Montserrat bold, letter spacing, fade in.`
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function AIInstructionBar({
  state,
  dispatch,
}: {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
}) {
  const [instruction, setInstruction] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [byoLoading, setByoLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string>("✨ Auto");
  const processInstruction = useProcessInstruction();
  const { toast } = useToast();
  const { user } = useAuth();
  const { promptLoginRequired } = useDiamonds();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleResult = (operations: unknown, explanation: string, promptKey: string) => {
    if (Array.isArray(operations) && operations.length > 0) {
      dispatch({ type: "APPLY_OPERATIONS", payload: operations as never });
    }
    dispatch({
      type: "ADD_AI_MESSAGE",
      payload: { id: `m-${Date.now()}-r-${promptKey}`, role: "assistant", text: explanation || "Done.", timestamp: Date.now() },
    });
    setInstruction("");
    toast({
      title: `AI applied ${(operations as unknown[] | undefined)?.length ?? 0} operation${((operations as unknown[] | undefined)?.length ?? 0) === 1 ? "" : "s"}`,
      description: explanation,
    });
  };

  const handleError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    dispatch({
      type: "ADD_AI_MESSAGE",
      payload: { id: `m-${Date.now()}-e`, role: "assistant", text: `Error: ${msg}`, timestamp: Date.now() },
    });
    toast({ title: "AI request failed", description: msg, variant: "destructive" });
  };

  const buildSlimState = () => ({
    currentTime: state.currentTime,
    duration: state.duration,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    tracks: state.tracks.map((t) => ({ id: t.id, name: t.name, type: t.type, muted: t.muted, locked: t.locked })),
    clips: state.clips.map((c) => ({
      id: c.id,
      label: c.label,
      mediaType: c.mediaType,
      trackIndex: c.trackIndex,
      startTime: c.startTime,
      duration: c.duration,
      x: c.x, y: c.y, width: c.width, height: c.height,
      rotation: c.rotation,
      scale: c.scale,
      opacity: c.opacity,
      speed: c.speed,
      blendMode: c.blendMode,
      text: c.text,
      animationIn: c.animationIn,
      animationOut: c.animationOut,
      animationInDuration: c.animationInDuration,
      animationOutDuration: c.animationOutDuration,
      transitionIn: c.transitionIn,
      effects: (c.effects ?? []).map((e) => ({ type: e.type, intensity: e.intensity })),
      specialKind: c.specialKind,
      shapeKind: c.shapeKind,
      particleKind: c.particleKind,
      waveKind: c.waveKind,
      visualizerKind: c.visualizerKind,
      animatedMask: c.animatedMask,
      muted: c.muted,
      locked: c.locked,
      hidden: c.hidden,
    })),
    selectedClipIds: state.selectedClipIds,
    keyframeCount: state.keyframes?.length ?? 0,
    markerCount: state.markers?.length ?? 0,
  });

  const RULES = `## Output rules
Reply with ONLY a raw JSON object (no markdown fences, no comments):
{"operations": [...], "explanation": "one sentence"}

- "operations" is an array of reducer actions with exact type strings from the schema.
- For UPDATE_CLIP: use {"type":"UPDATE_CLIP","payload":{"id":"<clipId>","updates":{...}}}
- For DELETE_CLIP: use {"type":"DELETE_CLIP","payload":"<clipId>"}
- For SPLIT_CLIP: use {"type":"SPLIT_CLIP","payload":{"clipId":"<id>","time":<seconds>}}
- For RIPPLE_DELETE: use {"type":"RIPPLE_DELETE","payload":"<clipId>"}
- For ADD_CLIP: include ALL required fields (id, label, mediaType, trackIndex, startTime, duration, x, y, width, height).
- New clip ids: use unique strings like "clip-<purpose>-<random3digits>".
- Coordinates: x/y/width/height are 0–1 fractions of canvas.
- "explanation" is one concise sentence describing what was done.
- Never use undefined, null for required fields. Use sensible defaults.
- Refer to clip ids from current state — do not invent ids for existing clips.

## Complex template example
User: "Add a social-media-style title card"
Output:
{"operations":[
  {"type":"ADD_CLIP","payload":{"clip":{"id":"clip-bg-001","label":"BG","mediaType":"blank","trackIndex":2,"startTime":0,"duration":5,"x":0,"y":0,"width":1,"height":1,"color":"#0f172a","opacity":1}}},
  {"type":"ADD_CLIP","payload":{"clip":{"id":"clip-title-001","label":"Title","mediaType":"text","text":"YOUR STORY","trackIndex":1,"startTime":0,"duration":5,"x":0.05,"y":0.35,"width":0.9,"height":0.2,"textStyle":{"fontFamily":"Montserrat, sans-serif","fontSize":110,"fontWeight":700,"color":"#ffffff","align":"center"},"animationIn":"zoomIn","animationInDuration":0.7}}},
  {"type":"ADD_CLIP","payload":{"clip":{"id":"clip-sub-001","label":"Subtitle","mediaType":"text","text":"A tale of two worlds","trackIndex":1,"startTime":0.5,"duration":4,"x":0.1,"y":0.57,"width":0.8,"height":0.1,"textStyle":{"fontFamily":"Poppins, sans-serif","fontSize":40,"fontWeight":300,"color":"#94a3b8","align":"center"},"animationIn":"slideUp","animationInDuration":0.4}}},
  {"type":"ADD_CLIP","payload":{"clip":{"id":"clip-particles-001","label":"Stars","mediaType":"particles","particleKind":"stars","trackIndex":0,"startTime":0,"duration":5,"x":0,"y":0,"width":1,"height":1,"blendMode":"screen","particleCount":80,"particleOpacity":0.6}}}
],"explanation":"Added a dark title card with animated heading, subtitle, and star particles."}`;

  const send = async (prompt: string) => {
    if (!prompt.trim()) return;
    const cfgPrecheck = loadAiKeys();
    if (!user && cfgPrecheck.provider === "replit") {
      promptLoginRequired({ featureKey: "ai_instruction" });
      return;
    }
    dispatch({
      type: "ADD_AI_MESSAGE",
      payload: { id: `m-${Date.now()}`, role: "user", text: prompt, timestamp: Date.now() },
    });

    const slimState = buildSlimState();
    const enriched = `${AI_SCHEMA_MD}\n\n${RULES}\n\n## Current editor state\n\`\`\`json\n${JSON.stringify(slimState, null, 2)}\n\`\`\`\n\n## User instruction\n${prompt}`;

    const cfg = loadAiKeys();
    if (cfg.provider === "replit") {
      processInstruction.mutate(
        { data: { instruction: `${AI_SCHEMA_MD}\n\n${RULES}\n\n## User instruction\n${prompt}`, currentState: JSON.stringify(slimState) } },
        {
          onSuccess: (result: any) => handleResult(result.operations, result.explanation || "Done.", "replit"),
          onError: (err: any) => handleError(err),
        },
      );
      return;
    }

    try {
      setByoLoading(true);
      const { text } = await generateWithProvider(cfg, enriched);
      const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      let parsed: { operations?: unknown[]; explanation?: string } = {};
      try { parsed = JSON.parse(cleaned); }
      catch { throw new Error(`Non-JSON response: ${cleaned.slice(0, 200)}…`); }
      handleResult(parsed.operations ?? [], parsed.explanation ?? "Done.", "byo");
    } catch (err) {
      handleError(err);
    } finally {
      setByoLoading(false);
    }
  };

  const isPending = processInstruction.isPending || byoLoading;
  const activeProvider = PROVIDERS.find((p) => p.id === loadAiKeys().provider);
  const groups = [...new Set(QUICK_ACTIONS.map((q) => q.group))];
  const visibleActions = QUICK_ACTIONS.filter((q) => q.group === activeGroup);

  return (
    <div className="border-b border-border bg-gradient-to-b from-muted/30 to-muted/10">
      <div className="p-2 flex flex-col gap-2">

        {/* ── Input row ─────────────────────────────────────── */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(instruction)}
              placeholder={`Ask ${activeProvider?.label ?? "AI"} — describe an effect, template, edit or animation…`}
              className="w-full bg-background border-border pl-9 h-9 text-sm focus-visible:ring-primary"
              disabled={isPending}
            />
            <Sparkles className="w-4 h-4 text-primary absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <Button
            onClick={() => send(instruction)}
            disabled={isPending || !instruction.trim()}
            className="w-24 shrink-0 h-9 bg-primary"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <><Wand2 className="w-3.5 h-3.5 mr-1.5" /> Run</>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={() => setShowHistory((s) => !s)}
            title="Toggle history"
          >
            {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {/* ── Group tabs ─────────────────────────────────────── */}
        <div className="flex gap-1 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-thin">
          {groups.map((g) => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={`text-[10px] whitespace-nowrap px-2 py-0.5 rounded border transition-colors shrink-0 ${activeGroup === g ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
            >
              {g}
            </button>
          ))}
          <button
            onClick={() => setShowTemplates((s) => !s)}
            className={`text-[10px] whitespace-nowrap px-2 py-0.5 rounded border transition-colors shrink-0 ${showTemplates ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
          >
            🏗 Templates
          </button>
        </div>

        {/* ── Quick actions ─────────────────────────────────── */}
        {!showTemplates && (
          <div className="flex gap-1 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-thin">
            {visibleActions.map((q) => (
              <button
                key={q.label}
                onClick={() => send(q.prompt)}
                disabled={isPending}
                className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-background border border-border hover:border-primary/60 hover:bg-primary/10 transition-colors text-foreground/80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {q.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Template builder prompts ──────────────────────── */}
        {showTemplates && (
          <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-thin">
            {TEMPLATE_PROMPTS.map((t) => (
              <button
                key={t.label}
                onClick={() => send(t.prompt)}
                disabled={isPending}
                className="text-[11px] whitespace-nowrap px-3 py-1.5 rounded-lg bg-background border border-primary/40 hover:border-primary hover:bg-primary/10 transition-colors text-foreground/80 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Zap className="w-3 h-3 text-primary shrink-0" />
                {t.label}
              </button>
            ))}
            <button
              onClick={() => {
                const p = `Build a complete animated intro sequence for the current project:
1. Look at existing clips and their positions in the current state.
2. Add a background that matches the theme (use waves or a dark gradient blank clip).
3. Add an animated title card at the very start with zoomIn animation.
4. Add a subtitle below the title with slideUp animation, offset 0.3s from the title.
5. Add an appropriate particle overlay (stars or sparkles) with screen blend mode.
6. Add a smooth fade transition into the first content clip.`;
                send(p);
              }}
              disabled={isPending}
              className="text-[11px] whitespace-nowrap px-3 py-1.5 rounded-lg bg-background border border-primary/40 hover:border-primary hover:bg-primary/10 transition-colors text-foreground/80 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Layers className="w-3 h-3 text-primary shrink-0" />
              🎬 Auto-intro
            </button>
          </div>
        )}

        {/* ── History ────────────────────────────────────────── */}
        {showHistory && state.aiHistory.length > 0 && (
          <div className="max-h-36 overflow-y-auto bg-background/50 border border-border rounded p-2 space-y-1.5 text-xs">
            {state.aiHistory.slice(-12).map((m) => (
              <div key={m.id} className="flex gap-2">
                <span className={m.role === "user" ? "text-primary font-semibold shrink-0" : "text-emerald-400 font-semibold shrink-0"}>
                  {m.role === "user" ? "You" : "AI"}:
                </span>
                <span className="text-muted-foreground flex-1 leading-snug">{m.text}</span>
                {m.role === "user" && (
                  <button
                    className="text-muted-foreground/50 hover:text-primary text-[9px] shrink-0"
                    onClick={() => { setInstruction(m.text); inputRef.current?.focus(); }}
                    title="Re-run"
                  >
                    ↩
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import type { EditorState, Clip, Effect, ClipTransition } from "./types";
import { DEFAULT_TEXT_STYLE, DEFAULT_FILTERS } from "./types";

export type TemplateCategory =
  | "Social / Reels"
  | "Slideshow"
  | "Cinematic"
  | "Typography"
  | "Brand & Reveal"
  | "Events"
  | "Gaming"
  | "Food & Lifestyle"
  | "Real Estate"
  | "Particles"
  | "Wave / Visualizer"
  | "Countdown"
  | "Quotes"
  | "Other";

export interface VideoTemplate {
  key: string;
  name: string;
  description: string;
  emoji: string;
  canvasWidth: number;
  canvasHeight: number;
  duration: number;
  background: string;
  /** Optional category for filtering in the template picker. */
  category?: TemplateCategory;
  build: () => Pick<EditorState, "clips" | "duration" | "canvasWidth" | "canvasHeight" | "background" | "tracks" | "keyframes" | "transitions" | "markers">;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function templateClip(partial: Partial<Clip>): Clip {
  const width = partial.width ?? 1;
  const height = partial.height ?? 1;

  const isText = (partial.mediaType ?? "blank") === "text";
  const baseStyle = partial.textStyle ?? { ...DEFAULT_TEXT_STYLE };
  const textStyle = isText
    ? { ...baseStyle, fontSize: Math.round(baseStyle.fontSize * width) }
    : baseStyle;

  return {
    // Spread partial first so extra clip-type fields (particleKey,
    // specialLayerKey, waveKey, shapeKind, etc.) are preserved.
    ...partial,
    id: partial.id ?? uid("clip"),
    label: partial.label ?? "Clip",
    mediaType: partial.mediaType ?? "blank",
    trackIndex: partial.trackIndex ?? 0,
    startTime: partial.startTime ?? 0,
    duration: partial.duration ?? 4,
    trimStart: 0,
    trimEnd: 0,
    text: partial.text,
    textStyle,
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    width,
    height,
    opacity: partial.opacity ?? 1,
    rotation: partial.rotation ?? 0,
    scale: partial.scale ?? 1,
    flipH: false,
    flipV: false,
    blendMode: partial.blendMode ?? "normal",
    borderRadius: partial.borderRadius ?? 0,
    preserveRatio: false,
    cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1,
    filters: partial.filters ?? { ...DEFAULT_FILTERS },
    speed: 1,
    animationIn: partial.animationIn ?? "fade",
    animationOut: partial.animationOut ?? "fade",
    animationInDuration: 0.5,
    animationOutDuration: 0.5,
    volume: 1,
    muted: false,
    locked: false,
    hidden: false,
    color: partial.color ?? "#1f1f24",
    effects: partial.effects ?? [],
    transitionIn: partial.transitionIn ?? { type: "none", duration: 0.5 },
  };
}

const baseTracks = [
  { id: "track-overlay", name: "Text & Overlay", type: "overlay" as const, muted: false, hidden: false, locked: false },
  { id: "track-video", name: "Main", type: "video" as const, muted: false, hidden: false, locked: false },
  { id: "track-audio", name: "Audio", type: "audio" as const, muted: false, hidden: false, locked: false },
];
// ──────────────────────────────────────────────────────────────────────────
// Bulk template generator. Cross-multiplies a fixed pool of "categories"
// against the five most common output aspect ratios so the user has a
// large, browseable catalog without us having to hand-author 1,500 entries.
//
//   5 aspect ratios × 25 themed categories × 12 title variants  = 1,500
//
// Each generated template is a `buildTitleTpl` (single backdrop + big title
// + optional subtitle + a colored visual FX) — the same proven layout used
// elsewhere in this file. All sizes/positions are normalized so the same
// definition produces a sensible result for every aspect ratio.
// ──────────────────────────────────────────────────────────────────────────

const BULK_ASPECTS: { key: string; w: number; h: number; label: string }[] = [
  { key: "v",   w: 1080, h: 1920, label: "9:16" },
  { key: "sq",  w: 1080, h: 1080, label: "1:1" },
  { key: "ld",  w: 1920, h: 1080, label: "16:9" },
  { key: "p45", w: 1080, h: 1350, label: "4:5" },
  { key: "ult", w: 2560, h: 1080, label: "21:9" },
];

const FX_CYCLE = ["glow", "vignette", "tint", "scanlines", "shake"] as const;

interface BulkCategory {
  cat: string;
  pretty: string;
  emoji: string;
  /** ~12 title strings (use \n for line breaks). */
  titles: string[];
  /** Subtitles that pair with each title (cycled). */
  subtitles: string[];
  /** Palette swatches: bg + titleColor + fxColor. */
  palette: { bg: string; titleColor: string; fxColor: string }[];
}

const BULK_CATEGORIES: BulkCategory[] = [
  {
    cat: "sale", pretty: "Sale", emoji: "🔥",
    titles: ["50%\nOFF", "70%\nOFF", "FLASH\nSALE", "MEGA\nDEAL", "BUY 1\nGET 1", "DOOR-\nBUSTERS", "LIMITED\nTIME", "CLEAR-\nANCE", "SUMMER\nSALE", "BLACK\nFRIDAY", "CYBER\nMONDAY", "FINAL\nHOURS"],
    subtitles: ["Today only — ends midnight", "While supplies last", "Use code SAVE at checkout", "Tap to shop", "Sitewide discount", "No code needed"],
    palette: [
      { bg: "#7f1d1d", titleColor: "#fef9c3", fxColor: "#dc2626" },
      { bg: "#0c0a09", titleColor: "#facc15", fxColor: "#facc15" },
      { bg: "#1e1b4b", titleColor: "#a78bfa", fxColor: "#a78bfa" },
      { bg: "#831843", titleColor: "#fde68a", fxColor: "#fb7185" },
    ],
  },
  {
    cat: "launch", pretty: "Launch", emoji: "🚀",
    titles: ["NEW\nDROP", "INTRO-\nDUCING", "JUST\nLANDED", "LAUNCH\nDAY", "PRE-\nORDER", "FIRST\nLOOK", "AVAIL-\nABLE NOW", "MEET\nAURORA", "VERSION\n2.0", "BIG\nNEWS", "FRESH\nDESIGN", "SHIPPING\nNOW"],
    subtitles: ["Available worldwide", "Reserve your spot", "Now in beta", "Limited inventory", "Free shipping included", "Be the first to try"],
    palette: [
      { bg: "#082f49", titleColor: "#fff", fxColor: "#0ea5e9" },
      { bg: "#1d4ed8", titleColor: "#fff", fxColor: "#60a5fa" },
      { bg: "#020617", titleColor: "#22d3ee", fxColor: "#22d3ee" },
      { bg: "#0f172a", titleColor: "#a5f3fc", fxColor: "#06b6d4" },
    ],
  },
  {
    cat: "event", pretty: "Event", emoji: "📅",
    titles: ["SAVE\nTHE DATE", "OCT\n12", "NOV\n02", "DEC\n31", "MAR\n15", "JOIN US\nLIVE", "RSVP\nTODAY", "HAPPENING\nFRIDAY", "MEETUP\nTONIGHT", "CONF\n2026", "FESTIVAL\nWEEKEND", "DOORS\nOPEN"],
    subtitles: ["Brooklyn · 7pm", "Online & free", "Limited seats — book now", "Headlining act announced", "Tickets at link in bio", "Catering provided"],
    palette: [
      { bg: "#831843", titleColor: "#fde68a", fxColor: "#f43f5e" },
      { bg: "#3b0764", titleColor: "#fde68a", fxColor: "#a855f7" },
      { bg: "#0f766e", titleColor: "#a7f3d0", fxColor: "#10b981" },
      { bg: "#0c0a09", titleColor: "#fcd34d", fxColor: "#facc15" },
    ],
  },
  {
    cat: "quote", pretty: "Quote", emoji: "💬",
    titles: ["“STAY\nHUNGRY.”", "“DREAM\nBIG.”", "“KEEP\nGOING.”", "“BE\nKIND.”", "“DO\nLESS.”", "“START\nNOW.”", "“TRUST\nTHE WORK.”", "“SHIP\nIT.”", "“LESS IS\nMORE.”", "“GROW\nDAILY.”", "“DONE >\nPERFECT.”", "“OWN\nIT.”"],
    subtitles: ["— Anonymous", "— Daily reminder", "— A gentle nudge", "— Your future self", "— Worth repeating", "— A small truth"],
    palette: [
      { bg: "#0f172a", titleColor: "#fff", fxColor: "#64748b" },
      { bg: "#111827", titleColor: "#fde68a", fxColor: "#facc15" },
      { bg: "#1c1917", titleColor: "#fef3c7", fxColor: "#fbbf24" },
      { bg: "#020617", titleColor: "#a5f3fc", fxColor: "#22d3ee" },
    ],
  },
  {
    cat: "tutorial", pretty: "Tutorial", emoji: "📚",
    titles: ["HOW IT\nWORKS", "STEP-\nBY-STEP", "QUICK\nGUIDE", "60-SEC\nTIP", "DAY 1\nBASICS", "PRO\nTIPS", "5\nMISTAKES", "DEEP\nDIVE", "CHEAT\nSHEET", "MASTER\nIT", "TUTORIAL\nINSIDE", "WATCH &\nLEARN"],
    subtitles: ["A 60-second walkthrough", "Save this for later", "Beginner-friendly", "Read the captions", "Notes in description", "Try along with us"],
    palette: [
      { bg: "#0f766e", titleColor: "#fff", fxColor: "#5eead4" },
      { bg: "#1d4ed8", titleColor: "#fff", fxColor: "#60a5fa" },
      { bg: "#0c4a6e", titleColor: "#a5f3fc", fxColor: "#0ea5e9" },
      { bg: "#1e293b", titleColor: "#fff", fxColor: "#94a3b8" },
    ],
  },
  {
    cat: "bts", pretty: "BTS", emoji: "🎬",
    titles: ["BEHIND\nTHE SCENES", "DAY\n03", "ON\nSET", "RAW\nFOOTAGE", "SET\nLIFE", "CREW\nCALL", "SHOOT\nDAY", "TAKE\nFIVE", "B-ROLL\nBLITZ", "PROCESS\nNOTES", "MAKING\nOF…", "OFF\nCAMERA"],
    subtitles: ["Day 3 on set", "How the magic happens", "Cut from the final edit", "Notes from the director", "First-take perfection", "We didn't plan this"],
    palette: [
      { bg: "#1c1917", titleColor: "#fff", fxColor: "#a8a29e" },
      { bg: "#0c0a09", titleColor: "#fbbf24", fxColor: "#f59e0b" },
      { bg: "#27272a", titleColor: "#fff", fxColor: "#71717a" },
      { bg: "#1e1b4b", titleColor: "#a5b4fc", fxColor: "#818cf8" },
    ],
  },
  {
    cat: "recipe", pretty: "Recipe", emoji: "🍳",
    titles: ["MISO\nRAMEN", "AVOCADO\nTOAST", "CACIO\nE PEPE", "GREEK\nSALAD", "BERRY\nGRANOLA", "CRISPY\nTOFU", "SPICY\nNOODLES", "CHOCO\nMUG CAKE", "SUNDAY\nROAST", "5-MIN\nSMOOTHIE", "PROTEIN\nBOWL", "ICED\nMATCHA"],
    subtitles: ["Ready in 25 minutes", "Serves two", "One pan, no fuss", "Vegan & gluten-free", "Kid-approved", "Pantry staples only"],
    palette: [
      { bg: "#fef3c7", titleColor: "#7c2d12", fxColor: "#facc15" },
      { bg: "#1c1917", titleColor: "#fde68a", fxColor: "#f59e0b" },
      { bg: "#7c2d12", titleColor: "#fef3c7", fxColor: "#fb923c" },
      { bg: "#0f172a", titleColor: "#fff", fxColor: "#fbbf24" },
    ],
  },
  {
    cat: "fitness", pretty: "Fitness", emoji: "💪",
    titles: ["20 MIN\nHIIT", "LEG\nDAY", "PUSH\nDAY", "PULL\nDAY", "AB\nBURNER", "MOBILITY\nFLOW", "5K\nCHALLENGE", "FULL\nBODY", "MORNING\nROUTINE", "BURPEE\nGAUNTLET", "REST\nDAY", "GAME\nDAY"],
    subtitles: ["No equipment · Full body", "Beginner-friendly", "Track your reps", "Stretch first", "Hydrate halfway", "Push your limits"],
    palette: [
      { bg: "#0c0a09", titleColor: "#f97316", fxColor: "#f97316" },
      { bg: "#1e1b4b", titleColor: "#fff", fxColor: "#a78bfa" },
      { bg: "#020617", titleColor: "#22d3ee", fxColor: "#22d3ee" },
      { bg: "#7f1d1d", titleColor: "#fef9c3", fxColor: "#dc2626" },
    ],
  },
  {
    cat: "realestate", pretty: "Listing", emoji: "🏠",
    titles: ["JUST\nLISTED", "OPEN\nHOUSE", "PRICE\nDROP", "JUST\nSOLD", "PENDING\nOFFER", "BACK ON\nMARKET", "COMING\nSOON", "TOUR\nTODAY", "MODERN\nLIVING", "OCEAN\nVIEW", "DOWN-\nTOWN GEM", "FAMILY\nHOME"],
    subtitles: ["3 bd · 2 ba · $785k", "Sat & Sun · 1pm–4pm", "Just reduced — schedule a tour", "Listed by Jane Doe Realty", "Hardwoods throughout", "Walk to everything"],
    palette: [
      { bg: "#0c4a6e", titleColor: "#fff", fxColor: "#0ea5e9" },
      { bg: "#0f172a", titleColor: "#fcd34d", fxColor: "#facc15" },
      { bg: "#064e3b", titleColor: "#a7f3d0", fxColor: "#10b981" },
      { bg: "#1c1917", titleColor: "#fff", fxColor: "#a8a29e" },
    ],
  },
  {
    cat: "wellness", pretty: "Wellness", emoji: "🧘",
    titles: ["BREATHE", "PAUSE", "RESET", "STILL-\nNESS", "GRATI-\nTUDE", "SLOW\nDOWN", "DAILY\nRITUAL", "MORNING\nMOMENT", "WIND\nDOWN", "JUST\nBE", "CALM\nMIND", "SOFT\nDAY"],
    subtitles: ["Inhale · 4 · Hold · 4 · Exhale · 4", "Take five for yourself", "A pocket of quiet", "10 minutes is enough", "Hydrate · Stretch · Smile", "You've earned this"],
    palette: [
      { bg: "#134e4a", titleColor: "#a7f3d0", fxColor: "#5eead4" },
      { bg: "#0f172a", titleColor: "#a5f3fc", fxColor: "#22d3ee" },
      { bg: "#1e1b4b", titleColor: "#c4b5fd", fxColor: "#a78bfa" },
      { bg: "#7c2d12", titleColor: "#fef3c7", fxColor: "#fbbf24" },
    ],
  },
  {
    cat: "podcast", pretty: "Podcast", emoji: "🎙️",
    titles: ["DEEP\nDIVE", "EP\n014", "GUEST\nDROP", "NEW\nEPISODE", "LISTEN\nNOW", "HOT\nTAKES", "FIRESIDE\nCHAT", "AFTER\nHOURS", "STORY\nTIME", "WEEKLY\nROUNDUP", "Q&A\nSPECIAL", "SEASON\nFINALE"],
    subtitles: ["Available everywhere podcasts live", "Featuring Dr. Priya Patel", "Subscribe for weekly drops", "Tap the link in bio", "60 minutes of insight", "Bonus content for members"],
    palette: [
      { bg: "#3b0764", titleColor: "#fde68a", fxColor: "#a855f7" },
      { bg: "#0f172a", titleColor: "#fff", fxColor: "#60a5fa" },
      { bg: "#1c1917", titleColor: "#fde68a", fxColor: "#facc15" },
      { bg: "#0c0a09", titleColor: "#fff", fxColor: "#a78bfa" },
    ],
  },
  {
    cat: "news", pretty: "News", emoji: "📺",
    titles: ["BREAKING\nNEWS", "LIVE\nNOW", "JUST\nIN", "DEVELOP-\nING", "EXCLUSIVE", "UPDATED\nSTORY", "MARKETS\nMOVE", "WEATHER\nALERT", "TOP\nSTORY", "ANALYSIS", "FACT\nCHECK", "ON THE\nGROUND"],
    subtitles: ["Live · Right now", "Reporting from Brooklyn", "Story developing", "Updated 5 min ago", "Sources confirm", "Watch our full coverage"],
    palette: [
      { bg: "#7f1d1d", titleColor: "#fff", fxColor: "#dc2626" },
      { bg: "#0c0a09", titleColor: "#facc15", fxColor: "#facc15" },
      { bg: "#0f172a", titleColor: "#fff", fxColor: "#3b82f6" },
      { bg: "#1c1917", titleColor: "#fef3c7", fxColor: "#fb923c" },
    ],
  },
  {
    cat: "travel", pretty: "Travel", emoji: "✈️",
    titles: ["TOKYO\nDAY 4", "PARIS\nIN SPRING", "BALI\nVIBES", "ROADTRIP\nUSA", "ALPS\nADVENTURE", "ISLAND\nESCAPE", "CITY\nLIGHTS", "HIDDEN\nGEMS", "WEEKEND\nIN ROME", "DESERT\nDAYS", "JUNGLE\nTREK", "AIRPORT\nVIBES"],
    subtitles: ["Day 4 of 12", "Sights · Bites · Stories", "Bookmark for later", "Off the beaten path", "Sunrise hike included", "Pack light, fly far"],
    palette: [
      { bg: "#0c0a09", titleColor: "#fde68a", fxColor: "#facc15" },
      { bg: "#0c4a6e", titleColor: "#a5f3fc", fxColor: "#22d3ee" },
      { bg: "#7c2d12", titleColor: "#fef3c7", fxColor: "#fb923c" },
      { bg: "#0f172a", titleColor: "#fff", fxColor: "#60a5fa" },
    ],
  },
  {
    cat: "wedding", pretty: "Wedding", emoji: "💍",
    titles: ["SAVE\nTHE DATE", "WE\nDO!", "M & J", "FOR-\nEVER", "JUST\nMARRIED", "ENGAGED!", "OUR\nDAY", "SAY YES", "VOWS\n& KISSES", "FIRST\nDANCE", "TILL\nFOREVER", "CHEERS\nTO US"],
    subtitles: ["June 14, 2026", "Reception details inside", "Black-tie · evening", "RSVP by April 1", "Plus-one welcome", "Hashtag #MJforever"],
    palette: [
      { bg: "#fef3c7", titleColor: "#7c2d12", fxColor: "#facc15" },
      { bg: "#1c1917", titleColor: "#fde68a", fxColor: "#fbbf24" },
      { bg: "#fdf2f8", titleColor: "#831843", fxColor: "#f9a8d4" },
      { bg: "#0f172a", titleColor: "#fff", fxColor: "#fbcfe8" },
    ],
  },
  {
    cat: "birthday", pretty: "Birthday", emoji: "🎂",
    titles: ["HAPPY\nBIRTHDAY", "BIG\nTHREE-OH", "SWEET\nSIXTEEN", "PARTY\nTONIGHT", "MAKE A\nWISH", "ANOTHER\nTRIP", "B-DAY\nBASH", "CAKE\nTIME", "LET'S\nCELEBRATE", "BIRTHDAY\nGIRL", "BIRTHDAY\nBOY", "SLAY\nTHE DAY"],
    subtitles: ["Cheers to many more", "Doors open at 8pm", "Cake will happen", "Bring your best moves", "Rooftop · 21+", "Surprise party — shhh"],
    palette: [
      { bg: "#831843", titleColor: "#fde68a", fxColor: "#f9a8d4" },
      { bg: "#0c0a09", titleColor: "#facc15", fxColor: "#fbbf24" },
      { bg: "#1d4ed8", titleColor: "#fff", fxColor: "#60a5fa" },
      { bg: "#3b0764", titleColor: "#fde68a", fxColor: "#a855f7" },
    ],
  },
  {
    cat: "music", pretty: "Music", emoji: "🎵",
    titles: ["NEW\nSINGLE", "ALBUM\nOUT NOW", "TOUR\n2026", "OUT\nFRIDAY", "PRE-\nSAVE", "MUSIC\nVIDEO", "STUDIO\nSESSION", "VINYL\nDROP", "ON\nREPEAT", "LIVE\nSESSION", "REMIX\nINCOMING", "ENCORE!"],
    subtitles: ["Stream everywhere now", "Pre-save on Spotify", "Tour dates in bio", "Vinyl drops next week", "Acoustic version included", "Headphones recommended"],
    palette: [
      { bg: "#020617", titleColor: "#22d3ee", fxColor: "#22d3ee" },
      { bg: "#3b0764", titleColor: "#fde68a", fxColor: "#a855f7" },
      { bg: "#0f172a", titleColor: "#fff", fxColor: "#f43f5e" },
      { bg: "#1c1917", titleColor: "#fcd34d", fxColor: "#facc15" },
    ],
  },
  {
    cat: "teaser", pretty: "Teaser", emoji: "👀",
    titles: ["SOMETHING\nIS COMING", "TICK\nTOCK", "STAY\nTUNED", "GET\nREADY", "ALMOST\nHERE", "BIG\nREVEAL", "SECRET\nPROJECT", "CLOSER\nTHAN EVER", "WAIT\nFOR IT", "WHAT IF…", "DON'T\nBLINK", "THE\nCOUNTDOWN"],
    subtitles: ["Drops next Friday", "Subscribe to be the first", "More details soon", "You won't want to miss this", "Set a reminder", "Reveal at 9am PT"],
    palette: [
      { bg: "#020617", titleColor: "#22d3ee", fxColor: "#22d3ee" },
      { bg: "#0f172a", titleColor: "#a5f3fc", fxColor: "#06b6d4" },
      { bg: "#1c1917", titleColor: "#fde68a", fxColor: "#facc15" },
      { bg: "#3b0764", titleColor: "#a5b4fc", fxColor: "#a78bfa" },
    ],
  },
  {
    cat: "soon", pretty: "Coming Soon", emoji: "⏳",
    titles: ["COMING\nSOON", "T-MINUS\n10", "T-MINUS\n3 DAYS", "OPENING\nFRIDAY", "DOORS\nSOON", "ALMOST\nREADY", "ARRIVING\nSPRING", "DROP\nINCOMING", "LIVE\nSHORTLY", "WAITLIST\nOPEN", "BETA\nSOON", "LAUNCH\nWEEK"],
    subtitles: ["Mark your calendar", "Sign up for early access", "Limited release", "Notifications open", "First in line — first served", "Big things ahead"],
    palette: [
      { bg: "#020617", titleColor: "#22d3ee", fxColor: "#22d3ee" },
      { bg: "#0c0a09", titleColor: "#facc15", fxColor: "#facc15" },
      { bg: "#1d4ed8", titleColor: "#fff", fxColor: "#60a5fa" },
      { bg: "#0f172a", titleColor: "#fde68a", fxColor: "#fbbf24" },
    ],
  },
  {
    cat: "thanks", pretty: "Thank You", emoji: "🙏",
    titles: ["THANK\nYOU", "MUCH\nLOVE", "GRATEFUL", "WE\nDID IT", "1K\nSTRONG", "10K\nFAMILY", "100K!!", "1M\nMILESTONE", "FROM US\nTO YOU", "CHEERS\nFRIENDS", "WITH\nLOVE", "MERCI\n!"],
    subtitles: ["For watching", "For being here", "For sharing", "For the support", "Couldn't do it without you", "More to come"],
    palette: [
      { bg: "#7c2d12", titleColor: "#fef3c7", fxColor: "#fb923c" },
      { bg: "#0f172a", titleColor: "#fff", fxColor: "#22d3ee" },
      { bg: "#1c1917", titleColor: "#fde68a", fxColor: "#facc15" },
      { bg: "#1e1b4b", titleColor: "#c4b5fd", fxColor: "#a78bfa" },
    ],
  },
  {
    cat: "subscribe", pretty: "Subscribe", emoji: "🔔",
    titles: ["SUB-\nSCRIBE", "FOLLOW\nFOR MORE", "HIT THE\nBELL", "JOIN US", "LIKE +\nSHARE", "SAVE\nTHIS", "SHARE\nWITH A FRIEND", "NEW\nWEEKLY", "DAILY\nDROPS", "DON'T\nMISS OUT", "TURN ON\nNOTIFS", "STAY\nLOOPED"],
    subtitles: ["Hit the bell for more", "Free · weekly · always", "Tap the link in bio", "Join 50,000+ readers", "Built for creators", "It's good — promise"],
    palette: [
      { bg: "#7f1d1d", titleColor: "#fff", fxColor: "#ef4444" },
      { bg: "#0f172a", titleColor: "#fff", fxColor: "#3b82f6" },
      { bg: "#0c0a09", titleColor: "#facc15", fxColor: "#facc15" },
      { bg: "#1c1917", titleColor: "#fff", fxColor: "#a3e635" },
    ],
  },
  {
    cat: "tech", pretty: "Tech", emoji: "💻",
    titles: ["NEW\nGADGET", "UNBOXING", "REVIEW\nINSIDE", "5 STAR\nDEVICE", "FIRST\nIMPRESSIONS", "DEVICE\nTOUR", "VS\nCOMPARED", "WORTH\nIT?", "FEATURE\nDROP", "SETUP\nGUIDE", "PERFORM-\nANCE TEST", "DEEP\nREVIEW"],
    subtitles: ["Specs and impressions", "Hands-on demo", "Watch before you buy", "Honest review inside", "Pros & cons", "Field-tested for two weeks"],
    palette: [
      { bg: "#0f172a", titleColor: "#fff", fxColor: "#3b82f6" },
      { bg: "#020617", titleColor: "#22d3ee", fxColor: "#22d3ee" },
      { bg: "#1c1917", titleColor: "#fff", fxColor: "#a8a29e" },
      { bg: "#1e1b4b", titleColor: "#a5b4fc", fxColor: "#818cf8" },
    ],
  },
  {
    cat: "beauty", pretty: "Beauty", emoji: "💄",
    titles: ["GLOW\nUP", "GET\nREADY", "DAILY\nROUTINE", "SOFT\nGLAM", "SKIN\nFIRST", "BOLD\nLIPS", "EYE\nLOOK", "5 STEP\nSKINCARE", "HAIR\nGOALS", "SUMMER\nGLOW", "PRODUCT\nHAUL", "GET THE\nLOOK"],
    subtitles: ["Step-by-step routine", "Linked in bio", "Cruelty-free picks", "Drugstore approved", "Editor's favorites", "Save for later"],
    palette: [
      { bg: "#fdf2f8", titleColor: "#831843", fxColor: "#f9a8d4" },
      { bg: "#0c0a09", titleColor: "#fde68a", fxColor: "#facc15" },
      { bg: "#1c1917", titleColor: "#fff", fxColor: "#fb7185" },
      { bg: "#7c2d12", titleColor: "#fef3c7", fxColor: "#fbbf24" },
    ],
  },
  {
    cat: "gaming", pretty: "Gaming", emoji: "🎮",
    titles: ["LIVE\nNOW", "STREAM\nSTARTING", "GG!", "VICTORY\nROYALE", "SPEED\nRUN", "CLUTCH\nMOMENT", "NEW\nCONTENT", "RANKED\nGRIND", "PATCH\nNOTES", "WORLD\nRECORD", "BOSS\nFIGHT", "TOP\nPLAYS"],
    subtitles: ["Twitch · twitch.tv/you", "Hang out — chat is open", "First to victory", "Pro tips inside", "Subscribe for daily drops", "Patch dropping tonight"],
    palette: [
      { bg: "#1e1b4b", titleColor: "#a5b4fc", fxColor: "#a78bfa" },
      { bg: "#020617", titleColor: "#22d3ee", fxColor: "#22d3ee" },
      { bg: "#7f1d1d", titleColor: "#fef9c3", fxColor: "#dc2626" },
      { bg: "#0c0a09", titleColor: "#a3e635", fxColor: "#84cc16" },
    ],
  },
  {
    cat: "holiday", pretty: "Holiday", emoji: "🎄",
    titles: ["HAPPY\nHOLIDAYS", "MERRY\nXMAS", "NEW\nYEAR", "HALLO-\nWEEN", "JOY &\nLOVE", "FROM US\nTO YOU", "SEASON'S\nGREETINGS", "CHEERS\n2026", "FALL\nVIBES", "WINTER\nWONDER", "HARVEST\nFEST", "EID\nMUBARAK"],
    subtitles: ["From our team", "May yours be merry", "Cheers to a great year", "Wishing you the best", "Eat, drink, repeat", "Stay cozy"],
    palette: [
      { bg: "#7f1d1d", titleColor: "#fef9c3", fxColor: "#dc2626" },
      { bg: "#0f766e", titleColor: "#a7f3d0", fxColor: "#5eead4" },
      { bg: "#0c0a09", titleColor: "#facc15", fxColor: "#facc15" },
      { bg: "#1e1b4b", titleColor: "#fde68a", fxColor: "#a78bfa" },
    ],
  },
  {
    cat: "recap", pretty: "Recap", emoji: "📈",
    titles: ["YEAR IN\nREVIEW", "2025\nRECAP", "Q4\nSUMMARY", "WEEK IN\nREVIEW", "TOP\nMOMENTS", "BEST\nOF…", "MILE-\nSTONES", "FAVES\nLIST", "MONTHLY\nROUND-UP", "ANNUAL\nWRAP", "BIG\nWINS", "CHAPTER\nCLOSED"],
    subtitles: ["Highlights from the year", "Top 10 moments", "Numbers that matter", "Looking back, moving forward", "Onwards & upwards", "Cheers to next year"],
    palette: [
      { bg: "#0f172a", titleColor: "#fff", fxColor: "#22d3ee" },
      { bg: "#1e1b4b", titleColor: "#fde68a", fxColor: "#a78bfa" },
      { bg: "#7c2d12", titleColor: "#fef3c7", fxColor: "#fb923c" },
      { bg: "#0c0a09", titleColor: "#facc15", fxColor: "#facc15" },
    ],
  },
  {
    cat: "gaming", pretty: "Gaming", emoji: "🎮",
    titles: ["GAME\nON", "LEVEL\nUP", "GG\nEZ", "NEW\nHIGH SCORE", "BOSS\nFIGHT", "1ST\nPLACE", "RANKED\nUP", "CLUTCH\nPLAY", "SPEED\nRUN", "FINAL\nBOSS", "TRIPLE\nKILL", "NO\nMERCY"],
    subtitles: ["Let's get it", "Watch till the end", "Road to rank 1", "Can't be stopped", "Highlights incoming", "GG no re"],
    palette: [
      { bg: "#020617", titleColor: "#22d3ee", fxColor: "#0ea5e9" },
      { bg: "#0f0f1a", titleColor: "#a78bfa", fxColor: "#7c3aed" },
      { bg: "#000", titleColor: "#fbbf24", fxColor: "#f59e0b" },
      { bg: "#0d0221", titleColor: "#f43f5e", fxColor: "#e11d48" },
    ],
  },
  {
    cat: "beauty", pretty: "Beauty", emoji: "💄",
    titles: ["GLOW\nUP", "NEW\nLOOK", "GET\nREADY", "GRWM", "SOFT\nGLAM", "NO\nFILTER", "SKIN\nCARE", "FULL\nFACE", "FRESH\nFACES", "DEWY\nSKIN", "BOLD\nLIP", "GLASS\nSKIN"],
    subtitles: ["Swipe for details", "Products linked below", "Tutorial in caption", "No edits — raw look", "All drugstore products", "Filter-free glow"],
    palette: [
      { bg: "#18060a", titleColor: "#fda4af", fxColor: "#f43f5e" },
      { bg: "#fdf2f8", titleColor: "#831843", fxColor: "#be185d" },
      { bg: "#1a0a1e", titleColor: "#e879f9", fxColor: "#a21caf" },
      { bg: "#fff7ed", titleColor: "#9a3412", fxColor: "#ea580c" },
    ],
  },
  {
    cat: "travel", pretty: "Travel", emoji: "✈️",
    titles: ["PACK\nYOUR BAGS", "NEW\nDESTINATION", "SOLO\nTRIP", "ROAD\nTRIP", "BUCKET\nLIST", "HIDDEN\nGEM", "LOCAL\nLIFE", "TRAVEL\nDIARY", "EXPLORE\nMORE", "OFF THE\nGRID", "WORLD\nTOUR", "24H IN\nTOKYO"],
    subtitles: ["Full guide in bio", "This place changed me", "Budget: $0 regrets", "No WiFi, no worries", "First time here!", "Links & tips below"],
    palette: [
      { bg: "#0c4a6e", titleColor: "#bae6fd", fxColor: "#38bdf8" },
      { bg: "#064e3b", titleColor: "#6ee7b7", fxColor: "#10b981" },
      { bg: "#1e1b4b", titleColor: "#fde68a", fxColor: "#fbbf24" },
      { bg: "#0f172a", titleColor: "#fff", fxColor: "#94a3b8" },
    ],
  },
  {
    cat: "mindfulness", pretty: "Mindfulness", emoji: "🧘",
    titles: ["BREATHE.", "LET GO.", "BE\nPRESENT.", "JUST\nBE.", "STILL\nMIND.", "SLOW\nDOWN.", "FIND\nPEACE.", "LESS\nNOISE.", "INNER\nCALM.", "RESET\nNOW.", "FOCUS\nIN.", "SIMPLY\nBE."],
    subtitles: ["Take a moment", "3 deep breaths", "You are enough", "One thing at a time", "Let it come, let it go", "Peace begins here"],
    palette: [
      { bg: "#134e4a", titleColor: "#a7f3d0", fxColor: "#5eead4" },
      { bg: "#1e1b4b", titleColor: "#c7d2fe", fxColor: "#818cf8" },
      { bg: "#0f172a", titleColor: "#f0fdf4", fxColor: "#4ade80" },
      { bg: "#f0fdf4", titleColor: "#14532d", fxColor: "#16a34a" },
    ],
  },
];

const BULK_CAT_CATEGORY_MAP: Record<string, TemplateCategory> = {
  sale: "Other",
  launch: "Brand & Reveal",
  event: "Events",
  quote: "Quotes",
  tutorial: "Other",
  bts: "Cinematic",
  recipe: "Food & Lifestyle",
  fitness: "Other",
  travel: "Social / Reels",
  gaming: "Gaming",
  beauty: "Social / Reels",
  mindfulness: "Quotes",
  recap: "Other",
  music: "Social / Reels",
};

function buildBulkTemplates(): VideoTemplate[] {
  const out: VideoTemplate[] = [];
  for (const a of BULK_ASPECTS) {
    for (const cat of BULK_CATEGORIES) {
      for (let i = 0; i < cat.titles.length; i++) {
        const pal = cat.palette[i % cat.palette.length];
        const sub = cat.subtitles[i % cat.subtitles.length];
        // Pick FX deterministically per (category, index) so similar cards
        // don't all share the same effect.
        const fx = FX_CYCLE[(cat.cat.length + i) % FX_CYCLE.length];
        // Title font sizing scales with the longest line so multi-line text
        // never overflows the box. Landscape = wider, so smaller default.
        const longestLine = cat.titles[i].split("\n").reduce((m, s) => Math.max(m, s.length), 1);
        const baseSize = a.w >= a.h ? 200 : 240;
        const titleSize = Math.max(80, Math.round(baseSize * Math.min(1.2, 7 / longestLine)));
        out.push(
          buildTitleTpl({
            key: `bulk-${a.key}-${cat.cat}-${i}`,
            name: `${cat.pretty} ${i + 1} · ${a.label}`,
            description: `${cat.titles[i].replace(/\n/g, " ")} — ${a.w}×${a.h}.`,
            emoji: cat.emoji,
            width: a.w,
            height: a.h,
            duration: 8,
            bg: pal.bg,
            title: cat.titles[i],
            titleColor: pal.titleColor,
            titleSize,
            subtitle: sub,
            fxType: fx,
            fxColor: pal.fxColor,
            category: BULK_CAT_CATEGORY_MAP[cat.cat] ?? "Other",
          }),
        );
      }
    }
  }
  return out;
}

export const TEMPLATES: VideoTemplate[] = [
  {
    key: "social-reel",
    name: "Social Reel",
    description: "Vertical 9:16 with intro title, 3 image slots, outro card.",
    emoji: "📱",
    canvasWidth: 1080,
    canvasHeight: 1920,
    duration: 18,
    background: "#0f0f1a",
    build() {
      const slot1: ClipTransition = { type: "slideLeft", duration: 0.4 };
      const slot2: ClipTransition = { type: "zoom", duration: 0.4 };
      const slot3: ClipTransition = { type: "fade", duration: 0.4 };
      const clips: Clip[] = [
        templateClip({
          label: "Intro Title",
          mediaType: "text",
          text: "YOUR\nTITLE",
          textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 180, fontWeight: 900, color: "#ffffff" },
          trackIndex: 0,
          startTime: 0,
          duration: 3,
          x: 0.05, y: 0.35, width: 0.9, height: 0.3,
          animationIn: "zoomIn", animationOut: "fade",
          color: "#f43f5e",
          effects: [{ id: uid("fx"), type: "glow", intensity: 0.6, color: "#f43f5e" }],
        }),
        templateClip({
          label: "Slot 1 (replace media)",
          mediaType: "blank",
          trackIndex: 1,
          startTime: 3,
          duration: 4,
          color: "#3b82f6",
        }),
        templateClip({
          label: "Slot 2 (replace media)",
          mediaType: "blank",
          trackIndex: 1,
          startTime: 7,
          duration: 4,
          color: "#8b5cf6",
          transitionIn: slot1,
        }),
        templateClip({
          label: "Slot 3 (replace media)",
          mediaType: "blank",
          trackIndex: 1,
          startTime: 11,
          duration: 4,
          color: "#10b981",
          transitionIn: slot2,
        }),
        templateClip({
          label: "Outro CTA",
          mediaType: "text",
          text: "FOLLOW\nFOR MORE",
          textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 140, fontWeight: 800, color: "#ffffff", background: "#000000cc" },
          trackIndex: 0,
          startTime: 15,
          duration: 3,
          x: 0.05, y: 0.4, width: 0.9, height: 0.2,
          animationIn: "slideUp", animationOut: "fade",
          color: "#000000",
          transitionIn: slot3,
        }),
      ];
      return {
        clips, duration: 18,
        canvasWidth: 1080, canvasHeight: 1920, background: "#0f0f1a",
        tracks: baseTracks, keyframes: [], transitions: [], markers: [],
      };
    },
  },
  {
    key: "slideshow",
    name: "Photo Slideshow",
    description: "16:9 slideshow with 4 image slots and smooth crossfades.",
    emoji: "🖼️",
    canvasWidth: 1920,
    canvasHeight: 1080,
    duration: 16,
    background: "#000000",
    build() {
      const cross: ClipTransition = { type: "fade", duration: 0.8 };
      const colors = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981"];
      const clips: Clip[] = colors.map((c, i) =>
        templateClip({
          label: `Photo ${i + 1} (replace)`,
          mediaType: "blank",
          trackIndex: 1,
          startTime: i * 4,
          duration: 4,
          color: c,
          animationIn: i === 0 ? "fade" : "none",
          animationOut: "none",
          transitionIn: i === 0 ? { type: "none", duration: 0.5 } : cross,
        }),
      );
      return {
        clips, duration: 16,
        canvasWidth: 1920, canvasHeight: 1080, background: "#000000",
        tracks: baseTracks, keyframes: [], transitions: [], markers: [],
      };
    },
  },
  {
    key: "promo",
    name: "Square Promo",
    description: "1:1 promo with bold text, glow effect and zoom transitions.",
    emoji: "✨",
    canvasWidth: 1080,
    canvasHeight: 1080,
    duration: 12,
    background: "#0a0a0f",
    build() {
      const zoom: ClipTransition = { type: "zoom", duration: 0.5 };
      const clips: Clip[] = [
        templateClip({
          label: "Hook Title",
          mediaType: "text",
          text: "SALE",
          textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 320, fontWeight: 900, color: "#fbbf24" },
          trackIndex: 0,
          startTime: 0, duration: 3,
          x: 0.05, y: 0.35, width: 0.9, height: 0.3,
          animationIn: "zoomIn", animationOut: "fade",
          color: "#fbbf24",
          effects: [{ id: uid("fx"), type: "glow", intensity: 0.8, color: "#fbbf24" }],
        }),
        templateClip({
          label: "Product Slot",
          mediaType: "blank",
          trackIndex: 1,
          startTime: 3, duration: 5,
          color: "#3b82f6",
          transitionIn: zoom,
          effects: [{ id: uid("fx"), type: "vignette", intensity: 0.5 }],
        }),
        templateClip({
          label: "Price Tag",
          mediaType: "text",
          text: "50% OFF",
          textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 220, fontWeight: 900, color: "#ffffff", background: "#dc2626" },
          trackIndex: 0,
          startTime: 8, duration: 4,
          x: 0.1, y: 0.4, width: 0.8, height: 0.2,
          animationIn: "bounce", animationOut: "fade",
          color: "#dc2626",
          transitionIn: zoom,
          effects: [{ id: uid("fx"), type: "shake", intensity: 0.3 }],
        }),
      ];
      return {
        clips, duration: 12,
        canvasWidth: 1080, canvasHeight: 1080, background: "#0a0a0f",
        tracks: baseTracks, keyframes: [], transitions: [], markers: [],
      };
    },
  },
  {
    key: "title-card",
    name: "Cinematic Title",
    description: "16:9 cinematic title card with vignette and slow fade.",
    emoji: "🎬",
    canvasWidth: 1920,
    canvasHeight: 1080,
    duration: 6,
    background: "#000000",
    build() {
      const fxs: Effect[] = [
        { id: uid("fx"), type: "vignette", intensity: 0.7 },
        { id: uid("fx"), type: "scanlines", intensity: 0.15 },
      ];
      const clips: Clip[] = [
        templateClip({
          label: "Backdrop",
          mediaType: "blank",
          trackIndex: 1,
          startTime: 0, duration: 6,
          color: "#1a1a2e",
          effects: fxs,
        }),
        templateClip({
          label: "Title",
          mediaType: "text",
          text: "A CINEMATIC\nMOMENT",
          textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 140, fontWeight: 700, color: "#ffffff" },
          trackIndex: 0,
          startTime: 0.5, duration: 5,
          x: 0.1, y: 0.35, width: 0.8, height: 0.3,
          animationIn: "fade", animationOut: "fade",
          animationInDuration: 1.2, animationOutDuration: 1.2,
          color: "#ffffff",
        }),
        templateClip({
          label: "Subtitle",
          mediaType: "text",
          text: "directed by you",
          textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 48, fontWeight: 400, color: "#a3a3a3", italic: true },
          trackIndex: 0,
          startTime: 2, duration: 4,
          x: 0.1, y: 0.62, width: 0.8, height: 0.08,
          animationIn: "fade", animationOut: "fade",
          animationInDuration: 1, animationOutDuration: 1,
          color: "#a3a3a3",
        }),
      ];
      return {
        clips, duration: 6,
        canvasWidth: 1920, canvasHeight: 1080, background: "#000000",
        tracks: baseTracks, keyframes: [], transitions: [], markers: [],
      };
    },
  },
  // ────────────────────────────────────────────────────────────────────────
  // Procedurally-built template entries (46 of them) — added in Phase 2.
  // Each entry composes the same `templateClip` + `baseTracks` building
  // blocks already used above. We define them via small factory helpers so
  // we don't repeat 50 nearly-identical objects by hand.
  // ────────────────────────────────────────────────────────────────────────
  ...buildExtendedTemplates(),
  ...buildEnhancedTemplates(),
  ...buildWaveAllTemplates(),
];

/**
 * Build a "title-only" template — single backdrop + single big text + a
 * subtle outro tag. Used as the basis for many of the 46 extra templates.
 */
function buildTitleTpl(opts: {
  key: string;
  name: string;
  description: string;
  emoji: string;
  width: number;
  height: number;
  duration?: number;
  bg: string;
  title: string;
  titleColor?: string;
  titleSize?: number;
  subtitle?: string;
  fxType?: "vignette" | "glow" | "tint" | "scanlines" | "shake";
  fxColor?: string;
  category?: TemplateCategory;
}): VideoTemplate {
  const dur = opts.duration ?? 8;
  const fontSize =
    opts.titleSize ?? (opts.width > opts.height ? 160 : 200);
  return {
    key: opts.key,
    name: opts.name,
    description: opts.description,
    emoji: opts.emoji,
    canvasWidth: opts.width,
    canvasHeight: opts.height,
    duration: dur,
    background: opts.bg,
    category: opts.category,
    build() {
      const fxs: Effect[] = opts.fxType
        ? [{ id: uid("fx"), type: opts.fxType, intensity: 0.55, color: opts.fxColor }]
        : [];
      const clips: Clip[] = [
        templateClip({
          label: "Backdrop",
          mediaType: "blank",
          trackIndex: 1,
          startTime: 0,
          duration: dur,
          color: opts.bg,
          effects: fxs,
        }),
        templateClip({
          label: "Title",
          mediaType: "text",
          text: opts.title,
          textStyle: {
            ...DEFAULT_TEXT_STYLE,
            fontSize,
            fontWeight: 900,
            color: opts.titleColor ?? "#ffffff",
          },
          trackIndex: 0,
          startTime: 0.3,
          duration: dur - 0.6,
          x: 0.05,
          y: 0.36,
          width: 0.9,
          height: 0.28,
          animationIn: "zoomIn",
          animationOut: "fade",
          animationInDuration: 0.7,
          animationOutDuration: 0.7,
          color: opts.titleColor ?? "#ffffff",
        }),
        ...(opts.subtitle
          ? [templateClip({
              label: "Subtitle",
              mediaType: "text",
              text: opts.subtitle,
              textStyle: {
                ...DEFAULT_TEXT_STYLE,
                fontSize: Math.round(fontSize * 0.32),
                fontWeight: 500,
                color: "#cbd5e1",
              },
              trackIndex: 0,
              startTime: 1,
              duration: dur - 1.5,
              x: 0.1,
              y: 0.66,
              width: 0.8,
              height: 0.08,
              animationIn: "slideUp",
              animationOut: "fade",
              color: "#cbd5e1",
            })]
          : []),
      ];
      return {
        clips,
        duration: dur,
        canvasWidth: opts.width,
        canvasHeight: opts.height,
        background: opts.bg,
        tracks: baseTracks,
        keyframes: [],
        transitions: [],
        markers: [],
      };
    },
  };
}

/**
 * Build a multi-slot slideshow template (N media slots back-to-back with
 * the same crossfade transition). Includes optional intro & outro text.
 */
function buildSlideshowTpl(opts: {
  key: string;
  name: string;
  description: string;
  emoji: string;
  width: number;
  height: number;
  bg: string;
  slots: number;
  slotDuration?: number;
  transition?: ClipTransition["type"];
  intro?: string;
  outro?: string;
  palette?: string[];
}): VideoTemplate {
  const slotDur = opts.slotDuration ?? 3;
  const palette = opts.palette ?? [
    "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
    "#10b981", "#06b6d4", "#f97316", "#a855f7",
  ];
  const introDur = opts.intro ? 2 : 0;
  const outroDur = opts.outro ? 2 : 0;
  const total = introDur + opts.slots * slotDur + outroDur;
  return {
    key: opts.key,
    name: opts.name,
    description: opts.description,
    emoji: opts.emoji,
    canvasWidth: opts.width,
    canvasHeight: opts.height,
    duration: total,
    background: opts.bg,
    build() {
      const xs: ClipTransition = { type: opts.transition ?? "fade", duration: 0.5 };
      const clips: Clip[] = [];
      if (opts.intro) {
        clips.push(templateClip({
          label: "Intro",
          mediaType: "text",
          text: opts.intro,
          textStyle: {
            ...DEFAULT_TEXT_STYLE,
            fontSize: opts.width > opts.height ? 140 : 180,
            fontWeight: 900,
            color: "#ffffff",
          },
          trackIndex: 0,
          startTime: 0,
          duration: introDur,
          x: 0.05, y: 0.4, width: 0.9, height: 0.2,
          animationIn: "zoomIn",
          animationOut: "fade",
          color: "#ffffff",
        }));
      }
      for (let i = 0; i < opts.slots; i++) {
        clips.push(templateClip({
          label: `Slot ${i + 1} (replace media)`,
          mediaType: "blank",
          trackIndex: 1,
          startTime: introDur + i * slotDur,
          duration: slotDur,
          color: palette[i % palette.length],
          animationIn: i === 0 ? "fade" : "none",
          animationOut: "none",
          transitionIn: i === 0 ? { type: "none", duration: 0.5 } : xs,
        }));
      }
      if (opts.outro) {
        clips.push(templateClip({
          label: "Outro",
          mediaType: "text",
          text: opts.outro,
          textStyle: {
            ...DEFAULT_TEXT_STYLE,
            fontSize: opts.width > opts.height ? 130 : 170,
            fontWeight: 800,
            color: "#ffffff",
            background: "#000000aa",
          },
          trackIndex: 0,
          startTime: introDur + opts.slots * slotDur,
          duration: outroDur,
          x: 0.05, y: 0.4, width: 0.9, height: 0.2,
          animationIn: "slideUp",
          animationOut: "fade",
          color: "#000000",
        }));
      }
      return {
        clips,
        duration: total,
        canvasWidth: opts.width,
        canvasHeight: opts.height,
        background: opts.bg,
        tracks: baseTracks,
        keyframes: [],
        transitions: [],
        markers: [],
      };
    },
  };
}

/**
 * Build a "lower third" template — small backdrop strip at the bottom +
 * 2 lines of text. Designed to overlay onto another video.
 */
function buildLowerThirdTpl(opts: {
  key: string;
  name: string;
  emoji: string;
  width: number;
  height: number;
  bg: string;
  primary: string;
  secondary: string;
  bgColor: string;
}): VideoTemplate {
  return {
    key: opts.key,
    name: opts.name,
    description: `Lower third overlay: ${opts.primary} / ${opts.secondary}.`,
    emoji: opts.emoji,
    canvasWidth: opts.width,
    canvasHeight: opts.height,
    duration: 6,
    background: opts.bg,
    build() {
      const clips: Clip[] = [
        templateClip({
          label: "Backdrop",
          mediaType: "blank",
          trackIndex: 1,
          startTime: 0,
          duration: 6,
          color: opts.bg,
        }),
        templateClip({
          label: "Lower-3rd Strip",
          mediaType: "blank",
          trackIndex: 0,
          startTime: 0,
          duration: 6,
          x: 0.05,
          y: 0.78,
          width: 0.5,
          height: 0.12,
          color: opts.bgColor,
          borderRadius: 8,
          animationIn: "slideLeft",
          animationOut: "slideLeft",
        }),
        templateClip({
          label: "Name",
          mediaType: "text",
          text: opts.primary,
          textStyle: {
            ...DEFAULT_TEXT_STYLE,
            fontSize: 56,
            fontWeight: 800,
            color: "#ffffff",
          },
          trackIndex: 0,
          startTime: 0.3,
          duration: 5.7,
          x: 0.07,
          y: 0.79,
          width: 0.46,
          height: 0.06,
          animationIn: "slideLeft",
          animationOut: "fade",
          color: "#ffffff",
        }),
        templateClip({
          label: "Role",
          mediaType: "text",
          text: opts.secondary,
          textStyle: {
            ...DEFAULT_TEXT_STYLE,
            fontSize: 32,
            fontWeight: 500,
            color: "#cbd5e1",
          },
          trackIndex: 0,
          startTime: 0.5,
          duration: 5.5,
          x: 0.07,
          y: 0.85,
          width: 0.46,
          height: 0.05,
          animationIn: "slideLeft",
          animationOut: "fade",
          color: "#cbd5e1",
        }),
      ];
      return {
        clips,
        duration: 6,
        canvasWidth: opts.width,
        canvasHeight: opts.height,
        background: opts.bg,
        tracks: baseTracks,
        keyframes: [],
        transitions: [],
        markers: [],
      };
    },
  };
}

/**
 * Builds the 46 extra Phase-2 templates so the user has 50 in total.
 * Mix of vertical / square / landscape covering social, marketing,
 * education, news, vlog, podcast, ecommerce and cinematic use cases.
 */
function buildExtendedTemplates(): VideoTemplate[] {
  return [
    // ── Vertical / Social Story (1080×1920) ──────────────────────────────
    buildTitleTpl({ key: "story-quote",   name: "Story Quote",       description: "Bold pull-quote on dark vertical canvas.", emoji: "💬", width: 1080, height: 1920, bg: "#0f172a", title: "“Stay\nhungry.”", titleSize: 220, subtitle: "— Steve Jobs", fxType: "vignette" }),
    buildTitleTpl({ key: "story-stat",    name: "Stat Drop",         description: "Single big-number stat for vertical socials.", emoji: "📊", width: 1080, height: 1920, bg: "#1e1b4b", title: "82%", titleSize: 600, subtitle: "of users prefer vertical video", fxType: "glow", fxColor: "#a78bfa" }),
    buildTitleTpl({ key: "story-coming",  name: "Coming Soon",       description: "Vertical tease with neon glow.", emoji: "🚀", width: 1080, height: 1920, bg: "#020617", title: "COMING\nSOON", titleColor: "#22d3ee", titleSize: 240, fxType: "glow", fxColor: "#22d3ee" }),
    buildTitleTpl({ key: "story-thanks",  name: "Thank You Card",    description: "Closing thank-you screen for socials.", emoji: "🙏", width: 1080, height: 1920, bg: "#7c2d12", title: "THANK\nYOU", titleSize: 260, subtitle: "for watching", fxType: "vignette" }),
    buildSlideshowTpl({ key: "story-3-up",  name: "3-Photo Story",   description: "9:16 story with three photo slots and slide-left cuts.", emoji: "🎞️", width: 1080, height: 1920, bg: "#000", slots: 3, slotDuration: 2.5, transition: "slideLeft", intro: "STORY", outro: "FOLLOW" }),
    buildSlideshowTpl({ key: "reel-5-up",   name: "5-Clip Reel",     description: "Fast-cut vertical reel with five clip slots.", emoji: "⚡", width: 1080, height: 1920, bg: "#0f0f1a", slots: 5, slotDuration: 1.8, transition: "zoom", intro: "WATCH", outro: "LIKE & FOLLOW" }),

    // ── Square / Instagram (1080×1080) ───────────────────────────────────
    buildTitleTpl({ key: "sq-announce",   name: "Square Announcement", description: "1:1 announcement card with bold center title.", emoji: "📣", width: 1080, height: 1080, bg: "#1d4ed8", title: "BIG\nNEWS", titleSize: 260, subtitle: "Read on for the details", fxType: "glow", fxColor: "#60a5fa" }),
    buildTitleTpl({ key: "sq-quote",      name: "Square Quote",        description: "1:1 quote card for daily inspiration posts.", emoji: "🌟", width: 1080, height: 1080, bg: "#111827", title: "“Done is\nbetter than\nperfect.”", titleSize: 130, subtitle: "— Sheryl Sandberg", fxType: "vignette" }),
    buildTitleTpl({ key: "sq-event",      name: "Event Save-the-Date", description: "1:1 event teaser with date and location.", emoji: "📅", width: 1080, height: 1080, bg: "#831843", title: "OCT 12", titleSize: 320, titleColor: "#fde68a", subtitle: "Brooklyn · 7pm", fxType: "tint", fxColor: "#831843" }),
    buildSlideshowTpl({ key: "sq-trio",   name: "Square Trio",         description: "Three-slot square slideshow with crossfade.", emoji: "🟦", width: 1080, height: 1080, bg: "#0a0a0f", slots: 3, slotDuration: 3, transition: "fade", intro: "FEATURED", outro: "SHOP" }),
    buildSlideshowTpl({ key: "sq-grid",   name: "Square 4-Up",          description: "Four square slots with bouncy zoom transitions.", emoji: "▣", width: 1080, height: 1080, bg: "#000", slots: 4, slotDuration: 2, transition: "zoom", intro: "LOOKBOOK", outro: "SWIPE UP" }),

    // ── Landscape / 16:9 (1920×1080) ─────────────────────────────────────
    buildTitleTpl({ key: "ld-cinema",     name: "Cinema Slate",        description: "16:9 cinematic title with vignette and scanlines.", emoji: "🎬", width: 1920, height: 1080, bg: "#0a0a0a", title: "CHAPTER\nONE", titleColor: "#f5f5f4", titleSize: 200, subtitle: "a film by you", fxType: "vignette" }),
    buildTitleTpl({ key: "ld-news",       name: "News Title",          description: "Breaking-news style 16:9 title screen.", emoji: "📺", width: 1920, height: 1080, bg: "#7f1d1d", title: "BREAKING\nNEWS", titleColor: "#fff", titleSize: 200, subtitle: "Live · Right now", fxType: "scanlines" }),
    buildTitleTpl({ key: "ld-tutorial",   name: "Tutorial Intro",      description: "16:9 tutorial intro with friendly subtitle.", emoji: "📚", width: 1920, height: 1080, bg: "#0f766e", title: "HOW IT\nWORKS", titleSize: 180, subtitle: "A 60-second walkthrough", fxType: "glow", fxColor: "#5eead4" }),
    buildTitleTpl({ key: "ld-vlog",       name: "Vlog Intro",          description: "Casual 16:9 vlog intro card.", emoji: "🎥", width: 1920, height: 1080, bg: "#1f2937", title: "MORNING\nROUTINE", titleSize: 170, subtitle: "Day 12 of 30", fxType: "vignette" }),
    buildTitleTpl({ key: "ld-podcast",    name: "Podcast Cover",       description: "16:9 podcast cover plate with show title.", emoji: "🎙️", width: 1920, height: 1080, bg: "#3b0764", title: "DEEP\nDIVE", titleColor: "#fde68a", titleSize: 220, subtitle: "Episode 014 · The Future of AI", fxType: "glow", fxColor: "#a855f7" }),
    buildTitleTpl({ key: "ld-stream",     name: "Stream Starting Soon", description: "Twitch-style 16:9 standby screen.", emoji: "🟣", width: 1920, height: 1080, bg: "#1e1b4b", title: "STREAM\nSTARTING\nSOON", titleColor: "#a5b4fc", titleSize: 150, subtitle: "Hang tight — we begin in a few minutes", fxType: "scanlines" }),
    buildTitleTpl({ key: "ld-ending",     name: "End Screen",          description: "16:9 ending card with thanks and CTA.", emoji: "🏁", width: 1920, height: 1080, bg: "#0f172a", title: "THANKS FOR\nWATCHING", titleSize: 150, subtitle: "Subscribe for more", fxType: "vignette" }),
    buildTitleTpl({ key: "ld-countdown",  name: "Countdown Title",     description: "16:9 launch countdown title screen.", emoji: "⏳", width: 1920, height: 1080, bg: "#0c0a09", title: "T-MINUS\n10", titleColor: "#facc15", titleSize: 220, subtitle: "Until launch", fxType: "glow", fxColor: "#facc15" }),
    buildTitleTpl({ key: "ld-product",    name: "Product Reveal",      description: "16:9 product reveal title with tint.", emoji: "📦", width: 1920, height: 1080, bg: "#082f49", title: "INTRODUCING\nAURORA", titleColor: "#fff", titleSize: 150, subtitle: "Now in beta", fxType: "tint", fxColor: "#0ea5e9" }),
    buildSlideshowTpl({ key: "ld-photo-4",  name: "16:9 Photo Story",    description: "Four-slot landscape slideshow with smooth fades.", emoji: "🖼️", width: 1920, height: 1080, bg: "#000", slots: 4, slotDuration: 3, transition: "fade", intro: "MEMORIES", outro: "THE END" }),
    buildSlideshowTpl({ key: "ld-recap",    name: "Year in Review",     description: "Six-slot landscape recap with bouncy transitions.", emoji: "🎉", width: 1920, height: 1080, bg: "#1e1b4b", slots: 6, slotDuration: 2.5, transition: "zoom", intro: "2025 RECAP", outro: "HERE'S TO 2026" }),
    buildSlideshowTpl({ key: "ld-trailer",  name: "Movie Trailer",      description: "Eight-slot landscape trailer with hard cuts.", emoji: "🎞️", width: 1920, height: 1080, bg: "#000", slots: 8, slotDuration: 1.5, transition: "fade", intro: "ONE WORLD.", outro: "COMING SOON." }),
    buildSlideshowTpl({ key: "ld-product-grid", name: "Product Showcase", description: "Five product slots with zoom transitions.", emoji: "🛍️", width: 1920, height: 1080, bg: "#fafaf9", slots: 5, slotDuration: 2.4, transition: "zoom", intro: "NEW ARRIVALS", outro: "SHOP NOW", palette: ["#fda4af", "#fcd34d", "#86efac", "#93c5fd", "#c4b5fd"] }),

    // ── Vertical Marketing (1080×1920) ───────────────────────────────────
    buildTitleTpl({ key: "v-sale",        name: "Vertical Sale",       description: "Loud vertical sale promo with red glow.", emoji: "🔥", width: 1080, height: 1920, bg: "#7f1d1d", title: "70%\nOFF", titleColor: "#fef9c3", titleSize: 600, subtitle: "Today only — ends midnight", fxType: "glow", fxColor: "#dc2626" }),
    buildTitleTpl({ key: "v-bts",         name: "Behind the Scenes",   description: "Vertical BTS title card with grain.", emoji: "🎬", width: 1080, height: 1920, bg: "#1c1917", title: "BEHIND\nTHE\nSCENES", titleSize: 200, subtitle: "Day 03 on set", fxType: "scanlines" }),
    buildTitleTpl({ key: "v-recipe",      name: "Recipe Title",        description: "Vertical recipe card with warm tone.", emoji: "🍳", width: 1080, height: 1920, bg: "#fef3c7", title: "MISO\nRAMEN", titleColor: "#7c2d12", titleSize: 240, subtitle: "Ready in 25 minutes", fxType: "tint", fxColor: "#facc15" }),
    buildTitleTpl({ key: "v-fitness",     name: "Workout Of the Day",  description: "Vertical fitness intro with bold hook.", emoji: "💪", width: 1080, height: 1920, bg: "#0c0a09", title: "20 MIN\nHIIT", titleColor: "#f97316", titleSize: 260, subtitle: "No equipment · Full body", fxType: "glow", fxColor: "#f97316" }),
    buildTitleTpl({ key: "v-real-estate", name: "Listing Reveal",      description: "Vertical real-estate listing reveal.", emoji: "🏠", width: 1080, height: 1920, bg: "#0c4a6e", title: "JUST\nLISTED", titleColor: "#fff", titleSize: 220, subtitle: "3 bd · 2 ba · $785k", fxType: "vignette" }),
    buildTitleTpl({ key: "v-meditation",  name: "Calm Meditation",     description: "Soothing vertical meditation card.", emoji: "🧘", width: 1080, height: 1920, bg: "#134e4a", title: "BREATHE", titleColor: "#a7f3d0", titleSize: 240, subtitle: "Inhale · 4 · Hold · 4 · Exhale · 4", fxType: "tint", fxColor: "#5eead4" }),

    // ── Lower Thirds (six variants, all 16:9) ────────────────────────────
    buildLowerThirdTpl({ key: "lt-name",      name: "Speaker — Name",     emoji: "🪪", width: 1920, height: 1080, bg: "#111", primary: "Jane Doe",         secondary: "Founder & CEO",   bgColor: "#1d4ed8" }),
    buildLowerThirdTpl({ key: "lt-name-red",  name: "Speaker — Bold Red", emoji: "🟥", width: 1920, height: 1080, bg: "#000", primary: "Marcus Lee",       secondary: "Lead Designer",   bgColor: "#dc2626" }),
    buildLowerThirdTpl({ key: "lt-news",      name: "News Lower-3rd",     emoji: "🟦", width: 1920, height: 1080, bg: "#000", primary: "Live: New York",   secondary: "Reporting from Brooklyn", bgColor: "#0f172a" }),
    buildLowerThirdTpl({ key: "lt-podcast",   name: "Podcast Guest",      emoji: "🎤", width: 1920, height: 1080, bg: "#1c1917", primary: "Dr. Priya Patel", secondary: "Author · Atomic Mind", bgColor: "#7c3aed" }),
    buildLowerThirdTpl({ key: "lt-vlog",      name: "Vlog Caption",       emoji: "💬", width: 1920, height: 1080, bg: "#0c0a09", primary: "Tokyo, Japan",    secondary: "Day 4 of 12",     bgColor: "#16a34a" }),
    buildLowerThirdTpl({ key: "lt-cta",       name: "Subscribe Strip",    emoji: "🔔", width: 1920, height: 1080, bg: "#000", primary: "Subscribe!",       secondary: "Hit the bell for more", bgColor: "#ef4444" }),

    // ── Cinematic / Title-Card variants ──────────────────────────────────
    buildTitleTpl({ key: "cine-noir",     name: "Film Noir Title",     description: "Black-and-white noir intro with vignette.", emoji: "🕵️", width: 1920, height: 1080, bg: "#000", title: "THE LAST\nCASE", titleColor: "#f5f5f4", titleSize: 180, subtitle: "A short film", fxType: "vignette" }),
    buildTitleTpl({ key: "cine-vhs",      name: "VHS Throwback",       description: "Retro VHS scanline title.", emoji: "📼", width: 1920, height: 1080, bg: "#1c1917", title: "REWIND\n1995", titleColor: "#fde68a", titleSize: 180, subtitle: "▶ PLAY", fxType: "scanlines" }),
    buildTitleTpl({ key: "cine-glitch",   name: "Glitch Intro",        description: "Glitchy shake intro for music videos.", emoji: "📡", width: 1920, height: 1080, bg: "#020617", title: "404", titleColor: "#22d3ee", titleSize: 380, subtitle: "// signal lost", fxType: "shake" }),
    buildTitleTpl({ key: "cine-aurora",   name: "Aurora Tint",         description: "Cool aurora-tinted title screen.", emoji: "🌌", width: 1920, height: 1080, bg: "#0f172a", title: "DREAMSCAPE", titleColor: "#a5f3fc", titleSize: 170, subtitle: "An ambient journey", fxType: "tint", fxColor: "#22d3ee" }),
    buildTitleTpl({ key: "cine-gold",     name: "Golden Hour",         description: "Warm golden-hour title with glow.", emoji: "🌅", width: 1920, height: 1080, bg: "#7c2d12", title: "GOLDEN\nHOUR", titleColor: "#fde68a", titleSize: 200, subtitle: "Sunset shoot · take one", fxType: "glow", fxColor: "#fbbf24" }),

    // ── Educational / Marketing extras (mixed orientations) ─────────────
    buildSlideshowTpl({ key: "edu-3-tip",  name: "3 Tips Slideshow",  description: "Vertical 3-tip carousel for tutorials.",      emoji: "💡", width: 1080, height: 1920, bg: "#0f172a", slots: 3, slotDuration: 3.5, transition: "slideUp", intro: "3 TIPS", outro: "WHICH TIP?" }),
    buildSlideshowTpl({ key: "edu-howto",  name: "How-To Stepper",    description: "Square 4-step how-to with hard cuts.",         emoji: "🪜", width: 1080, height: 1080, bg: "#020617", slots: 4, slotDuration: 3, transition: "slideLeft", intro: "HOW TO", outro: "TRY IT" }),
    buildTitleTpl({ key: "edu-q-and-a",   name: "Q&A Card",          description: "Square Q&A title with bold question.",         emoji: "❓", width: 1080, height: 1080, bg: "#1d4ed8", title: "Q:\nWHY VIDEO?", titleSize: 130, subtitle: "Tap to find out", fxType: "glow", fxColor: "#60a5fa" }),
    buildSlideshowTpl({ key: "promo-flash", name: "Flash Sale",       description: "Rapid-cut vertical flash-sale promo.",         emoji: "⚡", width: 1080, height: 1920, bg: "#7f1d1d", slots: 4, slotDuration: 1.2, transition: "zoom", intro: "FLASH SALE", outro: "ENDS TONIGHT" }),
    buildSlideshowTpl({ key: "promo-luxe",  name: "Luxe Reveal",      description: "Slow elegant 16:9 luxury product reveal.",     emoji: "💎", width: 1920, height: 1080, bg: "#000", slots: 3, slotDuration: 4, transition: "fade", intro: "INTRODUCING", outro: "AVAILABLE NOW", palette: ["#fde68a", "#fff", "#fcd34d"] }),
    buildTitleTpl({ key: "promo-coupon",   name: "Coupon Code",       description: "Square coupon code blast with shake.",         emoji: "🎟️", width: 1080, height: 1080, bg: "#0c0a09", title: "USE CODE\nFLOW20", titleColor: "#fde68a", titleSize: 170, subtitle: "20% off your first order", fxType: "shake" }),
    buildTitleTpl({ key: "promo-launch",   name: "Launch Day",        description: "Vertical launch-day countdown card.",          emoji: "🎉", width: 1080, height: 1920, bg: "#1e1b4b", title: "LAUNCH\nDAY", titleColor: "#fff", titleSize: 240, subtitle: "Doors open at 9am PT", fxType: "glow", fxColor: "#a855f7" }),

    // ── Bulk generator: 1,500 procedurally-built templates ──────────────
    ...buildBulkTemplates(),
  ];
}


// ─────────────────────────────────────────────────────────────────────────────
// Phase-3 Enhanced Templates — 100+ rich compositions using particles,
// special layers, gradients, waves, shapes and multi-layer stacks.
// ─────────────────────────────────────────────────────────────────────────────
function buildEnhancedTemplates(): VideoTemplate[] {
  const ret: VideoTemplate[] = [];

  // ── helpers ──────────────────────────────────────────────────────────────
  function tpl(key: string, name: string, description: string, emoji: string,
    w: number, h: number, dur: number, bg: string,
    build: () => Clip[], category?: import("./templates").TemplateCategory): VideoTemplate {
    return {
      key, name, description, emoji,
      canvasWidth: w, canvasHeight: h, duration: dur, background: bg,
      category,
      build() {
        return { clips: build(), duration: dur, canvasWidth: w, canvasHeight: h, background: bg, tracks: baseTracks, keyframes: [], transitions: [], markers: [] };
      },
    };
  }

  // shared fades
  const fadeIn: ClipTransition = { type: "fade", duration: 0.6 };
  const zoomIn: ClipTransition = { type: "zoom", duration: 0.5 };
  const slideL: ClipTransition = { type: "slideLeft", duration: 0.45 };

  // ── 1. Particle Intro Templates ───────────────────────────────────────────
  ret.push(tpl("part-confetti-reel", "Confetti Reel", "9:16 reel with golden confetti shower overlay.", "🎊", 1080, 1920, 12, "#0f0f1a", () => [
    templateClip({ label: "Backdrop", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 12, color: "#1e0a3c", effects: [{ id: uid("fx"), type: "tint", intensity: 0.5, color: "#7c3aed" }] }),
    templateClip({ label: "Confetti", mediaType: "particles", particleKey: "confettiGold", trackIndex: 1, startTime: 0, duration: 12, opacity: 0.9, blendMode: "screen" } as any),
    templateClip({ label: "Title", mediaType: "text", text: "CELEBRATE!", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 200, fontWeight: 900, color: "#fde68a" }, trackIndex: 0, startTime: 0.5, duration: 10, x: 0.05, y: 0.38, width: 0.9, height: 0.24, animationIn: "zoomIn", animationOut: "fade", color: "#fde68a", effects: [{ id: uid("fx"), type: "glow", intensity: 0.8, color: "#fbbf24" }] }),
    templateClip({ label: "Subtitle", mediaType: "text", text: "Share the moment", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 80, fontWeight: 400, color: "#fff", italic: true }, trackIndex: 0, startTime: 1.5, duration: 9, x: 0.1, y: 0.65, width: 0.8, height: 0.09, animationIn: "slideUp", animationOut: "fade", color: "#fff" }),
  ]));

  ret.push(tpl("part-snow-winter", "Winter Snow Intro", "Cozy vertical winter opener with falling snow.", "❄️", 1080, 1920, 10, "#0a1628", () => [
    templateClip({ label: "Slot (replace)", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 10, color: "#0a1628" }),
    templateClip({ label: "Snow", mediaType: "particles", particleKey: "snowfall", trackIndex: 1, startTime: 0, duration: 10, opacity: 0.85 } as any),
    templateClip({ label: "Title", mediaType: "text", text: "WINTER\nWONDERLAND", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 160, fontWeight: 800, color: "#e0f2fe" }, trackIndex: 0, startTime: 0.8, duration: 8.5, x: 0.05, y: 0.35, width: 0.9, height: 0.3, animationIn: "fade", animationOut: "fade", animationInDuration: 1.2, animationOutDuration: 1, color: "#e0f2fe", effects: [{ id: uid("fx"), type: "glow", intensity: 0.5, color: "#bae6fd" }] }),
  ]));

  ret.push(tpl("part-fireflies", "Firefly Night", "Dreamy firefly particle night scene.", "✨", 1080, 1920, 12, "#020c18", () => [
    templateClip({ label: "Night Sky", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 12, color: "#020c18" }),
    templateClip({ label: "Fireflies", mediaType: "particles", particleKey: "fireflies", trackIndex: 1, startTime: 0, duration: 12, opacity: 0.95, blendMode: "screen" } as any),
    templateClip({ label: "Quote", mediaType: "text", text: '"Chase the\nlight."', textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 140, fontWeight: 700, color: "#fef9c3", italic: true }, trackIndex: 0, startTime: 1, duration: 10, x: 0.05, y: 0.38, width: 0.9, height: 0.24, animationIn: "fade", animationOut: "fade", animationInDuration: 1.5, color: "#fef9c3" }),
  ]));

  ret.push(tpl("part-magic-smoke", "Magic Smoke", "Ethereal smoke particle intro with neon glow.", "🌫️", 1080, 1920, 10, "#050510", () => [
    templateClip({ label: "BG", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 10, color: "#050510" }),
    templateClip({ label: "Smoke", mediaType: "particles", particleKey: "smokeTrail", trackIndex: 1, startTime: 0, duration: 10, opacity: 0.6, blendMode: "screen" } as any),
    templateClip({ label: "Glow Particles", mediaType: "particles", particleKey: "glowOrbs", trackIndex: 1, startTime: 0.5, duration: 9.5, opacity: 0.8, blendMode: "screen" } as any),
    templateClip({ label: "Title", mediaType: "text", text: "MYSTIC", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 280, fontWeight: 900, color: "#a78bfa" }, trackIndex: 0, startTime: 1, duration: 8, x: 0.05, y: 0.38, width: 0.9, height: 0.24, animationIn: "fade", animationOut: "fade", color: "#a78bfa", effects: [{ id: uid("fx"), type: "glow", intensity: 0.9, color: "#7c3aed" }] }),
  ]));

  ret.push(tpl("part-hearts", "Hearts Explosion", "Valentine/love theme with heart particles.", "❤️", 1080, 1920, 8, "#1f0a0a", () => [
    templateClip({ label: "BG", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 8, color: "#1f0a0a" }),
    templateClip({ label: "Hearts", mediaType: "particles", particleKey: "hearts", trackIndex: 1, startTime: 0, duration: 8, opacity: 0.9, blendMode: "screen" } as any),
    templateClip({ label: "Title", mediaType: "text", text: "WITH\nLOVE", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 220, fontWeight: 900, color: "#fda4af" }, trackIndex: 0, startTime: 0.5, duration: 7, x: 0.05, y: 0.38, width: 0.9, height: 0.24, animationIn: "zoomIn", animationOut: "fade", color: "#fda4af", effects: [{ id: uid("fx"), type: "glow", intensity: 0.7, color: "#f43f5e" }] }),
  ]));

  ret.push(tpl("part-bubbles-sq", "Bubble Pop Square", "1:1 bubble-particle intro for social.", "🫧", 1080, 1080, 8, "#0ea5e9", () => [
    templateClip({ label: "BG", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 8, color: "#0ea5e9" }),
    templateClip({ label: "Bubbles", mediaType: "particles", particleKey: "bubbles", trackIndex: 1, startTime: 0, duration: 8, opacity: 0.7 } as any),
    templateClip({ label: "Title", mediaType: "text", text: "NEW DROP!", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 200, fontWeight: 900, color: "#fff" }, trackIndex: 0, startTime: 0.5, duration: 7, x: 0.05, y: 0.38, width: 0.9, height: 0.24, animationIn: "bounce", animationOut: "fade", color: "#fff" }),
  ]));

  ret.push(tpl("part-glitter-fashion", "Glitter Fashion", "16:9 glitter intro for fashion/beauty content.", "💫", 1920, 1080, 10, "#18061e", () => [
    templateClip({ label: "Slot (replace)", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 10, color: "#18061e" }),
    templateClip({ label: "Glitter", mediaType: "particles", particleKey: "glitter", trackIndex: 1, startTime: 0, duration: 10, opacity: 0.8, blendMode: "screen" } as any),
    templateClip({ label: "Title", mediaType: "text", text: "GLAM\nLOOKBOOK", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 140, fontWeight: 900, color: "#fde68a" }, trackIndex: 0, startTime: 0.5, duration: 9, x: 0.1, y: 0.35, width: 0.8, height: 0.3, animationIn: "fade", animationOut: "fade", color: "#fde68a", effects: [{ id: uid("fx"), type: "glow", intensity: 0.7, color: "#fbbf24" }] }),
  ]));

  ret.push(tpl("part-sparks-tech", "Sparks Tech", "16:9 electrical sparks for tech/gaming intros.", "⚡", 1920, 1080, 8, "#020617", () => [
    templateClip({ label: "BG", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 8, color: "#020617" }),
    templateClip({ label: "Sparks", mediaType: "particles", particleKey: "electricSparks", trackIndex: 1, startTime: 0, duration: 8, opacity: 0.9, blendMode: "screen" } as any),
    templateClip({ label: "Title", mediaType: "text", text: "POWER\nUP", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 200, fontWeight: 900, color: "#22d3ee" }, trackIndex: 0, startTime: 0.5, duration: 7, x: 0.1, y: 0.35, width: 0.8, height: 0.3, animationIn: "slideLeft", animationOut: "fade", color: "#22d3ee", effects: [{ id: uid("fx"), type: "glow", intensity: 0.9, color: "#0ea5e9" }] }),
  ]));

  // ── 2. Special Layer Cinematic Templates ──────────────────────────────────
  ret.push(tpl("sl-lightleak-travel", "Light Leak Travel", "Vertical travel vlog with warm light leak.", "🌄", 1080, 1920, 12, "#0a0a0a", () => [
    templateClip({ label: "Video Slot", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 12, color: "#1a1a2e" }),
    templateClip({ label: "Light Leak", mediaType: "specialLayer", specialLayerKey: "lightLeakWarm", trackIndex: 1, startTime: 0, duration: 12, opacity: 0.7, blendMode: "screen" } as any),
    templateClip({ label: "Vignette", mediaType: "specialLayer", specialLayerKey: "softVignette", trackIndex: 1, startTime: 0, duration: 12, opacity: 0.6 } as any),
    templateClip({ label: "Destination", mediaType: "text", text: "BALI,\nINDONESIA", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 180, fontWeight: 900, color: "#fff" }, trackIndex: 0, startTime: 1, duration: 5, x: 0.05, y: 0.35, width: 0.9, height: 0.3, animationIn: "slideUp", animationOut: "fade", color: "#fff" }),
    templateClip({ label: "Tagline", mediaType: "text", text: "Day 03 of 14", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 70, fontWeight: 400, color: "#fde68a", italic: true }, trackIndex: 0, startTime: 1.5, duration: 4, x: 0.1, y: 0.67, width: 0.8, height: 0.07, animationIn: "fade", animationOut: "fade", color: "#fde68a" }),
  ]));

  ret.push(tpl("sl-film-grain-mood", "Film Grain Mood", "16:9 moody film-grain cinematic with vignette.", "🎞️", 1920, 1080, 8, "#0c0c0c", () => [
    templateClip({ label: "Video Slot", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 8, color: "#1c1c1c" }),
    templateClip({ label: "Film Grain", mediaType: "specialLayer", specialLayerKey: "filmGrainMed", trackIndex: 1, startTime: 0, duration: 8, opacity: 0.5 } as any),
    templateClip({ label: "Vignette", mediaType: "specialLayer", specialLayerKey: "softVignette", trackIndex: 1, startTime: 0, duration: 8, opacity: 0.8 } as any),
    templateClip({ label: "Title", mediaType: "text", text: "THE FILM", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 150, fontWeight: 700, color: "#f5f5f4" }, trackIndex: 0, startTime: 0.8, duration: 6.5, x: 0.1, y: 0.38, width: 0.8, height: 0.24, animationIn: "fade", animationOut: "fade", animationInDuration: 1.2, color: "#f5f5f4" }),
    templateClip({ label: "Director", mediaType: "text", text: "a film by you", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 48, fontWeight: 400, color: "#a3a3a3", italic: true }, trackIndex: 0, startTime: 2, duration: 5.5, x: 0.1, y: 0.62, width: 0.8, height: 0.07, animationIn: "fade", animationOut: "fade", color: "#a3a3a3" }),
  ]));

  ret.push(tpl("sl-scanlines-retro", "Retro TV Broadcast", "VHS scanlines retro broadcast style.", "📺", 1920, 1080, 8, "#1a1a1a", () => [
    templateClip({ label: "Slot", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 8, color: "#1a1a1a" }),
    templateClip({ label: "Scanlines", mediaType: "specialLayer", specialLayerKey: "scanlinesThin", trackIndex: 1, startTime: 0, duration: 8, opacity: 0.5 } as any),
    templateClip({ label: "V Scanlines", mediaType: "specialLayer", specialLayerKey: "vScanlines", trackIndex: 1, startTime: 0, duration: 8, opacity: 0.2 } as any),
    templateClip({ label: "Title", mediaType: "text", text: "▶ LIVE\nBROADCAST", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 130, fontWeight: 700, color: "#fbbf24" }, trackIndex: 0, startTime: 0.5, duration: 7, x: 0.1, y: 0.35, width: 0.8, height: 0.3, animationIn: "slideLeft", animationOut: "fade", color: "#fbbf24" }),
  ]));

  ret.push(tpl("sl-lensflare-epic", "Epic Lens Flare", "9:16 action reel with cool lens flare.", "☀️", 1080, 1920, 10, "#020617", () => [
    templateClip({ label: "Slot", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 10, color: "#020617" }),
    templateClip({ label: "Lens Flare", mediaType: "specialLayer", specialLayerKey: "lensFlareCool", trackIndex: 1, startTime: 0, duration: 10, opacity: 0.8, blendMode: "screen" } as any),
    templateClip({ label: "Sun Flare", mediaType: "specialLayer", specialLayerKey: "sunFlare", trackIndex: 1, startTime: 2, duration: 8, opacity: 0.6, blendMode: "screen" } as any),
    templateClip({ label: "Hook", mediaType: "text", text: "EPIC\nMOMENTS", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 210, fontWeight: 900, color: "#fff" }, trackIndex: 0, startTime: 0.5, duration: 9, x: 0.05, y: 0.38, width: 0.9, height: 0.24, animationIn: "zoomIn", animationOut: "fade", color: "#fff" }),
  ]));

  ret.push(tpl("sl-diag-stripes", "Diagonal Stripes Reveal", "Square diagonal-stripe overlay with title.", "📐", 1080, 1080, 8, "#0f172a", () => [
    templateClip({ label: "BG", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 8, color: "#0f172a" }),
    templateClip({ label: "Stripes", mediaType: "specialLayer", specialLayerKey: "stripesDiag", trackIndex: 1, startTime: 0, duration: 8, opacity: 0.25 } as any),
    templateClip({ label: "Title", mediaType: "text", text: "BOLD\nDESIGN", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 200, fontWeight: 900, color: "#fff" }, trackIndex: 0, startTime: 0.5, duration: 7, x: 0.05, y: 0.38, width: 0.9, height: 0.24, animationIn: "slideLeft", animationOut: "fade", color: "#fff" }),
  ]));

  ret.push(tpl("sl-rose-leak-beauty", "Rose Light Beauty", "Vertical beauty/fashion with rose light leak.", "🌹", 1080, 1920, 12, "#18060a", () => [
    templateClip({ label: "Slot", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 12, color: "#18060a" }),
    templateClip({ label: "Rose Leak", mediaType: "specialLayer", specialLayerKey: "lightLeakRose", trackIndex: 1, startTime: 0, duration: 12, opacity: 0.75, blendMode: "screen" } as any),
    templateClip({ label: "Vignette", mediaType: "specialLayer", specialLayerKey: "softVignette", trackIndex: 1, startTime: 0, duration: 12, opacity: 0.7 } as any),
    templateClip({ label: "Brand", mediaType: "text", text: "NEW\nCOLLECTION", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 180, fontWeight: 900, color: "#fda4af" }, trackIndex: 0, startTime: 1, duration: 10, x: 0.05, y: 0.38, width: 0.9, height: 0.24, animationIn: "fade", animationOut: "fade", color: "#fda4af" }),
  ]));

  ret.push(tpl("sl-violet-leak-music", "Violet Music Intro", "Music video intro with violet light and glow.", "🎵", 1080, 1920, 10, "#0d001a", () => [
    templateClip({ label: "BG", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 10, color: "#0d001a" }),
    templateClip({ label: "Violet Leak", mediaType: "specialLayer", specialLayerKey: "lightLeakViolet", trackIndex: 1, startTime: 0, duration: 10, opacity: 0.8, blendMode: "screen" } as any),
    templateClip({ label: "Edge Glow", mediaType: "specialLayer", specialLayerKey: "edgeGlowWhite", trackIndex: 1, startTime: 0, duration: 10, opacity: 0.4, blendMode: "screen" } as any),
    templateClip({ label: "Artist", mediaType: "text", text: "NOW\nPLAYING", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 190, fontWeight: 900, color: "#c4b5fd" }, trackIndex: 0, startTime: 0.8, duration: 8.5, x: 0.05, y: 0.38, width: 0.9, height: 0.24, animationIn: "zoomIn", animationOut: "fade", color: "#c4b5fd", effects: [{ id: uid("fx"), type: "glow", intensity: 0.8, color: "#7c3aed" }] }),
  ]));

  // ── 3. Gradient Background Templates ─────────────────────────────────────
  ret.push(tpl("grad-sunset-quote", "Sunset Gradient Quote", "Warm sunset gradient with inspirational quote.", "🌅", 1080, 1920, 10, "#ff6b00", () => [
    templateClip({ label: "Sunset BG", mediaType: "gradient", trackIndex: 2, startTime: 0, duration: 10, color: "#ff6b00" } as any),
    templateClip({ label: "Quote", mediaType: "text", text: '"Every sunset is\nan opportunity to\nreset."', textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 100, fontWeight: 700, color: "#fff", italic: true }, trackIndex: 0, startTime: 0.8, duration: 8.5, x: 0.07, y: 0.28, width: 0.86, height: 0.44, animationIn: "fade", animationOut: "fade", animationInDuration: 1.2, color: "#fff" }),
    templateClip({ label: "Attribution", mediaType: "text", text: "— unknown", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 60, fontWeight: 400, color: "#fed7aa", italic: true }, trackIndex: 0, startTime: 1.5, duration: 8, x: 0.1, y: 0.75, width: 0.8, height: 0.07, animationIn: "slideUp", animationOut: "fade", color: "#fed7aa" }),
  ]));

  ret.push(tpl("grad-neon-cyber", "Neon Cyberpunk", "Square neon cyberpunk gradient promo.", "🌆", 1080, 1080, 8, "#0d0221", () => [
    templateClip({ label: "Cyber BG", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 8, color: "#0d0221", effects: [{ id: uid("fx"), type: "tint", intensity: 0.3, color: "#00f5ff" }] }),
    templateClip({ label: "Grid Overlay", mediaType: "specialLayer", specialLayerKey: "stripesDiag", trackIndex: 1, startTime: 0, duration: 8, opacity: 0.15 } as any),
    templateClip({ label: "Title", mediaType: "text", text: "CYBER\n2077", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 200, fontWeight: 900, color: "#00f5ff" }, trackIndex: 0, startTime: 0.3, duration: 7.5, x: 0.05, y: 0.38, width: 0.9, height: 0.24, animationIn: "slideLeft", animationOut: "fade", color: "#00f5ff", effects: [{ id: uid("fx"), type: "glow", intensity: 0.9, color: "#0ea5e9" }] }),
  ]));

  ret.push(tpl("grad-aurora-title", "Aurora Borealis Title", "16:9 aurora northern lights title card.", "🌌", 1920, 1080, 8, "#0a0e27", () => [
    templateClip({ label: "Aurora BG", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 8, color: "#0a0e27", effects: [{ id: uid("fx"), type: "tint", intensity: 0.4, color: "#34d399" }] }),
    templateClip({ label: "Amber Glow", mediaType: "specialLayer", specialLayerKey: "lightLeakAmber", trackIndex: 1, startTime: 0, duration: 8, opacity: 0.35, blendMode: "screen" } as any),
    templateClip({ label: "Top Glow", mediaType: "specialLayer", specialLayerKey: "topGlow", trackIndex: 1, startTime: 0, duration: 8, opacity: 0.5, blendMode: "screen" } as any),
    templateClip({ label: "Title", mediaType: "text", text: "NORTHERN\nLIGHTS", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 170, fontWeight: 900, color: "#a7f3d0" }, trackIndex: 0, startTime: 0.8, duration: 6.5, x: 0.1, y: 0.35, width: 0.8, height: 0.3, animationIn: "fade", animationOut: "fade", animationInDuration: 1, color: "#a7f3d0", effects: [{ id: uid("fx"), type: "glow", intensity: 0.6, color: "#34d399" }] }),
  ]));

  // ── 4. Multi-Layer Social Templates ──────────────────────────────────────
  ret.push(tpl("social-travel-reel", "Travel Reel Pro", "9:16 travel reel: 4 slots + light leak + title.", "✈️", 1080, 1920, 20, "#000", () => {
    const clips: Clip[] = [];
    const colors = ["#1d4ed8", "#0f766e", "#92400e", "#4c1d95"];
    colors.forEach((c, i) => {
      clips.push(templateClip({ label: `Location ${i + 1} (replace)`, mediaType: "blank", trackIndex: 2, startTime: i * 4, duration: 4, color: c, transitionIn: i === 0 ? { type: "none", duration: 0.4 } : zoomIn }));
    });
    clips.push(templateClip({ label: "Light Leak", mediaType: "specialLayer", specialLayerKey: "lightLeakWarm", trackIndex: 1, startTime: 0, duration: 20, opacity: 0.5, blendMode: "screen" } as any));
    clips.push(templateClip({ label: "Film Grain", mediaType: "specialLayer", specialLayerKey: "filmGrainLight", trackIndex: 1, startTime: 0, duration: 20, opacity: 0.4 } as any));
    clips.push(templateClip({ label: "Trip Name", mediaType: "text", text: "SUMMER\n2025", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 200, fontWeight: 900, color: "#fff" }, trackIndex: 0, startTime: 0.5, duration: 3, x: 0.05, y: 0.38, width: 0.9, height: 0.24, animationIn: "zoomIn", animationOut: "fade", color: "#fff" }));
    clips.push(templateClip({ label: "CTA", mediaType: "text", text: "FOLLOW THE\nJOURNEY →", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 110, fontWeight: 800, color: "#fde68a" }, trackIndex: 0, startTime: 16.5, duration: 3, x: 0.05, y: 0.42, width: 0.9, height: 0.16, animationIn: "slideUp", animationOut: "fade", color: "#fde68a" }));
    return clips;
  }));

  ret.push(tpl("social-product-launch", "Product Launch Reel", "9:16 product reveal: hero + 3 features + CTA.", "🛍️", 1080, 1920, 18, "#000", () => [
    templateClip({ label: "Hero Shot (replace)", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 5, color: "#1d4ed8", transitionIn: { type: "none", duration: 0.4 } }),
    templateClip({ label: "Feature 1 (replace)", mediaType: "blank", trackIndex: 2, startTime: 5, duration: 4, color: "#0f766e", transitionIn: slideL }),
    templateClip({ label: "Feature 2 (replace)", mediaType: "blank", trackIndex: 2, startTime: 9, duration: 4, color: "#92400e", transitionIn: slideL }),
    templateClip({ label: "CTA Slot (replace)", mediaType: "blank", trackIndex: 2, startTime: 13, duration: 5, color: "#1e1b4b", transitionIn: fadeIn }),
    templateClip({ label: "Product Name", mediaType: "text", text: "INTRODUCING\nPRO X", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 160, fontWeight: 900, color: "#fff" }, trackIndex: 0, startTime: 0.5, duration: 4, x: 0.05, y: 0.38, width: 0.9, height: 0.24, animationIn: "fade", animationOut: "fade", color: "#fff" }),
    templateClip({ label: "Feature Text 1", mediaType: "text", text: "10x Faster", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 130, fontWeight: 800, color: "#34d399" }, trackIndex: 0, startTime: 5.5, duration: 3, x: 0.1, y: 0.42, width: 0.8, height: 0.16, animationIn: "slideLeft", animationOut: "fade", color: "#34d399" }),
    templateClip({ label: "Feature Text 2", mediaType: "text", text: "5x Better", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 130, fontWeight: 800, color: "#fbbf24" }, trackIndex: 0, startTime: 9.5, duration: 3, x: 0.1, y: 0.42, width: 0.8, height: 0.16, animationIn: "slideLeft", animationOut: "fade", color: "#fbbf24" }),
    templateClip({ label: "Buy CTA", mediaType: "text", text: "SHOP NOW\n→ link in bio", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 130, fontWeight: 900, color: "#fde68a" }, trackIndex: 0, startTime: 13.5, duration: 4, x: 0.05, y: 0.42, width: 0.9, height: 0.16, animationIn: "bounce", animationOut: "fade", color: "#fde68a" }),
  ]));

  ret.push(tpl("social-before-after", "Before & After Reel", "Square before/after split reveal.", "🔄", 1080, 1080, 10, "#0a0a0a", () => [
    templateClip({ label: "Before (replace)", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 4.5, color: "#374151" }),
    templateClip({ label: "After (replace)", mediaType: "blank", trackIndex: 2, startTime: 4.5, duration: 5.5, color: "#1d4ed8", transitionIn: { type: "slideLeft", duration: 0.6 } }),
    templateClip({ label: "BEFORE label", mediaType: "text", text: "BEFORE", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 100, fontWeight: 900, color: "#f87171" }, trackIndex: 0, startTime: 0.3, duration: 3.8, x: 0.1, y: 0.1, width: 0.35, height: 0.12, animationIn: "fade", animationOut: "fade", color: "#f87171" }),
    templateClip({ label: "AFTER label", mediaType: "text", text: "AFTER ✨", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 100, fontWeight: 900, color: "#34d399" }, trackIndex: 0, startTime: 5, duration: 4.5, x: 0.1, y: 0.1, width: 0.5, height: 0.12, animationIn: "fade", animationOut: "fade", color: "#34d399", effects: [{ id: uid("fx"), type: "glow", intensity: 0.6, color: "#10b981" }] }),
  ]));

  // ── 5. Brand / Agency Templates ───────────────────────────────────────────
  ret.push(tpl("brand-agency-reveal", "Agency Logo Reveal", "16:9 agency/brand logo reveal with particles.", "🏢", 1920, 1080, 8, "#000", () => [
    templateClip({ label: "BG", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 8, color: "#000" }),
    templateClip({ label: "Glitter", mediaType: "particles", particleKey: "glitter", trackIndex: 1, startTime: 0, duration: 8, opacity: 0.6, blendMode: "screen" } as any),
    templateClip({ label: "Logo Slot", mediaType: "blank", trackIndex: 0, startTime: 1, duration: 6, x: 0.3, y: 0.3, width: 0.4, height: 0.4, color: "#1d4ed8", borderRadius: 12, animationIn: "zoomIn", animationOut: "fade" }),
    templateClip({ label: "Tagline", mediaType: "text", text: "We Make It Happen", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 60, fontWeight: 500, color: "#cbd5e1", italic: true }, trackIndex: 0, startTime: 2.5, duration: 5, x: 0.1, y: 0.75, width: 0.8, height: 0.08, animationIn: "slideUp", animationOut: "fade", color: "#cbd5e1" }),
  ]));

  ret.push(tpl("brand-minimal-reveal", "Minimal Brand Reveal", "Clean white-on-black brand intro.", "⬜", 1920, 1080, 6, "#000", () => [
    templateClip({ label: "BG", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 6, color: "#000" }),
    templateClip({ label: "Logo Area", mediaType: "blank", trackIndex: 0, startTime: 0.5, duration: 5, x: 0.3, y: 0.25, width: 0.4, height: 0.5, color: "#111", borderRadius: 4, animationIn: "fade", animationOut: "fade" }),
    templateClip({ label: "Brand Name", mediaType: "text", text: "BRAND", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 180, fontWeight: 900, color: "#fff" }, trackIndex: 0, startTime: 1, duration: 4.5, x: 0.1, y: 0.35, width: 0.8, height: 0.3, animationIn: "fade", animationOut: "fade", animationInDuration: 1.2, color: "#fff" }),
    templateClip({ label: "Divider", mediaType: "blank", trackIndex: 0, startTime: 1.5, duration: 4, x: 0.35, y: 0.61, width: 0.3, height: 0.01, color: "#fff", animationIn: "slideLeft", animationOut: "fade" }),
    templateClip({ label: "Tagline", mediaType: "text", text: "est. 2025", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 42, fontWeight: 400, color: "#737373", italic: true }, trackIndex: 0, startTime: 2, duration: 4, x: 0.2, y: 0.65, width: 0.6, height: 0.07, animationIn: "fade", animationOut: "fade", color: "#737373" }),
  ]));

  ret.push(tpl("brand-colorblock", "Color Block Brand", "Bold color-block split-screen brand template.", "🟥", 1920, 1080, 8, "#dc2626", () => [
    templateClip({ label: "Red Half", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 8, x: 0, y: 0, width: 0.5, height: 1, color: "#dc2626", animationIn: "slideLeft" }),
    templateClip({ label: "Black Half", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 8, x: 0.5, y: 0, width: 0.5, height: 1, color: "#000", animationIn: "slideLeft" }),
    templateClip({ label: "Brand Name", mediaType: "text", text: "YOUR\nBRAND", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 150, fontWeight: 900, color: "#fff" }, trackIndex: 0, startTime: 0.6, duration: 7, x: 0.05, y: 0.35, width: 0.45, height: 0.3, animationIn: "slideLeft", animationOut: "fade", color: "#fff" }),
    templateClip({ label: "Slogan", mediaType: "text", text: "Design. Create.\nInspire.", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 70, fontWeight: 400, color: "#f5f5f5" }, trackIndex: 0, startTime: 1, duration: 6.5, x: 0.55, y: 0.35, width: 0.4, height: 0.3, animationIn: "slideLeft", animationOut: "fade", color: "#f5f5f5" }),
  ]));

  // ── 6. Typographic Animation Templates ───────────────────────────────────
  ret.push(tpl("typo-word-by-word", "Word-by-Word Reveal", "Sequential word reveal for quotes/lyrics.", "💬", 1080, 1920, 10, "#0f0f0f", () => {
    const words = ["EVERY", "DAY", "IS", "A", "GIFT."];
    return words.map((w, i) => templateClip({ label: w, mediaType: "text", text: w, textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 240, fontWeight: 900, color: "#fff" }, trackIndex: 0, startTime: i * 1.8, duration: i < words.length - 1 ? 1.6 : 3, x: 0.05, y: 0.38, width: 0.9, height: 0.24, animationIn: "zoomIn", animationOut: "fade", animationInDuration: 0.3, animationOutDuration: 0.3, color: "#fff", transitionIn: { type: "none", duration: 0 } }));
  }));

  ret.push(tpl("typo-kinetic-sq", "Kinetic Typography", "Square kinetic text for podcast/quote posts.", "🎙️", 1080, 1080, 12, "#111827", () => [
    templateClip({ label: "BG", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 12, color: "#111827" }),
    templateClip({ label: "Line 1", mediaType: "text", text: "THINK", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 230, fontWeight: 900, color: "#f9fafb" }, trackIndex: 0, startTime: 0.3, duration: 3.5, x: 0.05, y: 0.12, width: 0.9, height: 0.28, animationIn: "slideLeft", animationOut: "fade", color: "#f9fafb" }),
    templateClip({ label: "Line 2", mediaType: "text", text: "BIGGER.", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 230, fontWeight: 900, color: "#fbbf24" }, trackIndex: 0, startTime: 0.8, duration: 4, x: 0.05, y: 0.42, width: 0.9, height: 0.28, animationIn: "slideLeft", animationOut: "fade", color: "#fbbf24" }),
    templateClip({ label: "Line 3", mediaType: "text", text: "Act bolder.", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 90, fontWeight: 400, color: "#9ca3af", italic: true }, trackIndex: 0, startTime: 1.5, duration: 10, x: 0.1, y: 0.74, width: 0.8, height: 0.12, animationIn: "fade", animationOut: "fade", animationInDuration: 1, color: "#9ca3af" }),
  ]));

  ret.push(tpl("typo-neon-sign", "Neon Sign", "Dark studio neon-sign text effect.", "🌟", 1080, 1080, 8, "#050505", () => [
    templateClip({ label: "Studio Dark", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 8, color: "#050505" }),
    templateClip({ label: "Scanlines", mediaType: "specialLayer", specialLayerKey: "scanlinesThin", trackIndex: 1, startTime: 0, duration: 8, opacity: 0.15 } as any),
    templateClip({ label: "NEON Sign", mediaType: "text", text: "OPEN", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 340, fontWeight: 900, color: "#f43f5e" }, trackIndex: 0, startTime: 0.5, duration: 7, x: 0.05, y: 0.3, width: 0.9, height: 0.4, animationIn: "fade", animationOut: "fade", animationInDuration: 0.4, color: "#f43f5e", effects: [{ id: uid("fx"), type: "glow", intensity: 1.0, color: "#f43f5e" }] }),
    templateClip({ label: "Hours", mediaType: "text", text: "24 / 7", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 110, fontWeight: 400, color: "#fbbf24" }, trackIndex: 0, startTime: 1.2, duration: 6, x: 0.15, y: 0.72, width: 0.7, height: 0.14, animationIn: "fade", animationOut: "fade", color: "#fbbf24", effects: [{ id: uid("fx"), type: "glow", intensity: 0.8, color: "#fbbf24" }] }),
  ]));

  // ── 7. Wave Visualizer Templates ──────────────────────────────────────────
  ret.push(tpl("wave-podcast-cover", "Podcast Visualizer", "16:9 audio waveform podcast cover.", "🎙️", 1920, 1080, 10, "#0f172a", () => [
    templateClip({ label: "Dark BG", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 10, color: "#0f172a" }),
    templateClip({ label: "Waveform", mediaType: "waves", waveKey: "bars", trackIndex: 1, startTime: 0, duration: 10, x: 0.05, y: 0.55, width: 0.9, height: 0.3, color: "#7c3aed", opacity: 0.9 } as any),
    templateClip({ label: "Show Title", mediaType: "text", text: "THE DEEP DIVE", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 120, fontWeight: 900, color: "#fff" }, trackIndex: 0, startTime: 0.5, duration: 9, x: 0.1, y: 0.15, width: 0.8, height: 0.24, animationIn: "fade", animationOut: "fade", color: "#fff" }),
    templateClip({ label: "Episode", mediaType: "text", text: "Episode 042", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 60, fontWeight: 400, color: "#a5b4fc", italic: true }, trackIndex: 0, startTime: 1, duration: 8.5, x: 0.1, y: 0.44, width: 0.8, height: 0.08, animationIn: "slideUp", animationOut: "fade", color: "#a5b4fc" }),
  ]));

  ret.push(tpl("wave-music-vertical", "Music Waveform Story", "9:16 vertical music waveform player.", "🎧", 1080, 1920, 10, "#0a0a0a", () => [
    templateClip({ label: "Album Art (replace)", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 10, color: "#0a0a0a" }),
    templateClip({ label: "Wave BG", mediaType: "waves", waveKey: "sinewave", trackIndex: 1, startTime: 0, duration: 10, x: 0, y: 0.6, width: 1, height: 0.3, color: "#6366f1", opacity: 0.7 } as any),
    templateClip({ label: "Track Title", mediaType: "text", text: "LOST IN\nSYNTHWAVE", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 150, fontWeight: 800, color: "#fff" }, trackIndex: 0, startTime: 0.5, duration: 9, x: 0.05, y: 0.15, width: 0.9, height: 0.3, animationIn: "fade", animationOut: "fade", color: "#fff" }),
    templateClip({ label: "Artist", mediaType: "text", text: "by you", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 70, fontWeight: 400, color: "#a78bfa", italic: true }, trackIndex: 0, startTime: 1, duration: 8.5, x: 0.1, y: 0.46, width: 0.8, height: 0.08, animationIn: "slideUp", animationOut: "fade", color: "#a78bfa" }),
  ]));

  // ── 8. Slideshow + Special Layer Combos ───────────────────────────────────
  ret.push(tpl("combo-vintage-album", "Vintage Photo Album", "16:9 vintage slideshow with film grain + vignette.", "📸", 1920, 1080, 20, "#0c0c0c", () => {
    const clips: Clip[] = [];
    const colors = ["#44403c", "#57534e", "#78716c", "#a8a29e"];
    colors.forEach((c, i) => {
      clips.push(templateClip({ label: `Memory ${i + 1} (replace)`, mediaType: "blank", trackIndex: 2, startTime: i * 4.5, duration: 4.5, color: c, transitionIn: i === 0 ? { type: "none", duration: 0.5 } : fadeIn }));
    });
    clips.push(templateClip({ label: "Film Grain", mediaType: "specialLayer", specialLayerKey: "filmGrainMed", trackIndex: 1, startTime: 0, duration: 20, opacity: 0.45 } as any));
    clips.push(templateClip({ label: "Vignette", mediaType: "specialLayer", specialLayerKey: "softVignette", trackIndex: 1, startTime: 0, duration: 20, opacity: 0.7 } as any));
    clips.push(templateClip({ label: "Album Title", mediaType: "text", text: "SUMMER\nMEMORIES", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 140, fontWeight: 700, color: "#fde68a" }, trackIndex: 0, startTime: 0.8, duration: 3, x: 0.1, y: 0.35, width: 0.8, height: 0.3, animationIn: "fade", animationOut: "fade", animationInDuration: 1, color: "#fde68a" }));
    clips.push(templateClip({ label: "Year", mediaType: "text", text: "2025", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 80, fontWeight: 400, color: "#d6d3d1", italic: true }, trackIndex: 0, startTime: 1.2, duration: 2.5, x: 0.1, y: 0.66, width: 0.8, height: 0.08, animationIn: "fade", animationOut: "fade", color: "#d6d3d1" }));
    return clips;
  }));

  ret.push(tpl("combo-neon-portfolio", "Neon Portfolio Reel", "9:16 portfolio reel with violet leak + sparks.", "💼", 1080, 1920, 18, "#050510", () => {
    const clips: Clip[] = [];
    const colors = ["#4c1d95", "#0c4a6e", "#064e3b", "#7f1d1d"];
    colors.forEach((c, i) => {
      clips.push(templateClip({ label: `Work ${i + 1} (replace)`, mediaType: "blank", trackIndex: 2, startTime: i * 3.5, duration: 3.5, color: c, transitionIn: i === 0 ? { type: "none", duration: 0.4 } : zoomIn }));
    });
    clips.push(templateClip({ label: "Sparks", mediaType: "particles", particleKey: "electricSparks", trackIndex: 1, startTime: 0, duration: 18, opacity: 0.35, blendMode: "screen" } as any));
    clips.push(templateClip({ label: "Leak", mediaType: "specialLayer", specialLayerKey: "lightLeakViolet", trackIndex: 1, startTime: 0, duration: 18, opacity: 0.4, blendMode: "screen" } as any));
    clips.push(templateClip({ label: "Portfolio", mediaType: "text", text: "MY WORK\n2025", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 170, fontWeight: 900, color: "#c4b5fd" }, trackIndex: 0, startTime: 14.5, duration: 3, x: 0.05, y: 0.38, width: 0.9, height: 0.24, animationIn: "fade", animationOut: "fade", color: "#c4b5fd" }));
    return clips;
  }));

  ret.push(tpl("combo-luxury-show", "Luxury Brand Show", "16:9 luxury product with rose leak + grain.", "💎", 1920, 1080, 14, "#0a0006", () => {
    const clips: Clip[] = [];
    [3, 4, 4, 3].forEach((d, i) => {
      const start = [0, 3, 7, 11][i];
      const c = ["#1a0008", "#110011", "#0a0008", "#08000a"][i];
      clips.push(templateClip({ label: `Product ${i + 1} (replace)`, mediaType: "blank", trackIndex: 2, startTime: start, duration: d, color: c, transitionIn: i === 0 ? { type: "none", duration: 0.4 } : fadeIn }));
    });
    clips.push(templateClip({ label: "Rose Leak", mediaType: "specialLayer", specialLayerKey: "lightLeakRose", trackIndex: 1, startTime: 0, duration: 14, opacity: 0.5, blendMode: "screen" } as any));
    clips.push(templateClip({ label: "Grain", mediaType: "specialLayer", specialLayerKey: "filmGrainLight", trackIndex: 1, startTime: 0, duration: 14, opacity: 0.3 } as any));
    clips.push(templateClip({ label: "Brand", mediaType: "text", text: "MAISON\nDE LUXE", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 130, fontWeight: 700, color: "#fde68a" }, trackIndex: 0, startTime: 0.8, duration: 2, x: 0.1, y: 0.35, width: 0.8, height: 0.3, animationIn: "fade", animationOut: "fade", animationInDuration: 1.2, color: "#fde68a" }));
    clips.push(templateClip({ label: "CTA", mediaType: "text", text: "Collection 2025 →", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 65, fontWeight: 500, color: "#f5d0b5", italic: true }, trackIndex: 0, startTime: 11.5, duration: 2.5, x: 0.1, y: 0.78, width: 0.8, height: 0.08, animationIn: "slideUp", animationOut: "fade", color: "#f5d0b5" }));
    return clips;
  }));

  // ── 9. News / Corporate Templates ─────────────────────────────────────────
  ret.push(tpl("corp-earnings-reveal", "Earnings Reveal", "16:9 Q-earnings / stats reveal with scanlines.", "📊", 1920, 1080, 10, "#0f172a", () => [
    templateClip({ label: "Corp BG", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 10, color: "#0f172a", effects: [{ id: uid("fx"), type: "vignette", intensity: 0.4 }] }),
    templateClip({ label: "Scanlines", mediaType: "specialLayer", specialLayerKey: "scanlinesThin", trackIndex: 1, startTime: 0, duration: 10, opacity: 0.1 } as any),
    templateClip({ label: "Revenue", mediaType: "text", text: "$4.2B", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 240, fontWeight: 900, color: "#22d3ee" }, trackIndex: 0, startTime: 0.5, duration: 4, x: 0.1, y: 0.25, width: 0.8, height: 0.35, animationIn: "zoomIn", animationOut: "fade", color: "#22d3ee", effects: [{ id: uid("fx"), type: "glow", intensity: 0.5, color: "#0ea5e9" }] }),
    templateClip({ label: "Label", mediaType: "text", text: "Q4 2025 Revenue · +18% YoY", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 55, fontWeight: 500, color: "#94a3b8" }, trackIndex: 0, startTime: 1, duration: 8.5, x: 0.1, y: 0.65, width: 0.8, height: 0.08, animationIn: "slideUp", animationOut: "fade", color: "#94a3b8" }),
  ]));

  ret.push(tpl("corp-webinar-title", "Webinar Title Card", "16:9 webinar/live event opener.", "💻", 1920, 1080, 8, "#1e3a5f", () => [
    templateClip({ label: "BG", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 8, color: "#1e3a5f", effects: [{ id: uid("fx"), type: "vignette", intensity: 0.5 }] }),
    templateClip({ label: "Top Glow", mediaType: "specialLayer", specialLayerKey: "topGlow", trackIndex: 1, startTime: 0, duration: 8, opacity: 0.3, blendMode: "screen" } as any),
    templateClip({ label: "Webinar Title", mediaType: "text", text: "FUTURE\nOF AI", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 180, fontWeight: 900, color: "#fff" }, trackIndex: 0, startTime: 0.6, duration: 7, x: 0.1, y: 0.25, width: 0.8, height: 0.35, animationIn: "fade", animationOut: "fade", animationInDuration: 1, color: "#fff" }),
    templateClip({ label: "Speaker", mediaType: "text", text: "with Dr. Sarah Chen · Jan 15, 2026", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 52, fontWeight: 400, color: "#93c5fd" }, trackIndex: 0, startTime: 1.2, duration: 6.5, x: 0.1, y: 0.65, width: 0.8, height: 0.07, animationIn: "slideUp", animationOut: "fade", color: "#93c5fd" }),
  ]));

  // ── 10. Education / Tutorial Templates ───────────────────────────────────
  ret.push(tpl("edu-step-by-step", "Step-by-Step Guide", "9:16 numbered step breakdown template.", "🪜", 1080, 1920, 20, "#0f172a", () => {
    const steps = ["STEP 1\nPlan", "STEP 2\nCreate", "STEP 3\nReview", "STEP 4\nPublish"];
    const colors = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981"];
    return steps.map((t, i) => templateClip({ label: t.split("\n")[0], mediaType: "text", text: t, textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 160, fontWeight: 900, color: "#fff" }, trackIndex: 0, startTime: i * 4.5, duration: 4, x: 0.05, y: 0.35, width: 0.9, height: 0.3, animationIn: "slideLeft", animationOut: "fade", animationInDuration: 0.4, color: colors[i], effects: [{ id: uid("fx"), type: "glow", intensity: 0.4, color: colors[i] }], transitionIn: i === 0 ? { type: "none", duration: 0.3 } : slideL }));
  }));

  ret.push(tpl("edu-pro-tips", "Pro Tips Card", "Square social tips carousel with numbered list.", "💡", 1080, 1080, 14, "#1e1b4b", () => [
    templateClip({ label: "BG", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 14, color: "#1e1b4b" }),
    templateClip({ label: "Orbs", mediaType: "particles", particleKey: "glowOrbs", trackIndex: 1, startTime: 0, duration: 14, opacity: 0.5, blendMode: "screen" } as any),
    templateClip({ label: "Headline", mediaType: "text", text: "5 PRO TIPS", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 160, fontWeight: 900, color: "#a5b4fc" }, trackIndex: 0, startTime: 0.5, duration: 3, x: 0.05, y: 0.3, width: 0.9, height: 0.24, animationIn: "zoomIn", animationOut: "fade", color: "#a5b4fc" }),
    templateClip({ label: "Tip 1", mediaType: "text", text: "01. Start with\nthe end in mind", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 90, fontWeight: 700, color: "#fff" }, trackIndex: 0, startTime: 3.5, duration: 2.5, x: 0.1, y: 0.3, width: 0.8, height: 0.24, animationIn: "slideLeft", animationOut: "fade", color: "#fff", transitionIn: slideL }),
    templateClip({ label: "Tip 2", mediaType: "text", text: "02. Batch your\ncontent creation", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 90, fontWeight: 700, color: "#fbbf24" }, trackIndex: 0, startTime: 6, duration: 2.5, x: 0.1, y: 0.3, width: 0.8, height: 0.24, animationIn: "slideLeft", animationOut: "fade", color: "#fbbf24", transitionIn: slideL }),
    templateClip({ label: "Tip 3", mediaType: "text", text: "03. Hook in the\nfirst 3 seconds", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 90, fontWeight: 700, color: "#34d399" }, trackIndex: 0, startTime: 8.5, duration: 2.5, x: 0.1, y: 0.3, width: 0.8, height: 0.24, animationIn: "slideLeft", animationOut: "fade", color: "#34d399", transitionIn: slideL }),
    templateClip({ label: "CTA", mediaType: "text", text: "Save for later →", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 80, fontWeight: 600, color: "#e2e8f0" }, trackIndex: 0, startTime: 11, duration: 3, x: 0.1, y: 0.7, width: 0.8, height: 0.1, animationIn: "fade", animationOut: "fade", color: "#e2e8f0" }),
  ]));

  // ── 11. Sport / Fitness Templates ─────────────────────────────────────────
  ret.push(tpl("sport-hype-reel", "Hype Sport Reel", "9:16 high-energy sport reel with sparks.", "🔥", 1080, 1920, 12, "#000", () => {
    const clips: Clip[] = [];
    [3, 2.5, 2.5, 4].forEach((d, i) => {
      const start = [0, 3, 5.5, 8][i];
      clips.push(templateClip({ label: `Clip ${i + 1} (replace)`, mediaType: "blank", trackIndex: 2, startTime: start, duration: d, color: ["#7f1d1d", "#1e1b4b", "#14532d", "#3b0764"][i], transitionIn: i === 0 ? { type: "none", duration: 0.3 } : { type: "zoom", duration: 0.3 } }));
    });
    clips.push(templateClip({ label: "Sparks", mediaType: "particles", particleKey: "electricSparks", trackIndex: 1, startTime: 0, duration: 12, opacity: 0.45, blendMode: "screen" } as any));
    clips.push(templateClip({ label: "Team Name", mediaType: "text", text: "GO\nTEAM!", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 230, fontWeight: 900, color: "#fde68a" }, trackIndex: 0, startTime: 0.3, duration: 2.5, x: 0.05, y: 0.38, width: 0.9, height: 0.24, animationIn: "zoomIn", animationOut: "fade", color: "#fde68a", effects: [{ id: uid("fx"), type: "glow", intensity: 0.8, color: "#f59e0b" }] }));
    clips.push(templateClip({ label: "Score", mediaType: "text", text: "FINAL SCORE\n28 — 14", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 120, fontWeight: 900, color: "#fff" }, trackIndex: 0, startTime: 8.5, duration: 3, x: 0.05, y: 0.38, width: 0.9, height: 0.24, animationIn: "zoomIn", animationOut: "fade", color: "#fff" }));
    return clips;
  }));

  ret.push(tpl("fitness-challenge", "Fitness Challenge", "9:16 fitness 30-day challenge teaser.", "💪", 1080, 1920, 10, "#0c0a09", () => [
    templateClip({ label: "BG", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 10, color: "#0c0a09" }),
    templateClip({ label: "Sparks", mediaType: "particles", particleKey: "electricSparks", trackIndex: 1, startTime: 0, duration: 10, opacity: 0.3, blendMode: "screen" } as any),
    templateClip({ label: "Number", mediaType: "text", text: "30\nDAYS", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 280, fontWeight: 900, color: "#f97316" }, trackIndex: 0, startTime: 0.3, duration: 4, x: 0.05, y: 0.25, width: 0.9, height: 0.5, animationIn: "zoomIn", animationOut: "fade", color: "#f97316", effects: [{ id: uid("fx"), type: "glow", intensity: 0.7, color: "#f97316" }] }),
    templateClip({ label: "Challenge", mediaType: "text", text: "FITNESS\nCHALLENGE", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 120, fontWeight: 800, color: "#fff" }, trackIndex: 0, startTime: 0.8, duration: 9, x: 0.05, y: 0.62, width: 0.9, height: 0.22, animationIn: "slideUp", animationOut: "fade", color: "#fff" }),
    templateClip({ label: "CTA", mediaType: "text", text: "Comment #JOININ", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 75, fontWeight: 600, color: "#fed7aa" }, trackIndex: 0, startTime: 4, duration: 6, x: 0.1, y: 0.88, width: 0.8, height: 0.09, animationIn: "fade", animationOut: "fade", color: "#fed7aa" }),
  ]));

  // ── 12. Food & Lifestyle Templates ───────────────────────────────────────
  ret.push(tpl("food-recipe-story", "Recipe Story Card", "9:16 recipe reveal with warm grain overlay.", "🍽️", 1080, 1920, 12, "#fef3c7", () => [
    templateClip({ label: "Food Photo (replace)", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 12, color: "#78350f" }),
    templateClip({ label: "Grain", mediaType: "specialLayer", specialLayerKey: "filmGrainLight", trackIndex: 1, startTime: 0, duration: 12, opacity: 0.3 } as any),
    templateClip({ label: "Bottom Glow", mediaType: "specialLayer", specialLayerKey: "bottomGlow", trackIndex: 1, startTime: 0, duration: 12, opacity: 0.6 } as any),
    templateClip({ label: "Dish Name", mediaType: "text", text: "PASTA\nCARBONARA", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 180, fontWeight: 900, color: "#fff" }, trackIndex: 0, startTime: 0.8, duration: 10.5, x: 0.05, y: 0.05, width: 0.9, height: 0.3, animationIn: "slideDown", animationOut: "fade", color: "#fff" }),
    templateClip({ label: "Time/Servings", mediaType: "text", text: "⏱ 20 min  ·  🍴 2 servings", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 65, fontWeight: 500, color: "#fde68a" }, trackIndex: 0, startTime: 1.2, duration: 10, x: 0.07, y: 0.9, width: 0.86, height: 0.07, animationIn: "fade", animationOut: "fade", color: "#fde68a" }),
  ]));

  ret.push(tpl("lifestyle-morning", "Morning Aesthetic", "9:16 cozy morning lifestyle vlog intro.", "☕", 1080, 1920, 10, "#fef9f0", () => [
    templateClip({ label: "Morning Photo (replace)", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 10, color: "#d97706" }),
    templateClip({ label: "Amber Leak", mediaType: "specialLayer", specialLayerKey: "lightLeakAmber", trackIndex: 1, startTime: 0, duration: 10, opacity: 0.5, blendMode: "screen" } as any),
    templateClip({ label: "Grain", mediaType: "specialLayer", specialLayerKey: "filmGrainLight", trackIndex: 1, startTime: 0, duration: 10, opacity: 0.35 } as any),
    templateClip({ label: "Good Morning", mediaType: "text", text: "good\nmorning ☀️", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 150, fontWeight: 700, color: "#7c2d12", italic: true }, trackIndex: 0, startTime: 0.8, duration: 8.5, x: 0.05, y: 0.38, width: 0.9, height: 0.24, animationIn: "fade", animationOut: "fade", animationInDuration: 1.5, color: "#7c2d12" }),
  ]));

  // ── 13. Event & Announcement Templates ───────────────────────────────────
  ret.push(tpl("event-concert", "Concert Announcement", "9:16 concert/event announcement with confetti.", "🎤", 1080, 1920, 10, "#0d0d0d", () => [
    templateClip({ label: "BG", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 10, color: "#0d0d0d" }),
    templateClip({ label: "Confetti", mediaType: "particles", particleKey: "confettiGold", trackIndex: 1, startTime: 0, duration: 10, opacity: 0.75, blendMode: "screen" } as any),
    templateClip({ label: "Artist", mediaType: "text", text: "THE BIG\nSHOW", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 210, fontWeight: 900, color: "#fde68a" }, trackIndex: 0, startTime: 0.5, duration: 8.5, x: 0.05, y: 0.28, width: 0.9, height: 0.35, animationIn: "zoomIn", animationOut: "fade", color: "#fde68a", effects: [{ id: uid("fx"), type: "glow", intensity: 0.7, color: "#fbbf24" }] }),
    templateClip({ label: "Date", mediaType: "text", text: "FEB 14 · NYC", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 90, fontWeight: 600, color: "#fff" }, trackIndex: 0, startTime: 1, duration: 8, x: 0.07, y: 0.66, width: 0.86, height: 0.1, animationIn: "slideUp", animationOut: "fade", color: "#fff" }),
    templateClip({ label: "Tickets", mediaType: "text", text: "Get tickets → link in bio", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 65, fontWeight: 500, color: "#fda4af" }, trackIndex: 0, startTime: 2, duration: 7.5, x: 0.07, y: 0.79, width: 0.86, height: 0.07, animationIn: "fade", animationOut: "fade", color: "#fda4af" }),
  ]));

  ret.push(tpl("event-wedding-save", "Wedding Save-the-Date", "Elegant vertical wedding save-the-date card.", "💍", 1080, 1920, 12, "#fdf2f8", () => [
    templateClip({ label: "Photo Slot (replace)", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 12, color: "#fce7f3" }),
    templateClip({ label: "Rose Leak", mediaType: "specialLayer", specialLayerKey: "lightLeakRose", trackIndex: 1, startTime: 0, duration: 12, opacity: 0.45, blendMode: "screen" } as any),
    templateClip({ label: "Grain", mediaType: "specialLayer", specialLayerKey: "filmGrainLight", trackIndex: 1, startTime: 0, duration: 12, opacity: 0.25 } as any),
    templateClip({ label: "Names", mediaType: "text", text: "Emma &\nJames", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 170, fontWeight: 700, color: "#831843", italic: true }, trackIndex: 0, startTime: 0.8, duration: 10.5, x: 0.05, y: 0.3, width: 0.9, height: 0.3, animationIn: "fade", animationOut: "fade", animationInDuration: 1.5, color: "#831843" }),
    templateClip({ label: "Save The Date", mediaType: "text", text: "save the date", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 70, fontWeight: 400, color: "#9d174d", italic: true }, trackIndex: 0, startTime: 1.5, duration: 10, x: 0.1, y: 0.65, width: 0.8, height: 0.07, animationIn: "slideUp", animationOut: "fade", color: "#9d174d" }),
    templateClip({ label: "Date Text", mediaType: "text", text: "June 21, 2026", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 75, fontWeight: 500, color: "#be185d" }, trackIndex: 0, startTime: 1.8, duration: 9.5, x: 0.1, y: 0.74, width: 0.8, height: 0.08, animationIn: "fade", animationOut: "fade", color: "#be185d" }),
  ]));

  ret.push(tpl("event-birthday", "Birthday Celebration", "Fun birthday party announcement with hearts.", "🎂", 1080, 1920, 10, "#4a0072", () => [
    templateClip({ label: "Purple BG", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 10, color: "#4a0072" }),
    templateClip({ label: "Hearts", mediaType: "particles", particleKey: "hearts", trackIndex: 1, startTime: 0, duration: 10, opacity: 0.8, blendMode: "screen" } as any),
    templateClip({ label: "Confetti", mediaType: "particles", particleKey: "confettiGold", trackIndex: 1, startTime: 0.5, duration: 9.5, opacity: 0.6, blendMode: "screen" } as any),
    templateClip({ label: "Turning", mediaType: "text", text: "SHE'S\nTURNING 30!", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 180, fontWeight: 900, color: "#fde68a" }, trackIndex: 0, startTime: 0.5, duration: 9, x: 0.05, y: 0.32, width: 0.9, height: 0.36, animationIn: "bounce", animationOut: "fade", color: "#fde68a", effects: [{ id: uid("fx"), type: "glow", intensity: 0.7, color: "#fbbf24" }] }),
    templateClip({ label: "Invite", mediaType: "text", text: "You're invited! →", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 90, fontWeight: 600, color: "#fda4af" }, trackIndex: 0, startTime: 2, duration: 7.5, x: 0.1, y: 0.73, width: 0.8, height: 0.1, animationIn: "slideUp", animationOut: "fade", color: "#fda4af" }),
  ]));

  // ── 14. Real Estate / Architecture ────────────────────────────────────────
  ret.push(tpl("real-estate-reveal", "Property Reveal Tour", "16:9 luxury real estate property tour.", "🏡", 1920, 1080, 16, "#000", () => {
    const clips: Clip[] = [];
    [4, 3, 3, 3, 3].forEach((d, i) => {
      const start = [0, 4, 7, 10, 13][i];
      clips.push(templateClip({ label: `Room ${i + 1} (replace)`, mediaType: "blank", trackIndex: 2, startTime: start, duration: d, color: ["#1f2937", "#374151", "#4b5563", "#374151", "#1f2937"][i], transitionIn: i === 0 ? { type: "none", duration: 0.4 } : fadeIn }));
    });
    clips.push(templateClip({ label: "Vignette", mediaType: "specialLayer", specialLayerKey: "softVignette", trackIndex: 1, startTime: 0, duration: 16, opacity: 0.65 } as any));
    clips.push(templateClip({ label: "Property Name", mediaType: "text", text: "THE GRAND\nRESIDENCE", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 140, fontWeight: 900, color: "#fde68a" }, trackIndex: 0, startTime: 0.8, duration: 3, x: 0.1, y: 0.35, width: 0.8, height: 0.3, animationIn: "fade", animationOut: "fade", animationInDuration: 1.2, color: "#fde68a" }));
    clips.push(templateClip({ label: "Price", mediaType: "text", text: "$4.2M · 5 bd · 6 ba", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 55, fontWeight: 500, color: "#f5f5f5" }, trackIndex: 0, startTime: 13.5, duration: 2, x: 0.1, y: 0.7, width: 0.8, height: 0.08, animationIn: "fade", animationOut: "fade", color: "#f5f5f5" }));
    return clips;
  }));

  // ── 15. Gaming Templates ──────────────────────────────────────────────────
  ret.push(tpl("gaming-stream-intro", "Stream Intro Cinematic", "16:9 gaming stream intro with sparks + scanlines.", "🎮", 1920, 1080, 10, "#000", () => [
    templateClip({ label: "Dark BG", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 10, color: "#020617", effects: [{ id: uid("fx"), type: "tint", intensity: 0.2, color: "#22d3ee" }] }),
    templateClip({ label: "Sparks", mediaType: "particles", particleKey: "electricSparks", trackIndex: 1, startTime: 0, duration: 10, opacity: 0.6, blendMode: "screen" } as any),
    templateClip({ label: "Scanlines", mediaType: "specialLayer", specialLayerKey: "scanlinesThin", trackIndex: 1, startTime: 0, duration: 10, opacity: 0.2 } as any),
    templateClip({ label: "Streamer Name", mediaType: "text", text: "XEON\nGAMING", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 190, fontWeight: 900, color: "#22d3ee" }, trackIndex: 0, startTime: 0.5, duration: 9, x: 0.1, y: 0.35, width: 0.8, height: 0.3, animationIn: "slideLeft", animationOut: "fade", color: "#22d3ee", effects: [{ id: uid("fx"), type: "glow", intensity: 0.9, color: "#0ea5e9" }] }),
    templateClip({ label: "Now Live", mediaType: "text", text: "● LIVE NOW", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 70, fontWeight: 700, color: "#f43f5e" }, trackIndex: 0, startTime: 1.5, duration: 8, x: 0.1, y: 0.7, width: 0.5, height: 0.09, animationIn: "fade", animationOut: "fade", color: "#f43f5e", effects: [{ id: uid("fx"), type: "glow", intensity: 0.6, color: "#e11d48" }] }),
  ]));

  ret.push(tpl("gaming-highlight-reel", "Gaming Highlight Reel", "9:16 gaming highlights with electric particles.", "🕹️", 1080, 1920, 12, "#000", () => {
    const clips: Clip[] = [
      templateClip({ label: "Clip 1 (replace)", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 3, color: "#1e1b4b" }),
      templateClip({ label: "Clip 2 (replace)", mediaType: "blank", trackIndex: 2, startTime: 3, duration: 2.5, color: "#3b0764", transitionIn: zoomIn }),
      templateClip({ label: "Clip 3 (replace)", mediaType: "blank", trackIndex: 2, startTime: 5.5, duration: 2.5, color: "#172554", transitionIn: zoomIn }),
      templateClip({ label: "Clip 4 (replace)", mediaType: "blank", trackIndex: 2, startTime: 8, duration: 4, color: "#0c4a6e", transitionIn: zoomIn }),
      templateClip({ label: "Sparks", mediaType: "particles", particleKey: "electricSparks", trackIndex: 1, startTime: 0, duration: 12, opacity: 0.4, blendMode: "screen" } as any),
      templateClip({ label: "Channel", mediaType: "text", text: "TOP\nPLAYS", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 210, fontWeight: 900, color: "#fbbf24" }, trackIndex: 0, startTime: 0.3, duration: 2.5, x: 0.05, y: 0.38, width: 0.9, height: 0.24, animationIn: "zoomIn", animationOut: "fade", color: "#fbbf24" }),
    ];
    return clips;
  }));

  // ── 16. Extra variety packs ───────────────────────────────────────────────

  // Short-form hooks (9:16, 5 sec each)
  ["Stop scrolling.", "This changed my life.", "You need to see this.", "No one talks about this.", "Watch till the end."].forEach((hook, i) => {
    ret.push(tpl(`hook-${i}`, `Hook: "${hook.slice(0, 20)}"`, `9:16 scroll-stopper hook card.`, "📌", 1080, 1920, 5, "#0f0f0f", () => [
      templateClip({ label: "BG", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 5, color: "#0f0f0f" }),
      templateClip({ label: "Hook Text", mediaType: "text", text: hook, textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 160, fontWeight: 900, color: "#fff" }, trackIndex: 0, startTime: 0.2, duration: 4.5, x: 0.05, y: 0.32, width: 0.9, height: 0.36, animationIn: "zoomIn", animationOut: "fade", animationInDuration: 0.3, color: "#fff", effects: [{ id: uid("fx"), type: "glow", intensity: 0.3, color: "#fff" }] }),
    ]));
  });

  // Countdown timers (square, 10 sec)
  [5, 10, 30].forEach((n) => {
    ret.push(tpl(`countdown-${n}`, `${n}-Second Countdown`, `${n}s countdown timer for streams/reels.`, "⏱️", 1080, 1080, n, "#0f172a", () => {
      const clips: Clip[] = [templateClip({ label: "BG", mediaType: "blank", trackIndex: 2, startTime: 0, duration: n, color: "#0f172a" })];
      for (let i = n; i >= 1; i--) {
        clips.push(templateClip({ label: `${i}`, mediaType: "text", text: `${i}`, textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 500, fontWeight: 900, color: i > n * 0.6 ? "#22d3ee" : i > n * 0.3 ? "#fbbf24" : "#f43f5e" }, trackIndex: 0, startTime: n - i, duration: 1, x: 0.05, y: 0.1, width: 0.9, height: 0.8, animationIn: "zoomIn", animationOut: "fade", animationInDuration: 0.15, animationOutDuration: 0.15, color: "#22d3ee", transitionIn: { type: "none", duration: 0 } }));
      }
      return clips;
    }));
  });

  // Minimal quote cards (square, various colors)
  const quoteData = [
    ["#000", "#fff", '"Done is better\nthan perfect."'],
    ["#1e1b4b", "#a5b4fc", '"Dream big,\nstart small."'],
    ["#0f172a", "#34d399", '"Progress,\nnot perfection."'],
    ["#7f1d1d", "#fda4af", '"Rest is\nproductive."'],
    ["#0c4a6e", "#7dd3fc", '"Be the energy\nyou want."'],
  ];
  quoteData.forEach(([bg, tc, q], i) => {
    ret.push(tpl(`quote-minimal-${i}`, `Minimal Quote ${i + 1}`, "Clean quote card for Instagram.", "💬", 1080, 1080, 8, bg, () => [
      templateClip({ label: "BG", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 8, color: bg }),
      templateClip({ label: "Quote", mediaType: "text", text: q, textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: 120, fontWeight: 700, color: tc, italic: true }, trackIndex: 0, startTime: 0.8, duration: 6.5, x: 0.08, y: 0.3, width: 0.84, height: 0.4, animationIn: "fade", animationOut: "fade", animationInDuration: 1.2, color: tc }),
    ]));
  });

  // ── Auto-assign categories via key-prefix map ──────────────────────────
  const PREFIX_CAT: Array<[string, TemplateCategory]> = [
    ["part-",          "Particles"],
    ["sl-",            "Cinematic"],
    ["grad-",          "Quotes"],
    ["social-",        "Social / Reels"],
    ["brand-",         "Brand & Reveal"],
    ["typo-",          "Typography"],
    ["wave-",          "Wave / Visualizer"],
    ["combo-",         "Slideshow"],
    ["corp-",          "Other"],
    ["edu-",           "Other"],
    ["sport-",         "Other"],
    ["fitness-",       "Other"],
    ["food-",          "Food & Lifestyle"],
    ["lifestyle-",     "Food & Lifestyle"],
    ["event-",         "Events"],
    ["real-estate-",   "Real Estate"],
    ["gaming-",        "Gaming"],
    ["hook-",          "Social / Reels"],
    ["countdown-",     "Countdown"],
    ["quote-minimal-", "Quotes"],
  ];
  for (const t of ret) {
    if (!t.category) {
      for (const [pfx, cat] of PREFIX_CAT) {
        if (t.key.startsWith(pfx)) { t.category = cat; break; }
      }
    }
  }
  return ret;
}

// ─────────────────────────────────────────────────────────────────────────────
// Wave All-Variants — 12 wave keys × 4 aspect ratios = 48 templates
// These ensure every WAVE_LIBRARY entry has at least 4 ready-made templates.
// ─────────────────────────────────────────────────────────────────────────────
function buildWaveAllTemplates(): VideoTemplate[] {
  const aspects = [
    { key: "v",  w: 1080, h: 1920, label: "9:16" },
    { key: "sq", w: 1080, h: 1080, label: "1:1"  },
    { key: "ld", w: 1920, h: 1080, label: "16:9" },
    { key: "p",  w: 1080, h: 1350, label: "4:5"  },
  ];
  const waves: Array<{ key: string; name: string; emoji: string; titleColor: string; bgColor: string }> = [
    { key: "ocean",          name: "Ocean Wave",       emoji: "🌊", titleColor: "#7dd3fc", bgColor: "#0c1445" },
    { key: "audio",          name: "Audio Bars",       emoji: "🎙️", titleColor: "#a78bfa", bgColor: "#0f0f1a" },
    { key: "plasma",         name: "Plasma Surge",     emoji: "⚡", titleColor: "#86efac", bgColor: "#042f2e" },
    { key: "ripple",         name: "Ripple Wave",      emoji: "💧", titleColor: "#67e8f9", bgColor: "#082f49" },
    { key: "neon",           name: "Neon Wave",        emoji: "🌈", titleColor: "#f0abfc", bgColor: "#1a0030" },
    { key: "retro",          name: "Retro Grid Wave",  emoji: "📺", titleColor: "#fde68a", bgColor: "#1c1917" },
    { key: "mountain",       name: "Mountain Wave",    emoji: "🏔️", titleColor: "#bbf7d0", bgColor: "#0f2e1a" },
    { key: "lissajous",      name: "Lissajous Loop",   emoji: "🔄", titleColor: "#fda4af", bgColor: "#1f0010" },
    { key: "heartbeat",      name: "Heartbeat",        emoji: "❤️", titleColor: "#f87171", bgColor: "#1a0000" },
    { key: "interference",   name: "Interference",     emoji: "📡", titleColor: "#6ee7b7", bgColor: "#022c22" },
    { key: "galaxy",         name: "Galaxy Spiral",    emoji: "🌌", titleColor: "#c4b5fd", bgColor: "#0d0221" },
    { key: "northern-lights",name: "Northern Lights",  emoji: "🌠", titleColor: "#a7f3d0", bgColor: "#0a0e27" },
  ];

  const ret: VideoTemplate[] = [];
  for (const wave of waves) {
    for (const asp of aspects) {
      const isLandscape = asp.w > asp.h;
      const wH = isLandscape ? 0.35 : 0.25;
      const wY = isLandscape ? 0.55 : 0.65;
      ret.push({
        key: `wave-all-${wave.key}-${asp.key}`,
        name: `${wave.name} · ${asp.label}`,
        description: `${wave.name} visualizer template in ${asp.w}×${asp.h}.`,
        emoji: wave.emoji,
        canvasWidth: asp.w,
        canvasHeight: asp.h,
        duration: 10,
        background: wave.bgColor,
        category: "Wave / Visualizer" as TemplateCategory,
        build() {
          const clips: Clip[] = [
            templateClip({ label: "Background", mediaType: "blank", trackIndex: 2, startTime: 0, duration: 10, color: wave.bgColor }),
            templateClip({ label: `${wave.name} Visualizer`, mediaType: "waves", waveKey: wave.key, trackIndex: 1, startTime: 0, duration: 10, x: 0, y: wY, width: 1, height: wH, color: wave.titleColor, opacity: 0.85 } as any),
            templateClip({ label: "Title", mediaType: "text", text: "YOUR\nTITLE", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: isLandscape ? 140 : 180, fontWeight: 900, color: wave.titleColor }, trackIndex: 0, startTime: 0.5, duration: 9, x: 0.05, y: isLandscape ? 0.18 : 0.22, width: 0.9, height: isLandscape ? 0.35 : 0.3, animationIn: "fade", animationOut: "fade", animationInDuration: 1, color: wave.titleColor, effects: [{ id: uid("fx"), type: "glow", intensity: 0.6, color: wave.titleColor }] }),
            templateClip({ label: "Subtitle", mediaType: "text", text: "add your subtitle here", textStyle: { ...DEFAULT_TEXT_STYLE, fontSize: isLandscape ? 44 : 65, fontWeight: 400, color: "#94a3b8", italic: true }, trackIndex: 0, startTime: 1, duration: 8.5, x: 0.1, y: isLandscape ? 0.52 : 0.56, width: 0.8, height: 0.08, animationIn: "slideUp", animationOut: "fade", color: "#94a3b8" }),
          ];
          return { clips, duration: 10, canvasWidth: asp.w, canvasHeight: asp.h, background: wave.bgColor, tracks: baseTracks, keyframes: [], transitions: [], markers: [] };
        },
      });
    }
  }
  return ret;
}

export function getTemplateByKey(key: string): VideoTemplate | undefined {
  return TEMPLATES.find((t) => t.key === key);
}

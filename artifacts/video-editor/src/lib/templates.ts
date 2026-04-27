import type { EditorState, Clip, Effect, ClipTransition } from "./types";
import { DEFAULT_TEXT_STYLE, DEFAULT_FILTERS } from "./types";

export interface VideoTemplate {
  key: string;
  name: string;
  description: string;
  emoji: string;
  canvasWidth: number;
  canvasHeight: number;
  duration: number;
  background: string;
  build: () => Pick<EditorState, "clips" | "duration" | "canvasWidth" | "canvasHeight" | "background" | "tracks" | "keyframes" | "transitions" | "markers">;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function templateClip(partial: Partial<Clip>): Clip {
  const width = partial.width ?? 1;
  const height = partial.height ?? 1;

  // Templates were authored when text font scaled with the clip box (the
  // old `cqw` formula). The unified canvas-relative formula sizes text
  // purely off the canvas, so a fontSize of 320 in a width=0.9 box now
  // renders 11% larger than intended and overflows. Convert each template
  // text size by the clip's width so the on-screen result matches the
  // original visual design and the text fits inside its box.
  const isText = (partial.mediaType ?? "blank") === "text";
  const baseStyle = partial.textStyle ?? { ...DEFAULT_TEXT_STYLE };
  const textStyle = isText
    ? { ...baseStyle, fontSize: Math.round(baseStyle.fontSize * width) }
    : baseStyle;

  return {
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
];

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


export function getTemplateByKey(key: string): VideoTemplate | undefined {
  return TEMPLATES.find((t) => t.key === key);
}

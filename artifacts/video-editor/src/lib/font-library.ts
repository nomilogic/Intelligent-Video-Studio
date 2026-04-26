/**
 * Curated catalog of 50 web-safe + Google Fonts available in the editor.
 *
 * `cssFamily` is the exact `font-family` string to assign to text clips.
 * `googleSpec` is the `family` + weight selector for Google's CSS API.
 * System fonts have `googleSpec = null` so we don't request them remotely.
 *
 * The full Google Fonts stylesheet for the entire catalog is built once at
 * load time (see `injectFontStylesheet`) so any font is ready to render the
 * first time a user picks it.
 */

export type FontCategory =
  | "Sans"
  | "Serif"
  | "Display"
  | "Handwriting"
  | "Mono"
  | "System";

export interface FontDef {
  /** User-facing label in the picker. */
  name: string;
  /** Exact CSS font-family string to assign. */
  cssFamily: string;
  /** Google Fonts spec like "Inter:wght@400;700" — null for system fonts. */
  googleSpec: string | null;
  category: FontCategory;
}

export const FONT_LIBRARY: FontDef[] = [
  // System fallbacks (5)
  { name: "System Sans",   cssFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', googleSpec: null, category: "System" },
  { name: "System Serif",  cssFamily: 'Georgia, "Times New Roman", serif',                googleSpec: null, category: "System" },
  { name: "System Mono",   cssFamily: 'ui-monospace, "SF Mono", Menlo, monospace',         googleSpec: null, category: "System" },
  { name: "Arial",         cssFamily: "Arial, sans-serif",                                  googleSpec: null, category: "System" },
  { name: "Helvetica",     cssFamily: "Helvetica, Arial, sans-serif",                       googleSpec: null, category: "System" },
  // Sans (15)
  { name: "Inter",         cssFamily: "'Inter', sans-serif",                  googleSpec: "Inter:wght@400;500;700;900",         category: "Sans" },
  { name: "Roboto",        cssFamily: "'Roboto', sans-serif",                 googleSpec: "Roboto:wght@400;500;700;900",        category: "Sans" },
  { name: "Open Sans",     cssFamily: "'Open Sans', sans-serif",              googleSpec: "Open+Sans:wght@400;600;700;800",     category: "Sans" },
  { name: "Lato",          cssFamily: "'Lato', sans-serif",                   googleSpec: "Lato:wght@400;700;900",              category: "Sans" },
  { name: "Montserrat",    cssFamily: "'Montserrat', sans-serif",             googleSpec: "Montserrat:wght@400;600;700;900",    category: "Sans" },
  { name: "Poppins",       cssFamily: "'Poppins', sans-serif",                googleSpec: "Poppins:wght@400;500;700;900",       category: "Sans" },
  { name: "Nunito",        cssFamily: "'Nunito', sans-serif",                 googleSpec: "Nunito:wght@400;700;900",            category: "Sans" },
  { name: "Raleway",       cssFamily: "'Raleway', sans-serif",                googleSpec: "Raleway:wght@400;700;900",           category: "Sans" },
  { name: "Work Sans",     cssFamily: "'Work Sans', sans-serif",              googleSpec: "Work+Sans:wght@400;700;900",         category: "Sans" },
  { name: "Manrope",       cssFamily: "'Manrope', sans-serif",                googleSpec: "Manrope:wght@400;700;800",           category: "Sans" },
  { name: "DM Sans",       cssFamily: "'DM Sans', sans-serif",                googleSpec: "DM+Sans:wght@400;500;700",           category: "Sans" },
  { name: "Plus Jakarta",  cssFamily: "'Plus Jakarta Sans', sans-serif",      googleSpec: "Plus+Jakarta+Sans:wght@400;600;800", category: "Sans" },
  { name: "Outfit",        cssFamily: "'Outfit', sans-serif",                 googleSpec: "Outfit:wght@400;600;800",            category: "Sans" },
  { name: "Space Grotesk", cssFamily: "'Space Grotesk', sans-serif",          googleSpec: "Space+Grotesk:wght@400;500;700",     category: "Sans" },
  { name: "Bebas Neue",    cssFamily: "'Bebas Neue', sans-serif",             googleSpec: "Bebas+Neue",                         category: "Sans" },
  // Serif (8)
  { name: "Playfair",      cssFamily: "'Playfair Display', serif",            googleSpec: "Playfair+Display:wght@400;700;900",  category: "Serif" },
  { name: "Merriweather",  cssFamily: "'Merriweather', serif",                googleSpec: "Merriweather:wght@400;700;900",      category: "Serif" },
  { name: "Lora",          cssFamily: "'Lora', serif",                        googleSpec: "Lora:wght@400;700",                   category: "Serif" },
  { name: "PT Serif",      cssFamily: "'PT Serif', serif",                    googleSpec: "PT+Serif:wght@400;700",              category: "Serif" },
  { name: "Crimson Pro",   cssFamily: "'Crimson Pro', serif",                 googleSpec: "Crimson+Pro:wght@400;700;900",       category: "Serif" },
  { name: "EB Garamond",   cssFamily: "'EB Garamond', serif",                 googleSpec: "EB+Garamond:wght@400;700",           category: "Serif" },
  { name: "Cormorant",     cssFamily: "'Cormorant Garamond', serif",          googleSpec: "Cormorant+Garamond:wght@400;700",    category: "Serif" },
  { name: "DM Serif",      cssFamily: "'DM Serif Display', serif",            googleSpec: "DM+Serif+Display",                    category: "Serif" },
  // Display (12)
  { name: "Anton",         cssFamily: "'Anton', sans-serif",                  googleSpec: "Anton",                               category: "Display" },
  { name: "Oswald",        cssFamily: "'Oswald', sans-serif",                 googleSpec: "Oswald:wght@400;600;700",            category: "Display" },
  { name: "Archivo Black", cssFamily: "'Archivo Black', sans-serif",          googleSpec: "Archivo+Black",                       category: "Display" },
  { name: "Russo One",     cssFamily: "'Russo One', sans-serif",              googleSpec: "Russo+One",                           category: "Display" },
  { name: "Black Ops One", cssFamily: "'Black Ops One', sans-serif",          googleSpec: "Black+Ops+One",                       category: "Display" },
  { name: "Bungee",        cssFamily: "'Bungee', sans-serif",                 googleSpec: "Bungee",                              category: "Display" },
  { name: "Bowlby One",    cssFamily: "'Bowlby One', sans-serif",             googleSpec: "Bowlby+One",                          category: "Display" },
  { name: "Alfa Slab",     cssFamily: "'Alfa Slab One', sans-serif",          googleSpec: "Alfa+Slab+One",                       category: "Display" },
  { name: "Press Start",   cssFamily: "'Press Start 2P', monospace",          googleSpec: "Press+Start+2P",                      category: "Display" },
  { name: "Monoton",       cssFamily: "'Monoton', sans-serif",                googleSpec: "Monoton",                             category: "Display" },
  { name: "Faster One",    cssFamily: "'Faster One', sans-serif",             googleSpec: "Faster+One",                          category: "Display" },
  { name: "Audiowide",     cssFamily: "'Audiowide', sans-serif",              googleSpec: "Audiowide",                           category: "Display" },
  // Handwriting / script (6)
  { name: "Pacifico",      cssFamily: "'Pacifico', cursive",                  googleSpec: "Pacifico",                            category: "Handwriting" },
  { name: "Caveat",        cssFamily: "'Caveat', cursive",                    googleSpec: "Caveat:wght@400;700",                category: "Handwriting" },
  { name: "Dancing Script",cssFamily: "'Dancing Script', cursive",            googleSpec: "Dancing+Script:wght@400;700",        category: "Handwriting" },
  { name: "Great Vibes",   cssFamily: "'Great Vibes', cursive",               googleSpec: "Great+Vibes",                         category: "Handwriting" },
  { name: "Sacramento",    cssFamily: "'Sacramento', cursive",                googleSpec: "Sacramento",                          category: "Handwriting" },
  { name: "Permanent Marker", cssFamily: "'Permanent Marker', cursive",       googleSpec: "Permanent+Marker",                    category: "Handwriting" },
  // Mono (4)
  { name: "JetBrains Mono",cssFamily: "'JetBrains Mono', monospace",          googleSpec: "JetBrains+Mono:wght@400;700",        category: "Mono" },
  { name: "Fira Code",     cssFamily: "'Fira Code', monospace",               googleSpec: "Fira+Code:wght@400;700",             category: "Mono" },
  { name: "Source Code",   cssFamily: "'Source Code Pro', monospace",         googleSpec: "Source+Code+Pro:wght@400;700",       category: "Mono" },
  { name: "IBM Plex Mono", cssFamily: "'IBM Plex Mono', monospace",           googleSpec: "IBM+Plex+Mono:wght@400;700",         category: "Mono" },
];

export const FONT_CATEGORIES: FontCategory[] = ["System", "Sans", "Serif", "Display", "Handwriting", "Mono"];

/** Backwards-compat helper: find a FontDef by its display name. */
export function findFont(name: string): FontDef | undefined {
  return FONT_LIBRARY.find((f) => f.name === name || f.cssFamily === name);
}

/**
 * Inject the consolidated Google Fonts <link> tag once. Safe to call many
 * times; subsequent calls are no-ops. We batch every Google-hosted font into
 * a single CSS request to minimise blocking.
 */
let injected = false;
export function injectFontStylesheet(): void {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const families = FONT_LIBRARY.map((f) => f.googleSpec).filter(
    (s): s is string => typeof s === "string",
  );
  if (families.length === 0) return;
  const href = `https://fonts.googleapis.com/css2?${families
    .map((s) => `family=${s}`)
    .join("&")}&display=swap`;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
  // Preconnect to speed up the first request.
  const pre1 = document.createElement("link");
  pre1.rel = "preconnect";
  pre1.href = "https://fonts.googleapis.com";
  document.head.appendChild(pre1);
  const pre2 = document.createElement("link");
  pre2.rel = "preconnect";
  pre2.href = "https://fonts.gstatic.com";
  pre2.crossOrigin = "anonymous";
  document.head.appendChild(pre2);
}

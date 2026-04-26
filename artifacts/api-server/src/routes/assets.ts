/**
 * Asset library proxy.
 *
 * GET /api/assets/search?provider=giphy|pexels|iconify|lottie&q=...
 *
 * - **giphy**     — needs `GIPHY_API_KEY`     env var (free at developers.giphy.com).
 * - **pexels**    — needs `PEXELS_API_KEY`    env var (free at pexels.com/api).
 * - **iconify**   — keyless. Uses https://api.iconify.design search.
 * - **lottie**    — keyless. Uses lottiefiles' public search proxy.
 *
 * The route always returns:
 *   { items: { id, title, src, thumbnail, mediaType, provider }[] }
 *
 * `mediaType` is one of "image" (gif/png), "lottie", or "icon" so the
 * frontend can decide how to add it to the timeline.
 */

import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

interface AssetItem {
  id: string;
  title: string;
  src: string;
  thumbnail: string;
  mediaType: "image" | "lottie" | "icon";
  provider: string;
  width?: number;
  height?: number;
}

const env = (k: string): string | undefined => process.env[k];

async function searchGiphy(q: string): Promise<AssetItem[]> {
  const key = env("GIPHY_API_KEY");
  if (!key) throw new Error("GIPHY_API_KEY not set on server. Add it in Tools → Secrets to enable Giphy search.");
  const url = `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(key)}&q=${encodeURIComponent(q || "trending")}&limit=24&rating=pg-13`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Giphy ${r.status}`);
  const data: any = await r.json();
  return (data.data ?? []).map((g: { id: string; title: string; images: Record<string, { url: string; width: string; height: string }> }) => ({
    id: g.id,
    title: g.title,
    src: g.images?.original?.url ?? g.images?.downsized_large?.url ?? "",
    thumbnail: g.images?.fixed_width_small?.url ?? g.images?.preview_gif?.url ?? "",
    mediaType: "image" as const,
    provider: "giphy",
    width: parseInt(g.images?.original?.width ?? "0", 10) || undefined,
    height: parseInt(g.images?.original?.height ?? "0", 10) || undefined,
  }));
}

async function searchPexels(q: string): Promise<AssetItem[]> {
  const key = env("PEXELS_API_KEY");
  if (!key) throw new Error("PEXELS_API_KEY not set on server. Add it in Tools → Secrets to enable Pexels search.");
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q || "nature")}&per_page=24`;
  const r = await fetch(url, { headers: { Authorization: key } });
  if (!r.ok) throw new Error(`Pexels ${r.status}`);
  const data: any = await r.json();
  return (data.photos ?? []).map((p: { id: number; alt?: string; src: { original: string; medium: string }; width: number; height: number }) => ({
    id: String(p.id),
    title: p.alt || `Pexels #${p.id}`,
    src: p.src.original,
    thumbnail: p.src.medium,
    mediaType: "image" as const,
    provider: "pexels",
    width: p.width,
    height: p.height,
  }));
}

async function searchIconify(q: string): Promise<AssetItem[]> {
  const url = `https://api.iconify.design/search?query=${encodeURIComponent(q || "star")}&limit=48`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Iconify ${r.status}`);
  const data: any = await r.json();
  const icons: string[] = data.icons ?? [];
  return icons.map((iconId) => {
    const svgUrl = `https://api.iconify.design/${iconId}.svg?width=512&height=512`;
    return {
      id: iconId,
      title: iconId,
      src: svgUrl,
      thumbnail: svgUrl,
      mediaType: "icon" as const,
      provider: "iconify",
      width: 512,
      height: 512,
    };
  });
}

async function searchLottie(q: string): Promise<AssetItem[]> {
  // LottieFiles public featured/search endpoint (no auth for public listing).
  // We fall back to their featured collection if the search endpoint is locked.
  const search = q?.trim();
  const url = search
    ? `https://lottiefiles.com/api/v2/recent?page=1&query=${encodeURIComponent(search)}`
    : `https://assets.lottiefiles.com/featured.json`;

  try {
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(`Lottie ${r.status}`);
    const data: any = await r.json();
    const items: unknown[] = Array.isArray(data) ? data : (data.data ?? data.results ?? data.featured ?? []);
    return items.slice(0, 24).map((it: unknown, i: number): AssetItem => {
      const item = it as {
        id?: string | number;
        name?: string;
        title?: string;
        lottieUrl?: string;
        url?: string;
        jsonUrl?: string;
        gifUrl?: string;
        imageUrl?: string;
      };
      const json = item.lottieUrl || item.jsonUrl || item.url || "";
      return {
        id: String(item.id ?? i),
        title: item.name || item.title || `Lottie ${i + 1}`,
        src: json,
        thumbnail: item.gifUrl || item.imageUrl || json,
        mediaType: "lottie" as const,
        provider: "lottie",
      };
    });
  } catch {
    // LottieFiles' API can be flaky; return a small curated fallback so the
    // user still sees something rather than an error.
    const fallback = [
      "https://assets1.lottiefiles.com/packages/lf20_jcikwtux.json",
      "https://assets3.lottiefiles.com/packages/lf20_9wpyhdzo.json",
      "https://assets10.lottiefiles.com/packages/lf20_ydo1amjm.json",
      "https://assets2.lottiefiles.com/packages/lf20_pkscqlmk.json",
      "https://assets8.lottiefiles.com/packages/lf20_kkflmtur.json",
      "https://assets9.lottiefiles.com/packages/lf20_qrasinha.json",
    ];
    return fallback.map((u, i) => ({
      id: `fallback-${i}`,
      title: `Featured ${i + 1}`,
      src: u,
      thumbnail: u,
      mediaType: "lottie" as const,
      provider: "lottie",
    }));
  }
}

router.get("/assets/search", async (req: Request, res: Response) => {
  const provider = String(req.query["provider"] ?? "iconify");
  const q = String(req.query["q"] ?? "");

  try {
    let items: AssetItem[] = [];
    switch (provider) {
      case "giphy":   items = await searchGiphy(q); break;
      case "pexels":  items = await searchPexels(q); break;
      case "iconify": items = await searchIconify(q); break;
      case "lottie":  items = await searchLottie(q); break;
      default:
        return res.status(400).json({ error: `Unknown provider: ${provider}` });
    }
    return res.json({ items });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg, items: [] });
  }
});

export default router;

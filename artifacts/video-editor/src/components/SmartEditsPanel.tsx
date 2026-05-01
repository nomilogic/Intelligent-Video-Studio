import { useState, useRef } from "react";
import { Scissors, Wand2, Zap, Music2, ChevronDown, ChevronRight, Play, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { EditorState, EditorAction, Clip } from "../lib/types";
import {
  SPLIT_PRESETS, SMART_EDIT_TEMPLATES, SPLIT_CATEGORIES,
  getSplitPreset, applySplitPreset, SplitPreset, SmartEditTemplate,
} from "../lib/smart-edits";

interface Props {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
}

function CollapsibleGroup({
  title, emoji, children, defaultOpen = true,
}: { title: string; emoji: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/60 rounded-md overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-2 py-1.5 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
        <span className="text-sm">{emoji}</span>
        <span className="text-[11px] font-semibold text-foreground flex-1">{title}</span>
      </button>
      {open && <div className="p-2">{children}</div>}
    </div>
  );
}

export function SmartEditsPanel({ state, dispatch }: Props) {
  const [activeTab, setActiveTab] = useState<"splits" | "templates" | "ai">("splits");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [searchQ, setSearchQ] = useState("");
  const [selectedClipId, setSelectedClipId] = useState<string>("");
  const [bpm, setBpm] = useState(120);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [previewPreset, setPreviewPreset] = useState<SplitPreset | null>(null);

  const selectedClip = state.clips.find((c) => c.id === (selectedClipId || state.selectedClipIds[0]));
  const clipChoices = state.clips.filter((c) => c.duration >= 1);

  const allCategories = ["All", ...SPLIT_CATEGORIES];

  const filteredPresets = SPLIT_PRESETS.filter((p) => {
    const matchCat = categoryFilter === "All" || p.category === categoryFilter;
    const matchQ = !searchQ || p.label.toLowerCase().includes(searchQ.toLowerCase()) || p.description.toLowerCase().includes(searchQ.toLowerCase());
    return matchCat && matchQ;
  });

  function applySplit(preset: SplitPreset) {
    const clip = selectedClip;
    if (!clip) return;
    const cutTimes = applySplitPreset(clip, preset, { bpm });
    cutTimes.forEach((t) => {
      dispatch({ type: "SPLIT_CLIP", payload: { clipId: clip.id, time: t } });
    });
  }

  function applyTemplate(tpl: SmartEditTemplate) {
    const clip = selectedClip;
    if (!clip) return;
    const preset = getSplitPreset(tpl.splitPresetKey);
    if (!preset) return;
    const cutTimes = applySplitPreset(clip, preset, { bpm: tpl.bpm ?? bpm });
    cutTimes.forEach((t) => {
      dispatch({ type: "SPLIT_CLIP", payload: { clipId: clip.id, time: t } });
    });
  }

  async function runAiSplit() {
    const clip = selectedClip;
    if (!clip) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const projectSummary = {
        duration: state.duration,
        clipCount: state.clips.length,
        targetClip: { id: clip.id, duration: clip.duration, mediaType: clip.mediaType, label: clip.label },
        tracks: state.tracks.map((t) => ({ name: t.name, type: t.type })),
        userPrompt: aiPrompt || "Make it viral and engaging with professional pacing",
        bpm,
      };

      const resp = await fetch("/api/ai/process-instruction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          instruction: `Analyze this video editor project and give me optimal cut points (as an array of numbers from 0 to ${clip.duration}) for a "${aiPrompt || "professional smart edit"}" style. Project data: ${JSON.stringify(projectSummary)}. Return ONLY a JSON object: {"cuts":[...numbers...],"transitions":[...optional transition keys...],"description":"..."}`,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const ops = data.operations ?? [];
        const cutOp = ops.find((o: any) => o.type === "splitClip" || o.cuts);
        if (cutOp?.cuts?.length) {
          const times: number[] = cutOp.cuts;
          times.forEach((t: number) => {
            const absTime = clip.startTime + Math.max(0.05, Math.min(clip.duration - 0.05, t));
            dispatch({ type: "SPLIT_CLIP", payload: { clipId: clip.id, time: absTime } });
          });
          setAiResult(`Applied ${times.length} AI-generated cuts`);
        } else {
          // Fallback: use AI smart edit preset
          const preset = getSplitPreset("ai-smart-edit");
          if (preset) {
            const cutTimes = applySplitPreset(clip, preset, { bpm });
            cutTimes.forEach((t) => dispatch({ type: "SPLIT_CLIP", payload: { clipId: clip.id, time: t } }));
            setAiResult(`Applied ${cutTimes.length} smart cuts (AI fallback)`);
          }
        }
      } else {
        const preset = getSplitPreset("ai-smart-edit");
        if (preset) {
          const cutTimes = applySplitPreset(clip, preset, { bpm });
          cutTimes.forEach((t) => dispatch({ type: "SPLIT_CLIP", payload: { clipId: clip.id, time: t } }));
          setAiResult(`Applied ${cutTimes.length} smart cuts`);
        }
      }
    } catch {
      setAiResult("AI unavailable — applied smart preset instead");
      const preset = getSplitPreset("ai-smart-edit");
      if (preset && clip) {
        const cutTimes = applySplitPreset(clip, preset, { bpm });
        cutTimes.forEach((t) => dispatch({ type: "SPLIT_CLIP", payload: { clipId: clip.id, time: t } }));
      }
    } finally {
      setAiLoading(false);
    }
  }

  const CATEGORY_ICONS: Record<string, string> = {
    "Even": "⚖", "Time-Based": "⏱", "Rhythm": "🎵", "Mathematical": "📐",
    "Random": "🎲", "Narrative": "📖", "Social Media": "📱", "Montage": "🎬",
    "Transitions": "✨", "Geometric": "🔷", "Emotional": "❤", "Cinematic": "🎥",
    "Specialized": "⭐", "Documentary": "📹", "AI": "🤖", "All": "🔍",
  };

  const groupedPresets = allCategories
    .filter((c) => c !== "All")
    .map((cat) => ({
      cat,
      presets: filteredPresets.filter((p) => p.category === cat),
    }))
    .filter((g) => g.presets.length > 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-border shrink-0">
        {[
          { key: "splits", label: "Splits", icon: <Scissors className="w-3 h-3" /> },
          { key: "templates", label: "Templates", icon: <Zap className="w-3 h-3" /> },
          { key: "ai", label: "AI Edits", icon: <Wand2 className="w-3 h-3" /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors ${
              activeTab === t.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Clip selector */}
      <div className="px-2 py-1.5 border-b border-border/50 bg-muted/5 shrink-0">
        <Label className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1 block">Target Clip</Label>
        <Select
          value={selectedClipId || state.selectedClipIds[0] || ""}
          onValueChange={setSelectedClipId}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder={clipChoices.length ? "Select a clip to split" : "No clips on timeline"} />
          </SelectTrigger>
          <SelectContent>
            {clipChoices.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-xs">
                {c.label || c.mediaType} ({c.duration.toFixed(1)}s)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedClip && (
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Duration: {selectedClip.duration.toFixed(2)}s · Track {selectedClip.trackIndex}
          </p>
        )}
      </div>

      {/* BPM control (shown in splits and templates) */}
      {activeTab !== "ai" && (
        <div className="px-2 py-1.5 border-b border-border/50 flex items-center gap-2 shrink-0">
          <Music2 className="w-3 h-3 text-muted-foreground" />
          <Label className="text-[10px] text-muted-foreground w-8">BPM</Label>
          <Slider value={[bpm]} onValueChange={([v]) => setBpm(v)} min={60} max={200} step={1} className="flex-1" />
          <Input
            type="number"
            value={bpm}
            onChange={(e) => setBpm(Math.max(60, Math.min(200, Number(e.target.value))))}
            className="w-14 h-6 text-xs text-center"
            min={60}
            max={200}
          />
        </div>
      )}

      {/* ─── Splits Tab ─── */}
      {activeTab === "splits" && (
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {/* Search + Category Filter */}
          <div className="flex gap-1.5">
            <Input
              placeholder="Search splits..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="h-7 text-xs flex-1"
            />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-7 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allCategories.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {CATEGORY_ICONS[c] ?? "•"} {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedClip && (
            <div className="text-center py-4 text-xs text-muted-foreground">
              Select a clip above to apply splits
            </div>
          )}

          {/* Grouped preset grid */}
          <div className="space-y-2">
            {(categoryFilter === "All" ? groupedPresets : groupedPresets.filter((g) => g.cat === categoryFilter)).map(({ cat, presets }) => (
              <CollapsibleGroup key={cat} title={cat} emoji={CATEGORY_ICONS[cat] ?? "•"} defaultOpen={cat === categoryFilter || (categoryFilter === "All" && presets.length <= 12)}>
                <div className="grid grid-cols-2 gap-1">
                  {presets.map((p) => (
                    <div
                      key={p.key}
                      className={`relative group border rounded-md p-1.5 transition-colors cursor-pointer ${
                        previewPreset?.key === p.key
                          ? "border-primary bg-primary/10"
                          : "border-border/60 hover:border-primary/50 hover:bg-muted/30"
                      }`}
                      onClick={() => setPreviewPreset(previewPreset?.key === p.key ? null : p)}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-sm">{p.emoji}</span>
                        <span className="text-[10px] font-medium truncate flex-1">{p.label}</span>
                        {p.kind === "ai" && <span className="text-[8px] bg-primary/20 text-primary px-0.5 rounded">AI</span>}
                      </div>
                      <p className="text-[9px] text-muted-foreground leading-tight line-clamp-2">{p.description}</p>
                      {selectedClip && (
                        <div className="mt-1 flex gap-1">
                          <span className="text-[8px] text-muted-foreground">
                            {p.cuts(selectedClip.duration, { bpm }).length} cuts
                          </span>
                          <button
                            className="ml-auto text-[8px] bg-primary/80 hover:bg-primary text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); applySplit(p); }}
                          >
                            Apply
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleGroup>
            ))}
          </div>

          {filteredPresets.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground">No splits match your search</div>
          )}

          {/* Apply button for selected preset */}
          {previewPreset && selectedClip && (
            <div className="sticky bottom-0 bg-background border-t border-border p-2 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium truncate">{previewPreset.emoji} {previewPreset.label}</p>
                <p className="text-[9px] text-muted-foreground">{previewPreset.cuts(selectedClip.duration, { bpm }).length} cuts</p>
              </div>
              <Button size="sm" className="h-7 text-xs shrink-0" onClick={() => { applySplit(previewPreset); setPreviewPreset(null); }}>
                <Scissors className="w-3 h-3 mr-1" /> Apply Split
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ─── Templates Tab ─── */}
      {activeTab === "templates" && (
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          <p className="text-[10px] text-muted-foreground">Smart Edit Templates — one click to apply splits, transitions & color grade to a complete video edit.</p>
          {!selectedClip && (
            <div className="text-center py-4 text-xs text-muted-foreground">Select a clip above to apply a template</div>
          )}
          <div className="space-y-2">
            {[...new Set(SMART_EDIT_TEMPLATES.map((t) => t.category))].map((cat) => (
              <CollapsibleGroup key={cat} title={cat} emoji="✨" defaultOpen>
                <div className="grid grid-cols-1 gap-1.5">
                  {SMART_EDIT_TEMPLATES.filter((t) => t.category === cat).map((tpl) => (
                    <div
                      key={tpl.key}
                      className="border border-border/60 rounded-md p-2 hover:border-primary/50 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-base">{tpl.emoji}</span>
                            <span className="text-[11px] font-semibold truncate">{tpl.label}</span>
                          </div>
                          <p className="text-[9px] text-muted-foreground leading-snug">{tpl.description}</p>
                          {tpl.transitionKey && (
                            <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1 rounded mt-0.5 inline-block">+ {tpl.transitionKey}</span>
                          )}
                          {tpl.bpm && (
                            <span className="text-[8px] bg-purple-500/20 text-purple-400 px-1 rounded mt-0.5 inline-block ml-0.5">{tpl.bpm} BPM</span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs shrink-0"
                          disabled={!selectedClip}
                          onClick={() => applyTemplate(tpl)}
                        >
                          <Zap className="w-3 h-3 mr-1" /> Apply
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleGroup>
            ))}
          </div>
        </div>
      )}

      {/* ─── AI Edits Tab ─── */}
      {activeTab === "ai" && (
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">AI Style Prompt</Label>
            <textarea
              className="w-full h-20 text-xs bg-muted/20 border border-border rounded-md p-2 resize-none focus:outline-none focus:border-primary"
              placeholder="e.g. 'Make it viral with fast cuts and beat sync at 128 BPM' or 'Cinematic documentary style with emotional pacing'"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Music2 className="w-3 h-3 text-muted-foreground" />
            <Label className="text-[10px] text-muted-foreground w-8">BPM</Label>
            <Slider value={[bpm]} onValueChange={([v]) => setBpm(v)} min={60} max={200} step={1} className="flex-1" />
            <Input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(Math.max(60, Math.min(200, Number(e.target.value))))}
              className="w-14 h-6 text-xs text-center"
              min={60} max={200}
            />
          </div>

          <Button
            className="w-full h-8 text-xs"
            disabled={!selectedClip || aiLoading}
            onClick={runAiSplit}
          >
            {aiLoading
              ? <><RefreshCw className="w-3 h-3 mr-1.5 animate-spin" /> Analyzing...</>
              : <><Wand2 className="w-3 h-3 mr-1.5" /> Generate AI Smart Edit</>
            }
          </Button>

          {aiResult && (
            <div className="flex items-start gap-2 bg-primary/10 border border-primary/30 rounded-md p-2 text-xs">
              <Wand2 className="w-3 h-3 text-primary mt-0.5 shrink-0" />
              <span className="text-primary/90">{aiResult}</span>
              <button onClick={() => setAiResult(null)} className="ml-auto text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
            </div>
          )}

          <Separator />

          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">AI Presets</p>
            <div className="grid grid-cols-1 gap-1.5">
              {SPLIT_PRESETS.filter((p) => p.kind === "ai").map((p) => (
                <div key={p.key} className="flex items-center gap-2 border border-border/60 rounded-md px-2 py-1.5 hover:bg-muted/20 transition-colors">
                  <span className="text-lg">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium">{p.label}</p>
                    <p className="text-[9px] text-muted-foreground truncate">{p.description}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs shrink-0"
                    disabled={!selectedClip}
                    onClick={() => {
                      if (!selectedClip) return;
                      const cuts = applySplitPreset(selectedClip, p, { bpm });
                      cuts.forEach((t) => dispatch({ type: "SPLIT_CLIP", payload: { clipId: selectedClip.id, time: t } }));
                      setAiResult(`Applied ${cuts.length} cuts with "${p.label}"`);
                    }}
                  >
                    <Play className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

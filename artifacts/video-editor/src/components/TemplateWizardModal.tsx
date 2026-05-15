import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { ChevronRight, ChevronLeft, Upload, Type, Image as ImageIcon, Film, Check, Wand2, Search, Save, Trash2, Star, Globe, Loader2, Share2, Download, FolderOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TEMPLATES, type TemplateCategory } from "@/lib/templates";
import { saveCustomTemplate, loadCustomTemplates, deleteCustomTemplate, exportCustomTemplates, importCustomTemplates, type CustomTemplate } from "@/lib/custom-templates";
import { apiFetch } from "@/lib/api-client";
import type { EditorState, EditorAction, Clip } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

interface TemplateWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
}

type SlotKind = "text" | "image" | "video" | "color";

interface Slot {
  clipId: string;
  kind: SlotKind;
  label: string;
  value: string;
  fileUrl?: string;
  fileName?: string;
}

interface CommunityTemplate {
  id: number;
  name: string;
  description: string;
  emoji: string;
  canvasWidth: number;
  canvasHeight: number;
  duration: number;
  background: string;
  featured: boolean;
  downloads: number;
  authorName: string | null;
}

function detectSlotKind(clip: Clip): SlotKind {
  if (clip.mediaType === "text") return "text";
  if (clip.mediaType === "image") return "image";
  if (clip.mediaType === "video") return "video";
  return "color";
}

function extractSlots(clips: Clip[]): Slot[] {
  return clips
    .filter((c) => c.label?.startsWith("Slot") || c.mediaType === "text" || c.mediaType === "blank")
    .slice(0, 12)
    .map((c, i) => ({
      clipId: c.id,
      kind: detectSlotKind(c),
      label: c.label || `Slot ${i + 1}`,
      value: c.text || "",
    }));
}

type TabKind = "builtin" | "my" | "community";

export function TemplateWizardModal({ open, onOpenChange, state, dispatch }: TemplateWizardModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<"template" | "fill" | "save" | "done">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [activeSlot, setActiveSlot] = useState(0);
  const [tplSearch, setTplSearch] = useState("");
  const [tplCategory, setTplCategory] = useState<TemplateCategory | "all">("all");
  const [tab, setTab] = useState<TabKind>("builtin");
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>(() => loadCustomTemplates());
  const [saveName, setSaveName] = useState("");
  const [saveDesc, setSaveDesc] = useState("");
  const [saveEmoji, setSaveEmoji] = useState("⭐");
  const [shareToGlobal, setShareToGlobal] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "sharing" | "done" | "error">("idle");

  // Community tab state
  const [community, setCommunity] = useState<CommunityTemplate[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityPage, setCommunityPage] = useState(1);
  const [communityTotal, setCommunityTotal] = useState(0);
  const [communitySearch, setCommunitySearch] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const fetchCommunity = useCallback(async (page = 1, featured = false) => {
    setCommunityLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "24" });
      if (featured) params.set("featured", "true");
      const data = await apiFetch<{ templates: CommunityTemplate[]; total: number }>(`/shared-templates?${params}`);
      setCommunity(page === 1 ? data.templates : (prev) => [...prev, ...data.templates]);
      setCommunityTotal(data.total);
      setCommunityPage(page);
    } catch { setCommunity([]); } finally { setCommunityLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === "community" && community.length === 0 && !communityLoading) {
      fetchCommunity(1, featuredOnly);
    }
  }, [tab]);

  const templateCategories = useMemo(() => {
    const cats = new Set<TemplateCategory>();
    TEMPLATES.forEach((t) => { if (t.category) cats.add(t.category); });
    return ["all", ...Array.from(cats)] as (TemplateCategory | "all")[];
  }, []);

  const filteredTemplates = useMemo(() => {
    const q = tplSearch.toLowerCase().trim();
    return TEMPLATES.filter((t) => {
      const catOk = tplCategory === "all" || t.category === tplCategory;
      const qOk = !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || (t.emoji && t.emoji.includes(q));
      return catOk && qOk;
    });
  }, [tplSearch, tplCategory]);

  const filteredCommunity = useMemo(() => {
    const q = communitySearch.toLowerCase().trim();
    if (!q) return community;
    return community.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }, [community, communitySearch]);

  const handleSelectTemplate = (key: string) => {
    setSelectedTemplate(key);
    dispatch({ type: "APPLY_TEMPLATE", payload: { templateKey: key } });
    const tpl = TEMPLATES.find((t) => t.key === key);
    if (tpl) {
      const built = tpl.build();
      setSlots(extractSlots(built.clips));
    }
    setActiveSlot(0);
    setStep("fill");
  };

  const handleSelectCustomTemplate = (tpl: CustomTemplate) => {
    setSelectedTemplate(tpl.id);
    dispatch({
      type: "REPLACE_STATE",
      payload: {
        ...state,
        ...tpl.snapshot,
        selectedClipIds: [],
        isPlaying: false,
        currentTime: 0,
      },
    });
    setSlots(extractSlots(tpl.snapshot.clips));
    setActiveSlot(0);
    setStep("fill");
  };

  const handleSelectCommunityTemplate = async (tpl: CommunityTemplate) => {
    setSelectedTemplate(String(tpl.id));
    try {
      const data = await apiFetch<{ stateJson: string }>(`/shared-templates/${tpl.id}/apply`, { method: "POST" });
      const snap = JSON.parse(data.stateJson);
      dispatch({
        type: "REPLACE_STATE",
        payload: { ...state, ...snap, selectedClipIds: [], isPlaying: false, currentTime: 0 },
      });
      setSlots(extractSlots(snap.clips ?? []));
    } catch { setSlots([]); }
    setActiveSlot(0);
    setStep("fill");
  };

  const updateSlotValue = (idx: number, value: string) => {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, value } : s)));
  };

  const updateSlotFile = (idx: number, file: File) => {
    const url = URL.createObjectURL(file);
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, fileUrl: url, fileName: file.name } : s)));
  };

  const applySlots = () => {
    for (const slot of slots) {
      if (slot.kind === "text" && slot.value) {
        dispatch({ type: "UPDATE_CLIP", payload: { id: slot.clipId, updates: { text: slot.value } } });
      } else if (slot.fileUrl) {
        const mediaType = slot.kind === "video" ? "video" : "image";
        dispatch({
          type: "UPDATE_CLIP",
          payload: { id: slot.clipId, updates: { src: slot.fileUrl, mediaType, label: slot.fileName || slot.label } },
        });
      }
    }
    setStep("done");
  };

  const handleSaveCustomTemplate = async () => {
    saveCustomTemplate(saveName, saveDesc, saveEmoji, state);
    setCustomTemplates(loadCustomTemplates());

    if (shareToGlobal && user) {
      setShareStatus("sharing");
      try {
        await apiFetch("/shared-templates", {
          method: "POST",
          body: JSON.stringify({
            name: saveName,
            description: saveDesc,
            emoji: saveEmoji,
            stateJson: JSON.stringify(state),
            canvasWidth: state.canvasWidth,
            canvasHeight: state.canvasHeight,
            duration: state.duration,
            background: state.background,
          }),
        });
        setShareStatus("done");
      } catch {
        setShareStatus("error");
      }
    }
    setStep("done");
  };

  const handleDeleteCustom = (id: string) => {
    deleteCustomTemplate(id);
    setCustomTemplates(loadCustomTemplates());
  };

  const handleImportTemplates = async (file: File) => {
    try {
      const count = await importCustomTemplates(file);
      setCustomTemplates(loadCustomTemplates());
      alert(`Imported ${count} template${count !== 1 ? "s" : ""}.`);
    } catch (err: any) {
      alert(err?.message ?? "Import failed.");
    }
  };

  const reset = () => {
    setStep("template");
    setSelectedTemplate(null);
    setSlots([]);
    setActiveSlot(0);
    setTplSearch("");
    setTplCategory("all");
    setSaveName("");
    setSaveDesc("");
    setSaveEmoji("⭐");
    setShareToGlobal(false);
    setShareStatus("idle");
  };

  const current = slots[activeSlot];
  const STEP_LABELS = ["Choose Template", "Fill Slots", "Done"];

  const TabButton = ({ id, label, count }: { id: TabKind; label: string; count?: number }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex-1 text-[11px] py-1 rounded border transition-colors ${
        tab === id ? "bg-primary/20 border-primary/50 text-foreground" : "bg-muted/10 border-border text-muted-foreground hover:bg-muted/20"
      }`}
    >
      {label}{count !== undefined ? ` (${count.toLocaleString()})` : ""}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-primary" />
            Template Wizard
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground shrink-0">
          {STEP_LABELS.map((s, i) => {
            const stepMap: Record<string, number> = { template: 0, fill: 1, save: 1, done: 2 };
            const active = stepMap[step] ?? 0;
            return (
              <span key={s} className={`flex items-center gap-1 ${i <= active ? "text-primary font-medium" : ""}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] border ${i <= active ? "border-primary bg-primary text-white" : "border-border"}`}>
                  {i + 1}
                </span>
                {s}
                {i < STEP_LABELS.length - 1 && <ChevronRight className="w-3 h-3" />}
              </span>
            );
          })}
        </div>

        {/* ── Step: Choose Template ── */}
        {step === "template" && (
          <div className="flex flex-col gap-3 min-h-0 flex-1 overflow-hidden">
            <p className="text-xs text-muted-foreground shrink-0">
              Pick a template — the wizard will guide you to fill each slot.
            </p>

            {/* Tabs */}
            <div className="flex gap-1 shrink-0">
              <TabButton id="builtin" label="Built-in" count={TEMPLATES.length} />
              <TabButton id="my" label="My Templates" count={customTemplates.length} />
              <TabButton id="community" label="Community" count={communityTotal || undefined} />
            </div>

            {/* Built-in tab */}
            {tab === "builtin" && (
              <>
                <div className="relative shrink-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <Input
                    value={tplSearch}
                    onChange={(e) => setTplSearch(e.target.value)}
                    placeholder="Search templates…"
                    className="pl-7 h-7 text-xs"
                  />
                </div>
                {templateCategories.length > 1 && (
                  <div className="flex gap-1 flex-wrap shrink-0">
                    {templateCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setTplCategory(cat)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                          tplCategory === cat
                            ? "bg-primary/20 border-primary/50 text-primary"
                            : "border-border text-muted-foreground hover:bg-muted/20"
                        }`}
                      >
                        {cat === "all" ? `All (${TEMPLATES.length})` : cat}
                      </button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 overflow-y-auto flex-1 pr-1 min-h-0">
                  {filteredTemplates.slice(0, 150).map((t) => (
                    <button
                      key={t.key}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-left transition-all hover:border-primary/40 ${
                        selectedTemplate === t.key ? "border-primary bg-primary/10" : "border-border hover:bg-muted/20"
                      }`}
                      onClick={() => setSelectedTemplate(t.key)}
                    >
                      <div
                        className="w-full rounded flex items-center justify-center text-lg"
                        style={{ aspectRatio: `${t.canvasWidth}/${t.canvasHeight}`, maxHeight: 48, background: t.background ?? "#1a1a2e" }}
                      >
                        <span>{t.emoji}</span>
                      </div>
                      <span className="text-[10px] font-medium text-foreground leading-tight text-center line-clamp-2">{t.name}</span>
                      {t.canvasWidth && (
                        <span className="text-[9px] text-muted-foreground">{t.canvasWidth}×{t.canvasHeight}</span>
                      )}
                    </button>
                  ))}
                  {filteredTemplates.length === 0 && (
                    <p className="col-span-3 text-xs text-muted-foreground text-center py-6">No templates match "{tplSearch}"</p>
                  )}
                </div>
              </>
            )}

            {/* My Templates tab */}
            {tab === "my" && (
              <>
                <div className="flex gap-1.5 shrink-0">
                  <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5 flex-1" onClick={exportCustomTemplates} disabled={customTemplates.length === 0}>
                    <Download className="w-3 h-3" /> Export JSON
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5 flex-1" onClick={() => importInputRef.current?.click()}>
                    <FolderOpen className="w-3 h-3" /> Import JSON
                  </Button>
                  <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleImportTemplates(f); e.target.value = ""; } }} />
                </div>
                <div className="flex flex-col gap-2 overflow-y-auto flex-1 min-h-0">
                  {customTemplates.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      No saved templates yet — apply a template, customize it, then save it via the Done step.
                    </p>
                  )}
                  {customTemplates.map((t) => (
                    <div
                      key={t.id}
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                        selectedTemplate === t.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted/20"
                      }`}
                      onClick={() => setSelectedTemplate(t.id)}
                    >
                      <span className="text-lg">{t.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{t.name}</p>
                        {t.description && <p className="text-[10px] text-muted-foreground line-clamp-1">{t.description}</p>}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteCustom(t.id); }}
                        className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Community tab */}
            {tab === "community" && (
              <>
                <div className="flex gap-2 shrink-0 items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <Input value={communitySearch} onChange={(e) => setCommunitySearch(e.target.value)} placeholder="Search community…" className="pl-7 h-7 text-xs" />
                  </div>
                  <button
                    onClick={() => {
                      setFeaturedOnly((f) => {
                        const next = !f;
                        setCommunity([]);
                        fetchCommunity(1, next);
                        return next;
                      });
                    }}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition-colors ${
                      featuredOnly ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400" : "border-border text-muted-foreground hover:bg-muted/20"
                    }`}
                  >
                    <Star className="w-3 h-3" /> Featured
                  </button>
                </div>

                {communityLoading && community.length === 0 && (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!communityLoading && filteredCommunity.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No community templates yet. Be the first to share one!</p>
                )}

                <div className="grid grid-cols-3 gap-2 overflow-y-auto flex-1 pr-1 min-h-0">
                  {filteredCommunity.map((t) => (
                    <button
                      key={t.id}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-left transition-all hover:border-primary/40 ${
                        selectedTemplate === String(t.id) ? "border-primary bg-primary/10" : "border-border hover:bg-muted/20"
                      }`}
                      onClick={() => setSelectedTemplate(String(t.id))}
                    >
                      <div
                        className="w-full rounded flex items-center justify-center text-lg"
                        style={{ aspectRatio: `${t.canvasWidth}/${t.canvasHeight}`, maxHeight: 48, background: t.background ?? "#1a1a2e" }}
                      >
                        <span>{t.emoji}</span>
                      </div>
                      <span className="text-[10px] font-medium text-foreground leading-tight text-center line-clamp-2">{t.name}</span>
                      <div className="flex items-center gap-1">
                        {t.featured && <Badge variant="secondary" className="text-[8px] h-3 px-1">⭐</Badge>}
                        <span className="text-[9px] text-muted-foreground">{t.downloads} uses</span>
                      </div>
                    </button>
                  ))}
                </div>

                {communityTotal > community.length && (
                  <Button variant="outline" size="sm" className="w-full shrink-0 text-xs h-7" onClick={() => fetchCommunity(communityPage + 1, featuredOnly)} disabled={communityLoading}>
                    {communityLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    Load more ({communityTotal - community.length} remaining)
                  </Button>
                )}
              </>
            )}

            <Button
              className="w-full shrink-0"
              disabled={!selectedTemplate}
              onClick={() => {
                if (!selectedTemplate) return;
                if (tab === "my") {
                  const ct = customTemplates.find((t) => t.id === selectedTemplate);
                  if (ct) handleSelectCustomTemplate(ct);
                } else if (tab === "community") {
                  const ct = filteredCommunity.find((t) => String(t.id) === selectedTemplate);
                  if (ct) handleSelectCommunityTemplate(ct);
                } else {
                  handleSelectTemplate(selectedTemplate);
                }
              }}
            >
              Use This Template <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        )}

        {/* ── Step: Fill Slots ── */}
        {step === "fill" && slots.length > 0 && (
          <div className="space-y-3 overflow-y-auto flex-1">
            <div className="flex gap-1">
              {slots.map((s, i) => (
                <button
                  key={s.clipId}
                  className={`flex-1 h-1.5 rounded-full transition-colors ${i === activeSlot ? "bg-primary" : s.value || s.fileUrl ? "bg-primary/40" : "bg-border"}`}
                  onClick={() => setActiveSlot(i)}
                />
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground">Slot {activeSlot + 1} of {slots.length}</p>

            {current && (
              <div className="border border-border rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-2">
                  {current.kind === "text" ? <Type className="w-4 h-4 text-primary" /> : current.kind === "video" ? <Film className="w-4 h-4 text-primary" /> : <ImageIcon className="w-4 h-4 text-primary" />}
                  <div>
                    <p className="text-sm font-medium">{current.label}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{current.kind} slot</p>
                  </div>
                </div>

                {current.kind === "text" ? (
                  <Input
                    placeholder="Enter your text…"
                    value={current.value}
                    onChange={(e) => updateSlotValue(activeSlot, e.target.value)}
                    className="text-sm"
                    autoFocus
                  />
                ) : (
                  <div>
                    {current.fileUrl ? (
                      <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-md">
                        {current.kind === "image" ? <img src={current.fileUrl} className="w-12 h-8 object-cover rounded" alt="" /> : <Film className="w-6 h-6 text-muted-foreground" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate">{current.fileName}</p>
                          <button className="text-[10px] text-primary hover:underline" onClick={() => fileInputRef.current?.click()}>Change</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="w-full border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-muted/10 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Click to upload {current.kind}</span>
                      </button>
                    )}
                    <input ref={fileInputRef} type="file" accept={current.kind === "video" ? "video/*" : "image/*"} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) updateSlotFile(activeSlot, f); }} />
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {activeSlot > 0 && <Button variant="outline" className="flex-1" onClick={() => setActiveSlot((i) => i - 1)}><ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous</Button>}
              {activeSlot < slots.length - 1 ? (
                <Button className="flex-1" onClick={() => setActiveSlot((i) => i + 1)}>Next <ChevronRight className="w-3.5 h-3.5 ml-1" /></Button>
              ) : (
                <Button className="flex-1" onClick={applySlots}><Check className="w-3.5 h-3.5 mr-1" /> Apply to Timeline</Button>
              )}
            </div>
          </div>
        )}

        {step === "fill" && slots.length === 0 && (
          <div className="text-center py-6 space-y-2">
            <p className="text-sm text-muted-foreground">No editable slots found in this template.</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setStep("template")}>Choose a Different Template</Button>
              <Button onClick={() => setStep("done")}><Check className="w-3.5 h-3.5 mr-1" /> Use As-Is</Button>
            </div>
          </div>
        )}

        {/* ── Step: Save custom template ── */}
        {step === "save" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Save the current timeline as a reusable template for later.</p>
            <div className="flex gap-2 items-center">
              <Input value={saveEmoji} onChange={(e) => setSaveEmoji(e.target.value)} className="w-14 text-center h-8 text-lg" maxLength={2} placeholder="⭐" />
              <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Template name…" className="flex-1 h-8 text-sm" autoFocus />
            </div>
            <Input value={saveDesc} onChange={(e) => setSaveDesc(e.target.value)} placeholder="Short description (optional)" className="h-8 text-sm" />

            {user && (
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded border border-border hover:bg-muted/20 transition-colors">
                <input
                  type="checkbox"
                  checked={shareToGlobal}
                  onChange={(e) => setShareToGlobal(e.target.checked)}
                  className="w-3.5 h-3.5"
                />
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Share to Community (pending review)</span>
              </label>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("done")}>Skip</Button>
              <Button className="flex-1" onClick={handleSaveCustomTemplate} disabled={!saveName.trim()}>
                <Save className="w-3.5 h-3.5 mr-1" /> Save Template
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === "done" && (
          <div className="text-center space-y-3 py-4">
            <div className="text-3xl">🎉</div>
            <p className="text-sm font-medium">Your video is ready!</p>
            {shareStatus === "done" && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-green-400">
                <Share2 className="w-3.5 h-3.5" /> Template submitted to community — pending admin review.
              </div>
            )}
            {shareStatus === "error" && (
              <p className="text-xs text-red-400">Community share failed. Template saved locally.</p>
            )}
            <p className="text-xs text-muted-foreground">All slots have been filled. Review the timeline and make any adjustments.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={reset}>Start Over</Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setSaveName(""); setSaveDesc(""); setSaveEmoji("⭐"); setShareToGlobal(false); setShareStatus("idle"); setStep("save"); }}
              >
                <Save className="w-3.5 h-3.5 mr-1" /> Save as Template
              </Button>
              <Button className="flex-1" onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

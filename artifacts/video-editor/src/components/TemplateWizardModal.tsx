import { useState, useRef, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, Upload, Type, Image as ImageIcon, Film, Check, Wand2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TEMPLATES } from "@/lib/templates";
import type { EditorState, EditorAction, Clip } from "@/lib/types";

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
  /** User's replacement value */
  value: string;
  /** For media: object URL of the uploaded file */
  fileUrl?: string;
  fileName?: string;
}

function detectSlotKind(clip: Clip): SlotKind {
  if (clip.mediaType === "text") return "text";
  if (clip.mediaType === "image") return "image";
  if (clip.mediaType === "video") return "video";
  return "color";
}

/** Extract replaceable "slots" from the current template state. */
function extractSlots(clips: Clip[]): Slot[] {
  return clips
    .filter((c) => c.label?.startsWith("Slot") || c.mediaType === "text" || c.mediaType === "blank")
    .slice(0, 12) // cap at 12 slots
    .map((c, i) => ({
      clipId: c.id,
      kind: detectSlotKind(c),
      label: c.label || `Slot ${i + 1}`,
      value: c.text || "",
    }));
}

export function TemplateWizardModal({ open, onOpenChange, state, dispatch }: TemplateWizardModalProps) {
  const [step, setStep] = useState<"template" | "fill" | "done">("template");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [activeSlot, setActiveSlot] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample the first 16 templates for the picker
  const templateChoices = TEMPLATES.slice(0, 16);

  const handleSelectTemplate = (key: string) => {
    setSelectedTemplate(key);
    dispatch({ type: "APPLY_TEMPLATE", payload: { templateKey: key } });
    // After applying, extract slots from the new state
    // We need to wait for state to update, so use the template definition
    const tpl = TEMPLATES.find((t) => t.key === key);
    if (tpl) {
      const built = tpl.build();
      setSlots(extractSlots(built.clips));
    }
    setActiveSlot(0);
    setStep("fill");
  };

  const updateSlotValue = (idx: number, value: string) => {
    setSlots((prev) => prev.map((s, i) => i === idx ? { ...s, value } : s));
  };

  const updateSlotFile = (idx: number, file: File) => {
    const url = URL.createObjectURL(file);
    setSlots((prev) => prev.map((s, i) => i === idx ? { ...s, fileUrl: url, fileName: file.name } : s));
  };

  const applySlots = () => {
    for (const slot of slots) {
      if (slot.kind === "text" && slot.value) {
        dispatch({ type: "UPDATE_CLIP", payload: { id: slot.clipId, updates: { text: slot.value } } });
      } else if (slot.fileUrl) {
        const mediaType = slot.kind === "video" ? "video" : "image";
        dispatch({ type: "UPDATE_CLIP", payload: { id: slot.clipId, updates: { src: slot.fileUrl, mediaType, label: slot.fileName || slot.label } } });
      }
    }
    setStep("done");
  };

  const reset = () => {
    setStep("template");
    setSelectedTemplate(null);
    setSlots([]);
    setActiveSlot(0);
  };

  const current = slots[activeSlot];
  const allFilled = slots.every((s) => s.value || s.fileUrl);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-primary" />
            Template Wizard
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {["Choose Template", "Fill Slots", "Done"].map((s, i) => {
            const steps = ["template", "fill", "done"];
            const active = steps.indexOf(step);
            return (
              <span key={s} className={`flex items-center gap-1 ${i <= active ? "text-primary font-medium" : ""}`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] border ${i <= active ? "border-primary bg-primary text-white" : "border-border"}`}>{i + 1}</span>
                {s}
                {i < 2 && <ChevronRight className="w-3 h-3" />}
              </span>
            );
          })}
        </div>

        {/* Step: Choose Template */}
        {step === "template" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Pick a template — the wizard will guide you to fill each slot with your content.</p>
            <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
              {templateChoices.map((t) => (
                <button
                  key={t.key}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-left transition-all hover:border-primary/40 ${selectedTemplate === t.key ? "border-primary bg-primary/10" : "border-border hover:bg-muted/20"}`}
                  onClick={() => setSelectedTemplate(t.key)}
                >
                  <div className="w-full aspect-video bg-gradient-to-br from-muted/60 to-muted/20 rounded flex items-center justify-center">
                    <Film className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-[10px] font-medium text-foreground leading-tight text-center line-clamp-2">{t.label}</span>
                  {t.aspectRatio && <span className="text-[9px] text-muted-foreground">{t.aspectRatio}</span>}
                </button>
              ))}
            </div>
            <Button
              className="w-full"
              disabled={!selectedTemplate}
              onClick={() => selectedTemplate && handleSelectTemplate(selectedTemplate)}
            >
              Use This Template <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        )}

        {/* Step: Fill Slots */}
        {step === "fill" && slots.length > 0 && (
          <div className="space-y-3">
            {/* Progress bar */}
            <div className="flex gap-1">
              {slots.map((s, i) => (
                <button
                  key={s.clipId}
                  className={`flex-1 h-1.5 rounded-full transition-colors ${i === activeSlot ? "bg-primary" : (s.value || s.fileUrl) ? "bg-primary/40" : "bg-border"}`}
                  onClick={() => setActiveSlot(i)}
                />
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground">Slot {activeSlot + 1} of {slots.length}</p>

            {/* Current slot */}
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
                        {current.kind === "image" ? (
                          <img src={current.fileUrl} className="w-12 h-8 object-cover rounded" />
                        ) : <Film className="w-6 h-6 text-muted-foreground" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate">{current.fileName}</p>
                          <button className="text-[10px] text-primary hover:underline" onClick={() => updateSlotFile(activeSlot, new File([], ""))}>Change</button>
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
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={current.kind === "video" ? "video/*" : "image/*"}
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) updateSlotFile(activeSlot, f); }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-2">
              {activeSlot > 0 && (
                <Button variant="outline" className="flex-1" onClick={() => setActiveSlot((i) => i - 1)}>
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                </Button>
              )}
              {activeSlot < slots.length - 1 ? (
                <Button className="flex-1" onClick={() => setActiveSlot((i) => i + 1)}>
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              ) : (
                <Button className="flex-1" onClick={applySlots}>
                  <Check className="w-3.5 h-3.5 mr-1" /> Apply to Timeline
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div className="text-center space-y-3 py-4">
            <div className="text-3xl">🎉</div>
            <p className="text-sm font-medium">Your video is ready!</p>
            <p className="text-xs text-muted-foreground">All slots have been filled. Review the timeline and make any adjustments.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={reset}>Start Over</Button>
              <Button className="flex-1" onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        )}

        {slots.length === 0 && step === "fill" && (
          <div className="text-center py-6 space-y-2">
            <p className="text-sm text-muted-foreground">No editable slots found in this template.</p>
            <Button variant="outline" onClick={() => setStep("template")}>Choose a Different Template</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

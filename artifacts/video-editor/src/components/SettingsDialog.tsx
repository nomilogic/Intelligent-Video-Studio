/**
 * Settings dialog — currently hosts the BYO-API-key picker for the AI
 * instruction bar. Keys are persisted in localStorage and never leave
 * the browser unless the user explicitly chooses a remote provider.
 */

import { useEffect, useState } from "react";
import { Settings, ExternalLink, Eye, EyeOff, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  PROVIDERS,
  loadAiKeys,
  saveAiKeys,
  type AiKeysConfig,
  type AiProviderId,
} from "../lib/ai-providers";

export default function SettingsDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<AiKeysConfig>(() => loadAiKeys());
  const [showKeyFor, setShowKeyFor] = useState<AiProviderId | null>(null);

  // Re-read on open in case another tab changed it.
  useEffect(() => {
    if (open) setCfg(loadAiKeys());
  }, [open]);

  const activeProvider = PROVIDERS.find((p) => p.id === cfg.provider);

  const updateKey = (id: AiProviderId, key: string) => {
    setCfg((c) => ({ ...c, keys: { ...c.keys, [id]: key } }));
  };

  const handleSave = () => {
    saveAiKeys(cfg);
    toast({ title: "Settings saved", description: `Active AI: ${activeProvider?.label}` });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Settings" data-testid="button-settings">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Bring your own API keys. Everything stays in your browser — keys are never sent to Replit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Active AI Provider</Label>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setCfg((c) => ({ ...c, provider: p.id, model: p.defaultModel }));
                  }}
                  className={`text-left px-3 py-2 rounded border text-xs transition-colors ${
                    cfg.provider === p.id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <div className="font-medium">{p.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{p.description}</div>
                </button>
              ))}
            </div>
          </div>

          {activeProvider && (
            <div className="space-y-2 border border-border rounded p-3 bg-muted/20">
              <Label className="text-xs">Model</Label>
              <Input
                value={cfg.model}
                onChange={(e) => setCfg((c) => ({ ...c, model: e.target.value }))}
                placeholder={activeProvider.defaultModel}
                className="h-8 text-xs"
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {activeProvider.modelSuggestions.map((m) => (
                  <button
                    key={m}
                    onClick={() => setCfg((c) => ({ ...c, model: m }))}
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      cfg.model === m ? "bg-primary/20 border-primary" : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">API Keys</Label>
            <div className="mt-2 space-y-2">
              {PROVIDERS.filter((p) => p.needsKey).map((p) => {
                const visible = showKeyFor === p.id;
                const value = cfg.keys[p.id] ?? "";
                return (
                  <div key={p.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`key-${p.id}`} className="text-xs flex items-center gap-1.5">
                        {p.label}
                        {p.keyHelpUrl && (
                          <a
                            href={p.keyHelpUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-primary inline-flex items-center gap-0.5 hover:underline"
                          >
                            get key <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </Label>
                      <button
                        type="button"
                        onClick={() => setShowKeyFor(visible ? null : p.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {visible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    </div>
                    <Input
                      id={`key-${p.id}`}
                      type={visible ? "text" : "password"}
                      value={value}
                      onChange={(e) => updateKey(p.id, e.target.value)}
                      placeholder={`${p.label} API key…`}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground italic border-t border-border pt-2">
            All settings are stored in your browser only (<code>localStorage</code>). Clearing site data removes them.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} className="gap-1">
              <Save className="w-3 h-3" /> Save settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { Editor } from "@/components/Editor";
import { initialState as DEFAULT_EDITOR_STATE } from "@/lib/reducer";
import type { EditorState } from "@/lib/types";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface ProjectDTO {
  id: number;
  name: string;
  state: string | null;
  duration: number;
  canvasWidth: number;
  canvasHeight: number;
  thumbnail: string | null;
}

export function EditorPage({ projectId }: { projectId: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialEditorState, setInitialEditorState] = useState<EditorState | null>(null);
  const [projectName, setProjectName] = useState<string>("Untitled");
  const [numericId, setNumericId] = useState<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    if (projectId === "anonymous") {
      // Fall through to anonymous unsaved editor (no API load).
      setNumericId(undefined);
      setInitialEditorState(null);
      setProjectName("Untitled");
      setLoading(false);
      return;
    }
    const idNum = Number(projectId);
    if (!Number.isFinite(idNum)) {
      setError("Invalid project id");
      setLoading(false);
      return;
    }
    setNumericId(idNum);
    apiFetch<ProjectDTO>(`/projects/${idNum}`)
      .then((p) => {
        if (cancelled) return;
        setProjectName(p.name);
        if (p.state) {
          try {
            const parsed = JSON.parse(p.state) as Partial<EditorState>;
            // Merge with reducer defaults so any missing newer fields don't
            // crash the editor.
            setInitialEditorState({
              ...DEFAULT_EDITOR_STATE,
              canvasWidth: p.canvasWidth,
              canvasHeight: p.canvasHeight,
              duration: p.duration,
              ...(parsed as object),
            } as EditorState);
          } catch (err) {
            console.warn("project state parse failed", err);
            setInitialEditorState({
              ...DEFAULT_EDITOR_STATE,
              canvasWidth: p.canvasWidth,
              canvasHeight: p.canvasHeight,
              duration: p.duration,
            });
          }
        } else {
          setInitialEditorState({
            ...DEFAULT_EDITOR_STATE,
            canvasWidth: p.canvasWidth,
            canvasHeight: p.canvasHeight,
            duration: p.duration,
          });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          toast({ title: "Sign in required", description: "Please sign in to open this project." });
          setLocation("/");
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          toast({ title: "Project not found", variant: "destructive" });
          setLocation("/projects");
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          toast({ title: "Access denied", description: "This project belongs to another account.", variant: "destructive" });
          setLocation("/projects");
          return;
        }
        setError(err?.message ?? "Failed to load project");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId, setLocation, toast]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading project…
      </div>
    );
  }
  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-rose-400 gap-2">
        <div>Failed to load project: {error}</div>
        <button className="text-xs underline text-muted-foreground" onClick={() => setLocation("/projects")}>Back to projects</button>
      </div>
    );
  }

  return (
    <Editor
      projectId={numericId}
      projectName={projectName}
      initialEditorState={initialEditorState ?? undefined}
    />
  );
}

export default EditorPage;

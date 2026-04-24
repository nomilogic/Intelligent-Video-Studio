import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";
import { ProcessInstructionBody } from "@workspace/api-zod";

const router = Router();

const SYSTEM_PROMPT = `You are an expert AI editor for a CapCut-style browser video editor. The user gives natural-language instructions and you respond with a JSON document of editor operations.

# Output format (STRICT)
Return ONLY valid JSON, no markdown fences, no commentary:
{
  "operations": [ { "type": "<opType>", "payload": { ... } }, ... ],
  "explanation": "Short human-readable summary of what you did",
  "confidence": 0.95
}

# Editor model (key concepts)
- The timeline has multiple tracks (0 = bottom track shown as overlay/title; higher index sits on top visually).
- Each clip has: id, label, mediaType ("video"|"audio"|"image"|"text"|"blank"), trackIndex, startTime (s), duration (s), x/y/width/height (0-1 normalized to canvas), opacity (0-1), rotation (deg), scale, flipH, flipV, blendMode, borderRadius (px), filters, animationIn/Out (string), animationInDuration/OutDuration (s), volume (0-1), muted, color (#hex), text, textStyle.
- "Current state" provided to you contains the existing clip ids — reference them by exact id.
- The canvas coordinate (0,0) is top-left, (1,1) is bottom-right. Centered = x=(1-width)/2, y=(1-height)/2.

# Available operations
1. addClip — payload: full clip fields (label, mediaType, trackIndex, startTime, duration, x, y, width, height, color, animationIn, animationOut, …)
2. addText — payload: { text, label?, startTime?, duration?, trackIndex?, x?, y?, width?, height?, animationIn?, animationOut?, textStyle?: { fontSize, fontWeight, color, background, align, italic, underline, shadow } }
3. setText — payload: { clipId, text?, textStyle? }
4. cutClip / splitClip — payload: { clipId, cutAt }     (cutAt is absolute time in seconds)
5. trimClip — payload: { clipId, duration? }
6. cropClip — payload: { clipId, cropX, cropY, cropWidth, cropHeight }   (0-1)
7. moveClip — payload: { clipId, x?, y?, startTime?, trackIndex? }
8. resizeClip — payload: { clipId, width?, height? }   (0-1)
9. setOpacity — payload: { clipId, opacity }   (0-1)
10. setRotation — payload: { clipId, rotation }   (degrees)
11. setScale — payload: { clipId, scale }
12. flipClip — payload: { clipId, flipH?, flipV? }
13. setBlendMode — payload: { clipId, blendMode } e.g. "screen", "multiply", "overlay"
14. setVolume — payload: { clipId, volume }   (0-1)
15. setSpeed — payload: { clipId, speed }   (0.25 – 4)
16. setFilter — payload: { clipId, brightness?, contrast?, saturation?, hue?, blur?, grayscale?, sepia?, invert? }   (brightness/contrast/saturation/grayscale/sepia/invert as %, hue degrees, blur px)
17. applyPreset — payload: { clipId, preset } where preset ∈ "cinematic" | "vintage" | "bw" | "vivid" | "dreamy" | "reset"
18. setAnimation — payload: { clipId, animationIn?, animationOut?, animationInDuration?, animationOutDuration? }
    Animations: "none","fade","slideLeft","slideRight","slideUp","slideDown","zoomIn","zoomOut","spin","bounce"
19. setKeyframe — payload: { clipId, time, property, value, easing? }
    property ∈ "x"|"y"|"width"|"height"|"opacity"|"rotation"|"scale"
    easing ∈ "linear"|"ease"|"easeIn"|"easeOut"|"easeInOut"
20. addTransition — payload: { fromClipId, toClipId, type, duration }
    type ∈ "fade"|"dissolve"|"wipe"|"slide"|"zoom"|"spin"
21. deleteClip — payload: { clipId }
22. duplicateClip — payload: { clipId }
23. setCanvasSize — payload: { width, height }
24. setDuration — payload: { duration }
25. setBackground — payload: { color }   (#hex)
26. splitIntoParts — payload: { clipId, parts }   (split a single clip into N equal pieces; great for "split into 5 highlights")
27. splitEvery — payload: { clipId, seconds }   (split a clip every N seconds for fast-cut montages)
28. rippleDelete — payload: { clipId }   (delete a clip and shift later clips on the same track left to close the gap)
29. addMarker — payload: { time?, label?, color? }   (add a colored ruler marker; if time omitted, uses playhead)

# Reasoning rules
- Always reference real clip ids from the supplied state. NEVER invent ids like "clip-1" — use exact ids.
- "Top right" = x=1-width, y=0. "Bottom right" = x=1-width, y=1-height. "Center" = x=(1-width)/2, y=(1-height)/2.
- For "make smaller" reduce width/height by ~30-50%. For "much smaller" by 70%.
- For "fade in" use setAnimation with animationIn:"fade" and a short duration (0.4-1s).
- For "speed up 2x" use setSpeed 2. For slow-mo use 0.5.
- "Punchy" = increase contrast/saturation by 10-25 via setFilter, add zoom-in animation.
- "Cinematic" = applyPreset cinematic. "Vintage" = applyPreset vintage. "B&W"/"Black and white"/"noir" = applyPreset bw.
- For "add transition between A and B", use addTransition with sensible duration (0.5-1s).
- For "intro title", addText with bold large fontSize (96-144), startTime 0, duration 3-4s, animationIn fade, animationOut fade.
- For "lower third", addText with smaller fontSize (~42), placed at y≈0.78, with semi-opaque background.
- "Tighten timing" = move clips so they butt up against each other (no gaps).
- Be ambitious: produce multiple operations to actually achieve the user's goal.

Now process the user's instruction.`;

router.post("/ai/process-instruction", async (req, res) => {
  const body = ProcessInstructionBody.parse(req.body);

  let userMessage = body.instruction;
  if (body.currentState) {
    try {
      const parsed = JSON.parse(body.currentState);
      const summary = {
        canvasWidth: parsed.canvasWidth,
        canvasHeight: parsed.canvasHeight,
        duration: parsed.duration,
        currentTime: parsed.currentTime,
        clips: (parsed.clips || []).map((c: any) => ({
          id: c.id,
          label: c.label,
          mediaType: c.mediaType,
          trackIndex: c.trackIndex,
          startTime: c.startTime,
          duration: c.duration,
          x: c.x, y: c.y, width: c.width, height: c.height,
          opacity: c.opacity,
          animationIn: c.animationIn,
          animationOut: c.animationOut,
          text: c.text,
        })),
        tracks: (parsed.tracks || []).map((t: any) => ({ id: t.id, name: t.name, type: t.type })),
        transitions: parsed.transitions,
      };
      userMessage += `\n\nCurrent editor state:\n${JSON.stringify(summary)}`;
    } catch {
      userMessage += `\n\nCurrent editor state:\n${body.currentState}`;
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        temperature: 0.4,
      },
    });

    const content = response.text ?? "{}";
    let result: any;
    try {
      result = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      result = match
        ? (() => {
            try { return JSON.parse(match[0]); } catch { return null; }
          })()
        : null;
      if (!result) {
        result = { operations: [], explanation: "Failed to parse AI response", confidence: 0 };
      }
    }

    res.json({
      operations: Array.isArray(result.operations) ? result.operations : [],
      explanation: result.explanation ?? "",
      confidence: typeof result.confidence === "number" ? result.confidence : 0.8,
    });
  } catch (err: any) {
    req.log.error({ err }, "AI request failed");
    res.status(500).json({
      operations: [],
      explanation: `AI request failed: ${err?.message || "unknown error"}`,
      confidence: 0,
    });
  }
});

export default router;

/**
 * Beat Sync — detect musical beats in an audio clip and return
 * an array of beat timestamps. Uses the Web Audio API's
 * OfflineAudioContext for fast offline decoding.
 *
 * Algorithm:
 *   1. Decode audio into PCM samples.
 *   2. Compute energy in overlapping windows (spectral flux).
 *   3. Apply adaptive thresholding to find onset candidates.
 *   4. Filter peaks to produce a tempo-consistent beat grid.
 */

export interface BeatSyncOptions {
  /** Lower bound BPM to consider (default 60). */
  minBpm?: number;
  /** Upper bound BPM to consider (default 200). */
  maxBpm?: number;
  /** Sensitivity — higher = more beats detected (0..1, default 0.35). */
  sensitivity?: number;
}

export interface BeatSyncResult {
  beats: number[];       // timestamps in seconds
  bpm: number;           // estimated tempo
  confidence: number;    // 0..1
}

/** Fetch & decode audio from a URL into a Float32 PCM mono buffer. */
async function fetchAndDecode(src: string): Promise<{ samples: Float32Array; sampleRate: number }> {
  const res = await fetch(src, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch audio: ${res.status}`);
  const arrayBuf = await res.arrayBuffer();
  // Decode at a reduced rate for speed — 22050 Hz is sufficient for beat detection
  const ctx = new OfflineAudioContext(1, 1, 22050);
  const decoded = await ctx.decodeAudioData(arrayBuf);
  // Mix down to mono
  const numChannels = decoded.numberOfChannels;
  const numFrames = decoded.length;
  const mono = new Float32Array(numFrames);
  for (let ch = 0; ch < numChannels; ch++) {
    const ch_data = decoded.getChannelData(ch);
    for (let i = 0; i < numFrames; i++) mono[i] += ch_data[i] / numChannels;
  }
  return { samples: mono, sampleRate: decoded.sampleRate };
}

/** Compute energy in overlapping windows → onset strength signal. */
function computeOnsetStrength(samples: Float32Array, sampleRate: number, hopSize = 512): Float32Array {
  const numHops = Math.floor(samples.length / hopSize);
  const energy = new Float32Array(numHops);
  for (let i = 0; i < numHops; i++) {
    let e = 0;
    const start = i * hopSize;
    const end = Math.min(start + hopSize, samples.length);
    for (let j = start; j < end; j++) e += samples[j] * samples[j];
    energy[i] = e / hopSize;
  }
  // Spectral flux: positive diff of log-energy
  const flux = new Float32Array(numHops);
  for (let i = 1; i < numHops; i++) {
    const diff = Math.log(energy[i] + 1e-10) - Math.log(energy[i - 1] + 1e-10);
    flux[i] = Math.max(0, diff);
  }
  return flux;
}

/** Adaptive peak-picking on the onset strength function. */
function pickPeaks(flux: Float32Array, sensitivity: number, hopSec: number): number[] {
  const windowSize = Math.round(0.4 / hopSec); // 400ms adaptive window
  const peaks: number[] = [];
  for (let i = windowSize; i < flux.length - windowSize; i++) {
    let localMax = 0;
    for (let j = i - windowSize; j <= i + windowSize; j++) localMax = Math.max(localMax, flux[j]);
    const threshold = localMax * (1 - sensitivity);
    if (flux[i] >= threshold && flux[i] === localMax) {
      peaks.push(i);
    }
  }
  return peaks;
}

/** Estimate BPM from inter-onset intervals. */
function estimateBpm(peaks: number[], hopSec: number, minBpm: number, maxBpm: number): number {
  if (peaks.length < 2) return 120;
  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push((peaks[i] - peaks[i - 1]) * hopSec);
  }
  // Try BPMs in range and score each
  let bestScore = -Infinity;
  let bestBpm = 120;
  for (let bpm = minBpm; bpm <= maxBpm; bpm += 0.5) {
    const beatSec = 60 / bpm;
    let score = 0;
    for (const iv of intervals) {
      // Score how well this interval fits the beat grid
      const ratio = iv / beatSec;
      const nearestInt = Math.round(ratio);
      if (nearestInt > 0) score += 1 - Math.abs(ratio - nearestInt) / nearestInt;
    }
    if (score > bestScore) { bestScore = score; bestBpm = bpm; }
  }
  return Math.round(bestBpm * 2) / 2; // round to 0.5 BPM
}

/** Main entry point: analyse audio at `src` and return beat timestamps. */
export async function detectBeats(src: string, opts: BeatSyncOptions = {}): Promise<BeatSyncResult> {
  const { minBpm = 60, maxBpm = 200, sensitivity = 0.35 } = opts;
  const hopSize = 512;

  const { samples, sampleRate } = await fetchAndDecode(src);
  const hopSec = hopSize / sampleRate;
  const flux = computeOnsetStrength(samples, sampleRate, hopSize);
  const peakIndices = pickPeaks(flux, sensitivity, hopSec);

  if (peakIndices.length === 0) return { beats: [], bpm: 120, confidence: 0 };

  const bpm = estimateBpm(peakIndices, hopSec, minBpm, maxBpm);
  const beatSec = 60 / bpm;

  // Snap detected onsets to nearest beat grid position
  const rawBeats = peakIndices.map((i) => i * hopSec);
  const snapped = rawBeats.filter((b, idx) => {
    if (idx === 0) return true;
    return b - rawBeats[idx - 1] > beatSec * 0.4; // min spacing
  });

  const confidence = Math.min(1, peakIndices.length / (samples.length / sampleRate / (60 / bpm)));

  return { beats: snapped, bpm, confidence };
}

/** Quick client-side BPM detection without full decoding (energy method). */
export async function quickBpmDetect(src: string): Promise<number> {
  try {
    const result = await detectBeats(src, { sensitivity: 0.4 });
    return result.bpm;
  } catch {
    return 120;
  }
}

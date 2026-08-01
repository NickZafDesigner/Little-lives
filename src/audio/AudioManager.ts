/**
 * Soft multi-layer 8-bit audio for Little Lives.
 * Procedural Web Audio — no asset files required.
 */

type WaveKind = "sine" | "triangle" | "square" | "sawtooth";

type TrackId = "title" | "create" | "world" | "build";

type SfxId =
  | "ui"
  | "confirm"
  | "deny"
  | "menu"
  | "walk"
  | "step"
  | "place"
  | "sell"
  | "interact"
  | "success"
  | "pet"
  | "talk"
  | "coin"
  | "save"
  | "build"
  | "adopt"
  | "chime";

type VoiceId = string;

interface NoteEvent {
  /** Beat within the pattern (0-based, quarter = 1). */
  t: number;
  /** MIDI note number. */
  n: number;
  /** Duration in beats. */
  d: number;
  /** Velocity 0–1. */
  v?: number;
}

interface Layer {
  wave: WaveKind;
  gain: number;
  soft?: boolean;
  /** Optional low-pass cutoff for softness. */
  cutoff?: number;
  notes: NoteEvent[];
}

interface Pattern {
  bars: number;
  layers: Layer[];
  /** Soft percussion hits at these beats. */
  ticks?: Array<{ t: number; kind: "tap" | "shush" | "softkick"; v?: number }>;
}

const MUTE_KEY = "ll_mute";

/** MIDI → Hz */
function hz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function loadMute(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveMute(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** Soft title / create theme — slow lullaby, sparse melody, no sparkle spam. */
const TITLE_PATTERN: Pattern = {
  bars: 16,
  layers: [
    {
      // Soft lead — long phrases with breathing room
      wave: "sine",
      gain: 0.055,
      soft: true,
      cutoff: 1800,
      notes: [
        { t: 0, n: 67, d: 3, v: 0.8 },
        { t: 3, n: 69, d: 1 },
        { t: 4, n: 71, d: 3, v: 0.75 },
        { t: 7, n: 72, d: 1 },
        { t: 8, n: 74, d: 2 },
        { t: 10, n: 72, d: 2 },
        { t: 12, n: 71, d: 2 },
        { t: 14, n: 69, d: 2 },
        { t: 16, n: 67, d: 3, v: 0.75 },
        { t: 19, n: 64, d: 1 },
        { t: 20, n: 66, d: 2 },
        { t: 22, n: 67, d: 2 },
        { t: 24, n: 69, d: 4, v: 0.7 },
        { t: 28, n: 67, d: 4, v: 0.65 },
        { t: 32, n: 64, d: 3, v: 0.7 },
        { t: 35, n: 66, d: 1 },
        { t: 36, n: 67, d: 3, v: 0.65 },
        { t: 39, n: 69, d: 1 },
        { t: 40, n: 71, d: 2 },
        { t: 42, n: 69, d: 2 },
        { t: 44, n: 67, d: 2 },
        { t: 46, n: 66, d: 2 },
        { t: 48, n: 64, d: 4, v: 0.6 },
        { t: 52, n: 62, d: 2, v: 0.55 },
        { t: 54, n: 64, d: 2, v: 0.55 },
        { t: 56, n: 66, d: 4, v: 0.5 },
        { t: 60, n: 67, d: 4, v: 0.55 },
      ],
    },
    {
      // Warm pad chords
      wave: "triangle",
      gain: 0.038,
      soft: true,
      cutoff: 1100,
      notes: [
        { t: 0, n: 55, d: 8, v: 0.7 },
        { t: 8, n: 57, d: 8, v: 0.65 },
        { t: 16, n: 52, d: 8, v: 0.7 },
        { t: 24, n: 54, d: 8, v: 0.65 },
        { t: 32, n: 52, d: 8, v: 0.65 },
        { t: 40, n: 55, d: 8, v: 0.6 },
        { t: 48, n: 50, d: 8, v: 0.65 },
        { t: 56, n: 52, d: 8, v: 0.6 },
      ],
    },
    {
      // Slow bass drones
      wave: "sine",
      gain: 0.06,
      soft: true,
      cutoff: 700,
      notes: [
        { t: 0, n: 43, d: 8 },
        { t: 8, n: 45, d: 8 },
        { t: 16, n: 40, d: 8 },
        { t: 24, n: 42, d: 8 },
        { t: 32, n: 40, d: 8 },
        { t: 40, n: 43, d: 8 },
        { t: 48, n: 38, d: 8 },
        { t: 56, n: 43, d: 8 },
      ],
    },
  ],
  ticks: [
    { t: 0, kind: "shush", v: 0.08 },
    { t: 16, kind: "shush", v: 0.07 },
    { t: 32, kind: "shush", v: 0.08 },
    { t: 48, kind: "shush", v: 0.07 },
  ],
};

/**
 * Cosy town ambience — long, slow, and airy.
 * Two alternating phrases keep the loop from feeling identical.
 */
const WORLD_PATTERN_A: Pattern = {
  bars: 16,
  layers: [
    {
      wave: "triangle",
      gain: 0.048,
      soft: true,
      cutoff: 1600,
      notes: [
        { t: 0, n: 72, d: 4, v: 0.7 },
        { t: 6, n: 74, d: 2, v: 0.55 },
        { t: 8, n: 76, d: 4, v: 0.65 },
        { t: 14, n: 74, d: 2, v: 0.5 },
        { t: 16, n: 71, d: 3, v: 0.6 },
        { t: 20, n: 72, d: 4, v: 0.55 },
        { t: 26, n: 69, d: 2, v: 0.5 },
        { t: 32, n: 67, d: 4, v: 0.65 },
        { t: 38, n: 69, d: 2, v: 0.5 },
        { t: 40, n: 71, d: 3, v: 0.55 },
        { t: 44, n: 72, d: 4, v: 0.6 },
        { t: 50, n: 74, d: 2, v: 0.45 },
        { t: 52, n: 72, d: 4, v: 0.5 },
        { t: 58, n: 71, d: 2, v: 0.45 },
        { t: 60, n: 72, d: 4, v: 0.55 },
      ],
    },
    {
      wave: "sine",
      gain: 0.032,
      soft: true,
      cutoff: 1200,
      notes: [
        { t: 0, n: 64, d: 8, v: 0.65 },
        { t: 8, n: 67, d: 8, v: 0.6 },
        { t: 16, n: 62, d: 8, v: 0.65 },
        { t: 24, n: 64, d: 8, v: 0.55 },
        { t: 32, n: 60, d: 8, v: 0.6 },
        { t: 40, n: 62, d: 8, v: 0.55 },
        { t: 48, n: 64, d: 8, v: 0.6 },
        { t: 56, n: 67, d: 8, v: 0.5 },
      ],
    },
    {
      wave: "sine",
      gain: 0.055,
      soft: true,
      cutoff: 650,
      notes: [
        { t: 0, n: 48, d: 8 },
        { t: 8, n: 45, d: 8 },
        { t: 16, n: 47, d: 8 },
        { t: 24, n: 48, d: 8 },
        { t: 32, n: 43, d: 8 },
        { t: 40, n: 45, d: 8 },
        { t: 48, n: 47, d: 8 },
        { t: 56, n: 48, d: 8 },
      ],
    },
  ],
  ticks: [
    { t: 0, kind: "shush", v: 0.06 },
    { t: 32, kind: "shush", v: 0.05 },
  ],
};

const WORLD_PATTERN_B: Pattern = {
  bars: 16,
  layers: [
    {
      wave: "sine",
      gain: 0.045,
      soft: true,
      cutoff: 1500,
      notes: [
        { t: 2, n: 69, d: 3, v: 0.6 },
        { t: 6, n: 71, d: 2, v: 0.5 },
        { t: 10, n: 72, d: 4, v: 0.65 },
        { t: 18, n: 74, d: 3, v: 0.55 },
        { t: 22, n: 72, d: 2, v: 0.5 },
        { t: 26, n: 71, d: 3, v: 0.55 },
        { t: 34, n: 67, d: 4, v: 0.6 },
        { t: 40, n: 69, d: 3, v: 0.5 },
        { t: 44, n: 71, d: 4, v: 0.55 },
        { t: 50, n: 72, d: 2, v: 0.45 },
        { t: 54, n: 74, d: 2, v: 0.4 },
        { t: 56, n: 72, d: 4, v: 0.5 },
        { t: 60, n: 69, d: 4, v: 0.45 },
      ],
    },
    {
      wave: "triangle",
      gain: 0.03,
      soft: true,
      cutoff: 1000,
      notes: [
        { t: 0, n: 57, d: 8, v: 0.6 },
        { t: 8, n: 59, d: 8, v: 0.55 },
        { t: 16, n: 60, d: 8, v: 0.6 },
        { t: 24, n: 57, d: 8, v: 0.5 },
        { t: 32, n: 55, d: 8, v: 0.55 },
        { t: 40, n: 57, d: 8, v: 0.5 },
        { t: 48, n: 59, d: 8, v: 0.55 },
        { t: 56, n: 60, d: 8, v: 0.5 },
      ],
    },
    {
      wave: "sine",
      gain: 0.05,
      soft: true,
      cutoff: 600,
      notes: [
        { t: 0, n: 45, d: 8 },
        { t: 8, n: 47, d: 8 },
        { t: 16, n: 48, d: 8 },
        { t: 24, n: 45, d: 8 },
        { t: 32, n: 43, d: 8 },
        { t: 40, n: 45, d: 8 },
        { t: 48, n: 47, d: 8 },
        { t: 56, n: 48, d: 8 },
      ],
    },
  ],
  ticks: [
    { t: 16, kind: "shush", v: 0.05 },
    { t: 48, kind: "shush", v: 0.06 },
  ],
};

/**
 * Build-mode theme — jaunty, bouncy, and brighter than the town stroll.
 * Short hops + light taps so placing furniture feels playful.
 */
const BUILD_PATTERN: Pattern = {
  bars: 8,
  layers: [
    {
      // Bouncy lead — skippy major phrases
      wave: "triangle",
      gain: 0.058,
      soft: true,
      cutoff: 2400,
      notes: [
        { t: 0, n: 72, d: 0.5, v: 0.85 },
        { t: 0.5, n: 74, d: 0.5, v: 0.7 },
        { t: 1, n: 76, d: 1, v: 0.8 },
        { t: 2, n: 79, d: 0.5, v: 0.75 },
        { t: 2.5, n: 76, d: 0.5, v: 0.65 },
        { t: 3, n: 74, d: 1, v: 0.7 },
        { t: 4, n: 72, d: 0.5, v: 0.8 },
        { t: 4.5, n: 71, d: 0.5, v: 0.65 },
        { t: 5, n: 72, d: 0.5, v: 0.7 },
        { t: 5.5, n: 74, d: 0.5, v: 0.7 },
        { t: 6, n: 76, d: 1, v: 0.8 },
        { t: 7, n: 79, d: 1, v: 0.75 },
        { t: 8, n: 81, d: 0.5, v: 0.8 },
        { t: 8.5, n: 79, d: 0.5, v: 0.7 },
        { t: 9, n: 76, d: 1, v: 0.75 },
        { t: 10, n: 74, d: 0.5, v: 0.7 },
        { t: 10.5, n: 72, d: 0.5, v: 0.65 },
        { t: 11, n: 74, d: 1, v: 0.7 },
        { t: 12, n: 76, d: 0.5, v: 0.8 },
        { t: 12.5, n: 79, d: 0.5, v: 0.75 },
        { t: 13, n: 81, d: 1, v: 0.7 },
        { t: 14, n: 79, d: 0.5, v: 0.65 },
        { t: 14.5, n: 76, d: 0.5, v: 0.6 },
        { t: 15, n: 74, d: 1, v: 0.7 },
        { t: 16, n: 72, d: 0.5, v: 0.85 },
        { t: 16.5, n: 74, d: 0.5, v: 0.7 },
        { t: 17, n: 76, d: 1, v: 0.8 },
        { t: 18, n: 74, d: 0.5, v: 0.7 },
        { t: 18.5, n: 72, d: 0.5, v: 0.65 },
        { t: 19, n: 69, d: 1, v: 0.7 },
        { t: 20, n: 67, d: 0.5, v: 0.75 },
        { t: 20.5, n: 69, d: 0.5, v: 0.7 },
        { t: 21, n: 71, d: 0.5, v: 0.7 },
        { t: 21.5, n: 72, d: 0.5, v: 0.75 },
        { t: 22, n: 74, d: 1, v: 0.8 },
        { t: 23, n: 72, d: 1, v: 0.75 },
        { t: 24, n: 76, d: 0.5, v: 0.85 },
        { t: 24.5, n: 79, d: 0.5, v: 0.75 },
        { t: 25, n: 81, d: 1, v: 0.8 },
        { t: 26, n: 79, d: 0.5, v: 0.7 },
        { t: 26.5, n: 76, d: 0.5, v: 0.65 },
        { t: 27, n: 74, d: 1, v: 0.7 },
        { t: 28, n: 72, d: 2, v: 0.8 },
        { t: 30, n: 67, d: 1, v: 0.65 },
        { t: 31, n: 72, d: 1, v: 0.7 },
      ],
    },
    {
      // Plucky harmony — off-beat answers
      wave: "square",
      gain: 0.028,
      soft: true,
      cutoff: 1600,
      notes: [
        { t: 1, n: 67, d: 0.5, v: 0.55 },
        { t: 3, n: 69, d: 0.5, v: 0.5 },
        { t: 5, n: 71, d: 0.5, v: 0.55 },
        { t: 7, n: 72, d: 0.5, v: 0.5 },
        { t: 9, n: 69, d: 0.5, v: 0.55 },
        { t: 11, n: 67, d: 0.5, v: 0.5 },
        { t: 13, n: 64, d: 0.5, v: 0.55 },
        { t: 15, n: 67, d: 0.5, v: 0.5 },
        { t: 17, n: 69, d: 0.5, v: 0.55 },
        { t: 19, n: 71, d: 0.5, v: 0.5 },
        { t: 21, n: 72, d: 0.5, v: 0.55 },
        { t: 23, n: 74, d: 0.5, v: 0.5 },
        { t: 25, n: 72, d: 0.5, v: 0.55 },
        { t: 27, n: 69, d: 0.5, v: 0.5 },
        { t: 29, n: 67, d: 0.5, v: 0.55 },
        { t: 31, n: 64, d: 0.5, v: 0.5 },
      ],
    },
    {
      // Walking bass — keeps the feet tapping
      wave: "sine",
      gain: 0.062,
      soft: true,
      cutoff: 750,
      notes: [
        { t: 0, n: 48, d: 1, v: 0.85 },
        { t: 1, n: 52, d: 1, v: 0.7 },
        { t: 2, n: 55, d: 1, v: 0.75 },
        { t: 3, n: 52, d: 1, v: 0.7 },
        { t: 4, n: 50, d: 1, v: 0.8 },
        { t: 5, n: 53, d: 1, v: 0.7 },
        { t: 6, n: 57, d: 1, v: 0.75 },
        { t: 7, n: 53, d: 1, v: 0.7 },
        { t: 8, n: 48, d: 1, v: 0.85 },
        { t: 9, n: 52, d: 1, v: 0.7 },
        { t: 10, n: 55, d: 1, v: 0.75 },
        { t: 11, n: 57, d: 1, v: 0.7 },
        { t: 12, n: 55, d: 1, v: 0.8 },
        { t: 13, n: 52, d: 1, v: 0.7 },
        { t: 14, n: 50, d: 1, v: 0.75 },
        { t: 15, n: 48, d: 1, v: 0.8 },
        { t: 16, n: 45, d: 1, v: 0.85 },
        { t: 17, n: 48, d: 1, v: 0.7 },
        { t: 18, n: 52, d: 1, v: 0.75 },
        { t: 19, n: 48, d: 1, v: 0.7 },
        { t: 20, n: 47, d: 1, v: 0.8 },
        { t: 21, n: 50, d: 1, v: 0.7 },
        { t: 22, n: 53, d: 1, v: 0.75 },
        { t: 23, n: 50, d: 1, v: 0.7 },
        { t: 24, n: 48, d: 1, v: 0.85 },
        { t: 25, n: 52, d: 1, v: 0.7 },
        { t: 26, n: 55, d: 1, v: 0.75 },
        { t: 27, n: 52, d: 1, v: 0.7 },
        { t: 28, n: 48, d: 1, v: 0.8 },
        { t: 29, n: 45, d: 1, v: 0.7 },
        { t: 30, n: 47, d: 1, v: 0.75 },
        { t: 31, n: 48, d: 1, v: 0.85 },
      ],
    },
  ],
  ticks: [
    { t: 0, kind: "softkick", v: 0.12 },
    { t: 1, kind: "tap", v: 0.1 },
    { t: 2, kind: "softkick", v: 0.1 },
    { t: 3, kind: "tap", v: 0.09 },
    { t: 4, kind: "softkick", v: 0.12 },
    { t: 5, kind: "tap", v: 0.1 },
    { t: 5.5, kind: "shush", v: 0.06 },
    { t: 6, kind: "softkick", v: 0.1 },
    { t: 7, kind: "tap", v: 0.09 },
    { t: 8, kind: "softkick", v: 0.12 },
    { t: 9, kind: "tap", v: 0.1 },
    { t: 10, kind: "softkick", v: 0.1 },
    { t: 11, kind: "tap", v: 0.09 },
    { t: 12, kind: "softkick", v: 0.12 },
    { t: 13, kind: "tap", v: 0.1 },
    { t: 13.5, kind: "shush", v: 0.06 },
    { t: 14, kind: "softkick", v: 0.1 },
    { t: 15, kind: "tap", v: 0.1 },
    { t: 16, kind: "softkick", v: 0.12 },
    { t: 17, kind: "tap", v: 0.1 },
    { t: 18, kind: "softkick", v: 0.1 },
    { t: 19, kind: "tap", v: 0.09 },
    { t: 20, kind: "softkick", v: 0.12 },
    { t: 21, kind: "tap", v: 0.1 },
    { t: 21.5, kind: "shush", v: 0.06 },
    { t: 22, kind: "softkick", v: 0.1 },
    { t: 23, kind: "tap", v: 0.09 },
    { t: 24, kind: "softkick", v: 0.12 },
    { t: 25, kind: "tap", v: 0.1 },
    { t: 26, kind: "softkick", v: 0.1 },
    { t: 27, kind: "tap", v: 0.09 },
    { t: 28, kind: "softkick", v: 0.12 },
    { t: 29, kind: "tap", v: 0.1 },
    { t: 30, kind: "softkick", v: 0.1 },
    { t: 31, kind: "tap", v: 0.11 },
  ],
};

const PATTERNS: Record<TrackId, Pattern[]> = {
  title: [TITLE_PATTERN],
  create: [TITLE_PATTERN],
  world: [WORLD_PATTERN_A, WORLD_PATTERN_B],
  build: [BUILD_PATTERN],
};

const BPM: Record<TrackId, number> = {
  title: 68,
  create: 64,
  world: 62,
  build: 112,
};

const MUSIC_GAIN: Record<TrackId, number> = {
  title: 0.4,
  create: 0.38,
  world: 0.34,
  build: 0.4,
};

class AudioManagerImpl {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private unlocked = false;
  private unlockPromise: Promise<void> | null = null;
  private muted = loadMute();
  private track: TrackId | null = null;
  private loopTimer: number | null = null;
  private nextBarAt = 0;
  private phraseIndex = 0;
  private musicGainTarget = 0.34;
  private lastStepAt = 0;
  private listeners = new Set<() => void>();

  isMuted(): boolean {
    return this.muted;
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  onMuteChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** Call from any user gesture so browsers allow audio. */
  unlock(): void {
    if (this.unlocked && this.ctx?.state === "running") return;
    if (this.unlockPromise) return;

    const ctx = this.ensure();
    this.unlockPromise = ctx
      .resume()
      .then(() => {
        this.unlocked = true;
        this.unlockPromise = null;
        this.applyMute();
        // Only kick off music if nothing is already looping.
        if (this.track && this.loopTimer === null) {
          this.scheduleLoop(true);
        }
      })
      .catch(() => {
        this.unlockPromise = null;
      });
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    saveMute(muted);
    this.applyMute();
    for (const cb of this.listeners) cb();
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  playMusic(track: TrackId): void {
    if (this.track === track && this.loopTimer !== null) return;
    this.stopMusicTimers();
    this.replaceMusicBus();
    this.track = track;
    this.phraseIndex = 0;
    this.musicGainTarget = MUSIC_GAIN[track];
    this.ensure();
    if (this.unlocked && this.ctx?.state === "running") {
      this.fadeMusic(this.musicGainTarget, 1.2);
      this.scheduleLoop(true);
    }
  }

  stopMusic(fade = 0.6): void {
    this.fadeMusic(0, fade);
    window.setTimeout(() => {
      this.stopMusicTimers();
      this.replaceMusicBus();
      this.track = null;
    }, fade * 1000 + 50);
  }

  sfx(id: SfxId): void {
    if (this.muted) return;
    this.unlock();
    const ctx = this.ensure();
    if (ctx.state !== "running") return;
    const now = ctx.currentTime;
    const bus = this.sfxBus!;

    switch (id) {
      case "ui":
        this.blip(now, bus, 880, 0.045, 0.07, "triangle");
        break;
      case "confirm":
        this.blip(now, bus, 660, 0.06, 0.08, "triangle");
        this.blip(now + 0.07, bus, 990, 0.08, 0.09, "triangle");
        break;
      case "deny":
        this.blip(now, bus, 220, 0.1, 0.06, "square", 800);
        this.blip(now + 0.08, bus, 180, 0.12, 0.05, "square", 700);
        break;
      case "menu":
        this.blip(now, bus, 520, 0.05, 0.06, "sine");
        this.blip(now + 0.04, bus, 780, 0.07, 0.07, "triangle");
        break;
      case "walk":
        this.blip(now, bus, 420, 0.03, 0.04, "triangle", 900);
        break;
      case "step": {
        if (now - this.lastStepAt < 0.18) return;
        this.lastStepAt = now;
        this.noiseBurst(now, bus, 0.03, 0.035, 1800);
        this.blip(now, bus, 180 + Math.random() * 40, 0.04, 0.028, "sine", 600);
        break;
      }
      case "place":
        this.blip(now, bus, 540, 0.05, 0.07, "triangle");
        this.blip(now + 0.05, bus, 720, 0.07, 0.08, "triangle");
        this.blip(now + 0.11, bus, 960, 0.09, 0.07, "sine");
        break;
      case "sell":
        this.blip(now, bus, 640, 0.05, 0.06, "triangle");
        this.blip(now + 0.06, bus, 480, 0.08, 0.07, "triangle");
        break;
      case "interact":
        this.blip(now, bus, 700, 0.08, 0.08, "triangle");
        this.blip(now + 0.09, bus, 880, 0.1, 0.07, "sine");
        break;
      case "success":
        this.blip(now, bus, 523, 0.08, 0.07, "triangle");
        this.blip(now + 0.09, bus, 659, 0.1, 0.08, "triangle");
        this.blip(now + 0.2, bus, 784, 0.16, 0.09, "sine");
        break;
      case "pet":
        this.blip(now, bus, 920, 0.05, 0.06, "sine");
        this.blip(now + 0.06, bus, 1180, 0.07, 0.055, "sine");
        this.blip(now + 0.13, bus, 980, 0.09, 0.05, "triangle");
        break;
      case "talk":
        this.blip(now, bus, 640, 0.04, 0.05, "square", 1400);
        this.blip(now + 0.05, bus, 760, 0.05, 0.045, "square", 1600);
        this.blip(now + 0.11, bus, 700, 0.06, 0.04, "square", 1500);
        break;
      case "coin":
        this.blip(now, bus, 980, 0.04, 0.06, "square", 2800);
        this.blip(now + 0.05, bus, 1320, 0.08, 0.07, "square", 3200);
        break;
      case "save":
        this.blip(now, bus, 440, 0.06, 0.06, "triangle");
        this.blip(now + 0.08, bus, 554, 0.08, 0.07, "triangle");
        this.blip(now + 0.18, bus, 659, 0.12, 0.08, "sine");
        break;
      case "build":
        this.blip(now, bus, 392, 0.05, 0.06, "triangle");
        this.blip(now + 0.06, bus, 523, 0.08, 0.07, "triangle");
        break;
      case "adopt":
        this.blip(now, bus, 523, 0.1, 0.08, "triangle");
        this.blip(now + 0.1, bus, 659, 0.1, 0.08, "triangle");
        this.blip(now + 0.2, bus, 784, 0.12, 0.09, "sine");
        this.blip(now + 0.34, bus, 1047, 0.18, 0.08, "sine");
        break;
      case "chime":
        this.blip(now, bus, 784, 0.2, 0.07, "sine");
        this.blip(now + 0.04, bus, 988, 0.24, 0.05, "sine");
        break;
    }
  }

  /**
   * Silly per-character voice blip for dialogue typing.
   * Short, quiet, and pitched uniquely per speaker.
   */
  voice(id: VoiceId): void {
    if (this.muted) return;
    this.unlock();
    const ctx = this.ensure();
    if (ctx.state !== "running") return;
    const now = ctx.currentTime;
    const bus = this.sfxBus!;
    const wobble = (Math.random() - 0.5) * 2;

    switch (id) {
      case "mabel": {
        // Warm baker — soft mid triangle, gentle
        const f = 420 + wobble * 30 + Math.random() * 40;
        this.blip(now, bus, f, 0.055, 0.045, "triangle", 1600);
        break;
      }
      case "jun": {
        // Peppy barista — bright square chirps
        const f = 720 + wobble * 50 + Math.random() * 80;
        this.blip(now, bus, f, 0.035, 0.04, "square", 2200);
        this.blip(now + 0.02, bus, f * 1.25, 0.025, 0.025, "square", 2600);
        break;
      }
      case "pip": {
        // Playful gardener — bouncy sine hops
        const f = 560 + wobble * 90 + Math.random() * 120;
        this.blip(now, bus, f, 0.04, 0.042, "sine", 3000);
        this.blip(now + 0.025, bus, f * 0.75, 0.03, 0.028, "triangle", 2000);
        break;
      }
      case "vera": {
        const f = 380 + wobble * 25 + Math.random() * 35;
        this.blip(now, bus, f, 0.05, 0.04, "square", 1400);
        break;
      }
      case "theo": {
        const f = 340 + wobble * 20 + Math.random() * 30;
        this.blip(now, bus, f, 0.05, 0.05, "triangle", 1200);
        this.blip(now + 0.03, bus, f * 0.85, 0.03, 0.03, "sine", 1000);
        break;
      }
      case "sage": {
        const f = 460 + wobble * 20 + Math.random() * 25;
        this.blip(now, bus, f, 0.05, 0.048, "sine", 1500);
        break;
      }
      case "player":
      default: {
        // Ambient / unknown speakers get a pitched soft blip from their id.
        let hash = 0;
        for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
        const base = 420 + (Math.abs(hash) % 280);
        const f = base + wobble * 35 + Math.random() * 40;
        this.blip(now, bus, f, 0.045, 0.038, "sine", 1800);
        break;
      }
    }
  }

  private ensure(): AudioContext {
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(this.master);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.9;
      this.sfxBus.connect(this.master);
    }
    return this.ctx;
  }

  private applyMute(): void {
    if (!this.master || !this.ctx) return;
    const g = this.master.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(this.muted ? 0 : 1, now + 0.12);
  }

  private fadeMusic(to: number, seconds: number): void {
    if (!this.musicBus || !this.ctx) return;
    const g = this.musicBus.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(to, now + seconds);
  }

  private stopMusicTimers(): void {
    if (this.loopTimer !== null) {
      window.clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
  }

  /** Disconnect the music bus so already-scheduled oscillators go silent. */
  private replaceMusicBus(): void {
    if (!this.ctx || !this.master) return;
    if (this.musicBus) {
      try {
        this.musicBus.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0;
    this.musicBus.connect(this.master);
  }

  private scheduleLoop(restart: boolean): void {
    if (!this.track || !this.ctx || !this.musicBus) return;
    const ctx = this.ctx;
    const phrases = PATTERNS[this.track];
    const pattern = phrases[this.phraseIndex % phrases.length]!;
    this.phraseIndex += 1;
    const bpm = BPM[this.track];
    const beat = 60 / bpm;
    const loopBeats = pattern.bars * 4;
    const loopSec = loopBeats * beat;

    if (restart) {
      this.nextBarAt = ctx.currentTime + 0.08;
      this.fadeMusic(this.musicGainTarget, 1.4);
    }

    const start = this.nextBarAt;
    this.playPattern(pattern, start, beat);
    this.nextBarAt = start + loopSec;

    const delayMs = Math.max(20, (this.nextBarAt - ctx.currentTime - 0.2) * 1000);
    this.loopTimer = window.setTimeout(() => {
      this.loopTimer = null;
      if (this.track && this.unlocked) this.scheduleLoop(false);
    }, delayMs);
  }

  private playPattern(pattern: Pattern, start: number, beat: number): void {
    if (!this.musicBus || !this.ctx) return;
    const bus = this.musicBus;

    for (const layer of pattern.layers) {
      for (const note of layer.notes) {
        const t = start + note.t * beat;
        const dur = Math.max(0.04, note.d * beat * 0.92);
        this.tone(
          t,
          bus,
          hz(note.n),
          dur,
          layer.gain * (note.v ?? 1),
          layer.wave,
          layer.cutoff,
          layer.soft,
        );
      }
    }

    for (const tick of pattern.ticks ?? []) {
      const t = start + tick.t * beat;
      const v = tick.v ?? 0.3;
      if (tick.kind === "softkick") {
        this.blip(t, bus, 90, 0.09, 0.045 * v * 2.2, "sine", 400);
        this.noiseBurst(t, bus, 0.04, 0.02 * v, 600);
      } else if (tick.kind === "tap") {
        this.noiseBurst(t, bus, 0.025, 0.028 * v, 3200);
        this.blip(t, bus, 1200, 0.02, 0.02 * v, "triangle", 4000);
      } else {
        this.noiseBurst(t, bus, 0.08, 0.03 * v, 2400);
      }
    }
  }

  private tone(
    when: number,
    dest: AudioNode,
    freq: number,
    dur: number,
    gain: number,
    wave: WaveKind,
    cutoff?: number,
    soft?: boolean,
  ): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, when);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, when);
    const attack = soft ? 0.08 : 0.01;
    const release = soft ? Math.min(0.55, dur * 0.55) : Math.min(0.12, dur * 0.3);
    env.gain.linearRampToValueAtTime(gain, when + attack);
    env.gain.setValueAtTime(gain * 0.85, when + Math.max(attack, dur - release));
    env.gain.linearRampToValueAtTime(0, when + dur);

    let node: AudioNode = osc;
    if (cutoff) {
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(cutoff, when);
      filter.Q.setValueAtTime(0.7, when);
      osc.connect(filter);
      node = filter;
    }
    node.connect(env);
    env.connect(dest);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }

  private blip(
    when: number,
    dest: AudioNode,
    freq: number,
    dur: number,
    gain: number,
    wave: WaveKind,
    cutoff = 2800,
  ): void {
    this.tone(when, dest, freq, dur, gain, wave, cutoff, true);
  }

  private noiseBurst(
    when: number,
    dest: AudioNode,
    dur: number,
    gain: number,
    cutoff: number,
  ): void {
    const ctx = this.ctx!;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, when);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(gain, when + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, when + dur);

    src.connect(filter);
    filter.connect(env);
    env.connect(dest);
    src.start(when);
    src.stop(when + dur + 0.02);
  }
}

export const Audio = new AudioManagerImpl();

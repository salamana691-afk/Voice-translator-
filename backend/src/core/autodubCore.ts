import { createHash } from 'node:crypto';

export const VALID_VOICE_IDS = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'] as const;
export type PrebuiltVoiceId = (typeof VALID_VOICE_IDS)[number];

export const VALID_EMOTIONS = [
  'neutral',
  'cheerful',
  'playful',
  'calm',
  'sad',
  'angry',
  'surprised',
  'whisper',
] as const;
export type EmotionType = (typeof VALID_EMOTIONS)[number];

export const TTS_MODELS = {
  STANDARD: 'gemini-3.8-flash-lite-tts',
  EXPRESSIVE: 'gemini-3.8-flash-tts',
} as const;

export const TRANSLATION_MODEL = 'gemini-3.1-flash-lite' as const;

export interface VoiceCatalogItem {
  voiceId: PrebuiltVoiceId;
  displayName: string;
  gender: 'female' | 'male';
  timbre: string;
  recommendedFor: string;
}

export interface CharacterPreset {
  characterName: string;
  voiceId: PrebuiltVoiceId;
  voicePersonality: string;
  emotion: EmotionType;
  speechRate: number;
  pitch: number;
  voiceProvider: string;
  isEnabled: boolean;
}

export const VOICE_CATALOG: VoiceCatalogItem[] = [
  {
    voiceId: 'Kore',
    displayName: 'Kore — Clear Expressive Female',
    gender: 'female',
    timbre: 'Bright, articulate, anime-friendly soprano',
    recommendedFor: 'Heroines, expressive dialogue, clear narration',
  },
  {
    voiceId: 'Zephyr',
    displayName: 'Zephyr — Warm Playful Female',
    gender: 'female',
    timbre: 'Energetic, warm, lively mid-high register',
    recommendedFor: 'Playful companions, cheerful slice-of-life scenes',
  },
  {
    voiceId: 'Puck',
    displayName: 'Puck — Agile Youthful Male',
    gender: 'male',
    timbre: 'Spirited, nimble, expressive tenor',
    recommendedFor: 'Protagonists, witty sidekicks, fast banter',
  },
  {
    voiceId: 'Charon',
    displayName: 'Charon — Deep Composed Male',
    gender: 'male',
    timbre: 'Low, resonant, calm and authoritative baritone',
    recommendedFor: 'Confident leads, mentors, dramatic narration',
  },
  {
    voiceId: 'Fenrir',
    displayName: 'Fenrir — Intense Dramatic Male',
    gender: 'male',
    timbre: 'Rich, textured, commanding low-mid voice',
    recommendedFor: 'Rivals, suspenseful scenes, emotional confrontations',
  },
];

export const DEFAULT_CHARACTER_PRESETS: CharacterPreset[] = [
  {
    characterName: 'NORA',
    voiceId: 'Kore',
    voicePersonality:
      'Suara perempuan dewasa bergaya anime Jepang, lembut, ceria, dan ekspresif.',
    emotion: 'cheerful',
    speechRate: 1.02,
    pitch: 1.0,
    voiceProvider: 'Gemini Neural TTS',
    isEnabled: true,
  },
  {
    characterName: 'LUCY',
    voiceId: 'Zephyr',
    voicePersonality:
      'Suara perempuan dewasa, energik, ramah, dan sedikit playful.',
    emotion: 'playful',
    speechRate: 1.06,
    pitch: 1.5,
    voiceProvider: 'Gemini Neural TTS',
    isEnabled: true,
  },
  {
    characterName: 'NARRATOR',
    voiceId: 'Kore',
    voicePersonality:
      'Suara perempuan dewasa, tenang, natural, dan jelas.',
    emotion: 'calm',
    speechRate: 0.98,
    pitch: 0.0,
    voiceProvider: 'Gemini Neural TTS',
    isEnabled: true,
  },
  {
    characterName: 'SALMAN',
    voiceId: 'Charon',
    voicePersonality:
      'Suara laki-laki dewasa, rendah, tenang, dan percaya diri.',
    emotion: 'calm',
    speechRate: 0.96,
    pitch: -1.5,
    voiceProvider: 'Gemini Neural TTS',
    isEnabled: true,
  },
];

export interface ContextTurn {
  speaker: string;
  original: string;
  translated: string;
}

export interface TranslateRequestPayload {
  text: string;
  speakerName?: string;
  sourceLang?: string;
  targetLang?: string;
  contextHistory?: ContextTurn[];
  glossary?: Record<string, string>;
  preserveNames?: boolean;
  preserveHonorifics?: boolean;
}

export interface TtsRequestPayload {
  text: string;
  voiceId: string;
  voicePersonality?: string;
  emotion?: string;
  speechRate?: number;
  pitch?: number;
  speakerName?: string;
  model?: string;
}

export interface VoiceDesignRequestPayload {
  personaDescription: string;
  sampleText?: string;
  baseVoiceId?: string;
  emotion?: string;
  speechRate?: number;
  pitch?: number;
}

export interface ValidationResult<T> {
  ok: true;
  value: T;
}

export interface ValidationFailure {
  ok: false;
  code: string;
  message: string;
}

export function validateTranslateRequest(
  body: unknown
): ValidationResult<Required<Pick<TranslateRequestPayload, 'text' | 'sourceLang' | 'targetLang' | 'preserveNames' | 'preserveHonorifics'>> & TranslateRequestPayload> | ValidationFailure {
  if (!body || typeof body !== 'object') {
    return { ok: false, code: 'INVALID_BODY', message: 'Request body must be a JSON object.' };
  }
  const raw = body as Record<string, unknown>;
  const text = typeof raw.text === 'string' ? raw.text.trim() : '';
  if (!text) {
    return { ok: false, code: 'TEXT_REQUIRED', message: 'Field "text" must be a non-empty string.' };
  }
  if (text.length > 1500) {
    return { ok: false, code: 'TEXT_TOO_LONG', message: 'Field "text" exceeds 1500 characters.' };
  }

  const speakerName = typeof raw.speakerName === 'string' ? raw.speakerName.trim().slice(0, 80) : undefined;
  const sourceLang = typeof raw.sourceLang === 'string' && raw.sourceLang.trim() ? raw.sourceLang.trim().slice(0, 40) : 'English';
  const targetLang = typeof raw.targetLang === 'string' && raw.targetLang.trim() ? raw.targetLang.trim().slice(0, 40) : 'Indonesian';
  const preserveNames = typeof raw.preserveNames === 'boolean' ? raw.preserveNames : true;
  const preserveHonorifics = typeof raw.preserveHonorifics === 'boolean' ? raw.preserveHonorifics : true;

  let contextHistory: ContextTurn[] = [];
  if (Array.isArray(raw.contextHistory)) {
    contextHistory = raw.contextHistory
      .slice(-8)
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map((item) => ({
        speaker: typeof item.speaker === 'string' ? item.speaker.trim().slice(0, 60) : 'NARRATOR',
        original: typeof item.original === 'string' ? item.original.trim().slice(0, 400) : '',
        translated: typeof item.translated === 'string' ? item.translated.trim().slice(0, 400) : '',
      }))
      .filter((t) => t.original.length > 0 && t.translated.length > 0);
  }

  let glossary: Record<string, string> = {};
  if (raw.glossary && typeof raw.glossary === 'object' && !Array.isArray(raw.glossary)) {
    for (const [k, v] of Object.entries(raw.glossary as Record<string, unknown>).slice(0, 30)) {
      if (typeof v === 'string' && k.trim() && v.trim()) {
        glossary[k.trim().slice(0, 60)] = v.trim().slice(0, 80);
      }
    }
  }

  return {
    ok: true,
    value: {
      text,
      speakerName,
      sourceLang,
      targetLang,
      contextHistory,
      glossary,
      preserveNames,
      preserveHonorifics,
    },
  };
}

export function normalizeVoiceId(voiceId?: string): PrebuiltVoiceId {
  if (!voiceId) return 'Kore';
  const match = VALID_VOICE_IDS.find((v) => v.toLowerCase() === voiceId.trim().toLowerCase());
  return match ?? 'Kore';
}

export function normalizeEmotion(emotion?: string): EmotionType {
  if (!emotion) return 'neutral';
  const match = VALID_EMOTIONS.find((e) => e.toLowerCase() === emotion.trim().toLowerCase());
  return match ?? 'neutral';
}

export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Number(value.toFixed(2))));
}

export function validateTtsRequest(
  body: unknown
): ValidationResult<{
  text: string;
  voiceId: PrebuiltVoiceId;
  voicePersonality: string;
  emotion: EmotionType;
  speechRate: number;
  pitch: number;
  speakerName: string;
  model: string;
}> | ValidationFailure {
  if (!body || typeof body !== 'object') {
    return { ok: false, code: 'INVALID_BODY', message: 'Request body must be a JSON object.' };
  }
  const raw = body as Record<string, unknown>;
  const text = typeof raw.text === 'string' ? raw.text.trim() : '';
  if (!text) {
    return { ok: false, code: 'TEXT_REQUIRED', message: 'Field "text" must be a non-empty string.' };
  }
  if (text.length > 1200) {
    return { ok: false, code: 'TEXT_TOO_LONG', message: 'Field "text" exceeds 1200 characters.' };
  }

  const voiceId = normalizeVoiceId(typeof raw.voiceId === 'string' ? raw.voiceId : undefined);
  const voicePersonality =
    typeof raw.voicePersonality === 'string' ? raw.voicePersonality.trim().slice(0, 400) : '';
  const emotion = normalizeEmotion(typeof raw.emotion === 'string' ? raw.emotion : undefined);
  const speechRate = clampNumber(raw.speechRate, 0.5, 2.0, 1.0);
  const pitch = clampNumber(raw.pitch, -6.0, 6.0, 0.0);
  const speakerName =
    typeof raw.speakerName === 'string' && raw.speakerName.trim()
      ? raw.speakerName.trim().slice(0, 60)
      : 'NARRATOR';

  const requestedModel = typeof raw.model === 'string' ? raw.model.trim() : '';
  const model = selectTtsModel({
    requestedModel,
    voicePersonality,
    emotion,
  });

  return {
    ok: true,
    value: {
      text,
      voiceId,
      voicePersonality,
      emotion,
      speechRate,
      pitch,
      speakerName,
      model,
    },
  };
}

export function validateVoiceDesignRequest(
  body: unknown
): ValidationResult<{
  personaDescription: string;
  sampleText: string;
  baseVoiceId?: PrebuiltVoiceId;
  emotion: EmotionType;
  speechRate: number;
  pitch: number;
}> | ValidationFailure {
  if (!body || typeof body !== 'object') {
    return { ok: false, code: 'INVALID_BODY', message: 'Request body must be a JSON object.' };
  }
  const raw = body as Record<string, unknown>;
  const personaDescription =
    typeof raw.personaDescription === 'string' ? raw.personaDescription.trim() : '';
  if (personaDescription.length < 4) {
    return {
      ok: false,
      code: 'PERSONA_REQUIRED',
      message: 'Field "personaDescription" must be at least 4 characters.',
    };
  }
  if (personaDescription.length > 500) {
    return {
      ok: false,
      code: 'PERSONA_TOO_LONG',
      message: 'Field "personaDescription" exceeds 500 characters.',
    };
  }

  const defaultSample =
    'Selamat sore! Aku sudah menunggumu di teras akademi sejak tadi. Ayo kita mulai petualangannya sekarang.';
  const sampleText =
    typeof raw.sampleText === 'string' && raw.sampleText.trim()
      ? raw.sampleText.trim().slice(0, 600)
      : defaultSample;

  const baseVoiceId =
    typeof raw.baseVoiceId === 'string' && raw.baseVoiceId.trim()
      ? normalizeVoiceId(raw.baseVoiceId)
      : undefined;
  const emotion = normalizeEmotion(typeof raw.emotion === 'string' ? raw.emotion : 'neutral');
  const speechRate = clampNumber(raw.speechRate, 0.5, 2.0, 1.0);
  const pitch = clampNumber(raw.pitch, -6.0, 6.0, 0.0);

  return {
    ok: true,
    value: {
      personaDescription,
      sampleText,
      baseVoiceId,
      emotion,
      speechRate,
      pitch,
    },
  };
}

export function selectTtsModel(params: {
  requestedModel?: string;
  voicePersonality?: string;
  emotion?: EmotionType;
}): string {
  if (
    params.requestedModel === TTS_MODELS.STANDARD ||
    params.requestedModel === TTS_MODELS.EXPRESSIVE
  ) {
    return params.requestedModel;
  }
  if (
    (params.voicePersonality && params.voicePersonality.length > 0) ||
    (params.emotion && params.emotion !== 'neutral')
  ) {
    return TTS_MODELS.EXPRESSIVE;
  }
  return TTS_MODELS.STANDARD;
}

export function recommendVoiceForPersona(personaDescription: string): PrebuiltVoiceId {
  const lower = personaDescription.toLowerCase();
  const isMale =
    /\b(laki-laki|pria|cowok|male|man|boy|baritone|tenor|bass|deep male|gentleman)\b/.test(lower);

  if (isMale) {
    if (/\b(energik|muda|remaja|playful|cerah|youthful|nimble|puck)\b/.test(lower)) {
      return 'Puck';
    }
    if (/\b(tegas|marah|intens|intense|dramatic|villain|berat|rough)\b/.test(lower)) {
      return 'Fenrir';
    }
    return 'Charon';
  }

  if (/\b(energik|ramah|playful|ceria sekali|lincah|energetic|cheerful|bright)\b/.test(lower)) {
    return 'Zephyr';
  }
  return 'Kore';
}

export function buildVoiceStylePrompt(params: {
  voicePersonality?: string;
  emotion: EmotionType;
  speechRate: number;
  pitch: number;
  speakerName?: string;
}): string {
  const parts: string[] = [];
  if (params.voicePersonality) {
    parts.push(params.voicePersonality);
  } else {
    parts.push('Natural expressive visual novel voice acting in Indonesian');
  }

  if (params.emotion && params.emotion !== 'neutral') {
    const emotionMap: Record<EmotionType, string> = {
      neutral: 'natural balanced tone',
      cheerful: 'bright, warm, cheerful delivery',
      playful: 'playful, lively, slightly teasing delivery',
      calm: 'calm, composed, steady delivery',
      sad: 'soft, melancholic, emotionally vulnerable delivery',
      angry: 'sharp, intense, frustrated delivery',
      surprised: 'sudden, wide-eyed, expressive surprise',
      whisper: 'hushed, intimate, close-mic whisper',
    };
    parts.push(`Emotion: ${emotionMap[params.emotion]}`);
  }

  if (params.speechRate < 0.9) {
    parts.push(`Pacing: deliberate and unhurried (${params.speechRate}x)`);
  } else if (params.speechRate > 1.1) {
    parts.push(`Pacing: brisk and energetic (${params.speechRate}x)`);
  }

  if (params.pitch >= 2.0) {
    parts.push('Vocal register: noticeably higher and lighter');
  } else if (params.pitch <= -2.0) {
    parts.push('Vocal register: deeper and more resonant');
  }

  return parts.join('. ');
}

export function buildTranslationSystemInstruction(params: {
  sourceLang: string;
  targetLang: string;
  preserveNames: boolean;
  preserveHonorifics: boolean;
  glossary?: Record<string, string>;
}): string {
  const glossaryEntries = params.glossary ? Object.entries(params.glossary) : [];
  const glossaryBlock =
    glossaryEntries.length > 0
      ? `\nFixed terminology glossary (preserve exact target forms):\n${glossaryEntries
          .map(([src, dst]) => `- "${src}" -> "${dst}"`)
          .join('\n')}`
      : '';

  return [
    `You are an expert Visual Novel localization translator translating from ${params.sourceLang} to ${params.targetLang}.`,
    'Produce natural, conversational, emotionally faithful dialogue suitable for real-time voice dubbing—never stiff literal textbook phrasing.',
    params.preserveNames
      ? 'Preserve all character names, proper nouns, places, and special terms verbatim unless specified in the glossary.'
      : 'Adapt names only when standard localization requires it.',
    params.preserveHonorifics
      ? 'Keep Japanese/anime honorifics (-san, -chan, -kun, -sama, -senpai) intact if present in the source line.'
      : 'Localize honorifics naturally into the target language.',
    'Handle both short interjections and long multi-sentence monologues cleanly without adding explanations or stage notes.',
    glossaryBlock,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildTranslationUserPrompt(params: {
  text: string;
  speakerName?: string;
  contextHistory?: ContextTurn[];
}): string {
  const history = params.contextHistory ?? [];
  const contextLines =
    history.length > 0
      ? `Recent conversation context:\n${history
          .map((t) => `[${t.speaker}] ${t.original} => ${t.translated}`)
          .join('\n')}\n\n`
      : '';

  const speakerPrefix = params.speakerName ? `Speaker: ${params.speakerName}\n` : '';
  return `${contextLines}${speakerPrefix}Line to translate:\n"${params.text}"`;
}

export function sha256Key(input: unknown): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

export function estimateWavDurationMs(base64Wav: string): number {
  const byteLength = Math.floor((base64Wav.length * 3) / 4);
  const pcmBytes = Math.max(0, byteLength - 44);
  // 24kHz * 1 channel * 2 bytes per sample = 48,000 bytes/sec
  return Math.round((pcmBytes / 48000) * 1000);
}

export class LruTtlCache<T> {
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private readonly store = new Map<string, { value: T; expiresAt: number }>();

  constructor(maxEntries = 250, ttlMs = 15 * 60 * 1000) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    // refresh LRU order
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

export class SlidingWindowRateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly hits = new Map<string, number[]>();

  constructor(maxRequests = 60, windowMs = 60_000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(key: string, now = Date.now()): { allowed: boolean; remaining: number; retryAfterSec: number } {
    const cutoff = now - this.windowMs;
    const timestamps = (this.hits.get(key) ?? []).filter((ts) => ts > cutoff);
    if (timestamps.length >= this.maxRequests) {
      const oldest = timestamps[0] ?? now;
      const retryAfterSec = Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000));
      this.hits.set(key, timestamps);
      return { allowed: false, remaining: 0, retryAfterSec };
    }
    timestamps.push(now);
    this.hits.set(key, timestamps);
    return {
      allowed: true,
      remaining: Math.max(0, this.maxRequests - timestamps.length),
      retryAfterSec: 0,
    };
  }
}

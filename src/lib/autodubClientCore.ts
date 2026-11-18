export type VoiceId = 'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir';

export type EmotionOption =
  | 'neutral'
  | 'cheerful'
  | 'playful'
  | 'calm'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'whisper';

export interface CharacterProfile {
  id: string;
  characterName: string;
  voiceId: VoiceId;
  voicePersonality: string;
  emotion: EmotionOption;
  speechRate: number;
  pitch: number;
  voiceProvider: string;
  isEnabled: boolean;
  avatarUrl?: string;
}

export interface RoiBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoiConfig {
  nameRoi: RoiBox;
  dialogRoi: RoiBox;
  scanIntervalMs: number;
  changeThreshold: number;
}

export interface TranslationSettings {
  sourceLang: string;
  targetLang: string;
  preserveNames: boolean;
  preserveHonorifics: boolean;
  vnContextEnabled: boolean;
  autoPlayDub: boolean;
  glossary: Record<string, string>;
}

export interface PipelineLogItem {
  id: string;
  timestamp: string;
  speaker: string;
  originalText: string;
  translatedText: string;
  voiceUsed: string;
  modelUsed: string;
  cached: boolean;
  usedNarratorFallback: boolean;
}

export interface VnDemoFrame {
  id: string;
  title: string;
  speaker: string;
  dialog: string;
  backdropUrl: string;
  portraitUrl?: string;
}

export const ASSET_PATHS = {
  backdrop: '/src/assets/images/vn_scene_backdrop_1794988146231.jpg',
  nora: '/src/assets/images/char_nora_portrait_1794988147451.jpg',
  lucy: '/src/assets/images/char_lucy_portrait_1794988147342.jpg',
  salman: '/src/assets/images/char_salman_portrait_1794988147218.jpg',
} as const;

export const DEFAULT_CHARACTERS: CharacterProfile[] = [
  {
    id: 'char-nora',
    characterName: 'NORA',
    voiceId: 'Kore',
    voicePersonality:
      'Suara perempuan dewasa bergaya anime Jepang, lembut, ceria, dan ekspresif.',
    emotion: 'cheerful',
    speechRate: 1.02,
    pitch: 1.0,
    voiceProvider: 'Gemini Neural TTS',
    isEnabled: true,
    avatarUrl: ASSET_PATHS.nora,
  },
  {
    id: 'char-lucy',
    characterName: 'LUCY',
    voiceId: 'Zephyr',
    voicePersonality:
      'Suara perempuan dewasa, energik, ramah, dan sedikit playful.',
    emotion: 'playful',
    speechRate: 1.06,
    pitch: 1.5,
    voiceProvider: 'Gemini Neural TTS',
    isEnabled: true,
    avatarUrl: ASSET_PATHS.lucy,
  },
  {
    id: 'char-narrator',
    characterName: 'NARRATOR',
    voiceId: 'Kore',
    voicePersonality: 'Suara perempuan dewasa, tenang, natural, dan jelas.',
    emotion: 'calm',
    speechRate: 0.98,
    pitch: 0.0,
    voiceProvider: 'Gemini Neural TTS',
    isEnabled: true,
  },
  {
    id: 'char-salman',
    characterName: 'SALMAN',
    voiceId: 'Charon',
    voicePersonality:
      'Suara laki-laki dewasa, rendah, tenang, dan percaya diri.',
    emotion: 'calm',
    speechRate: 0.96,
    pitch: -1.5,
    voiceProvider: 'Gemini Neural TTS',
    isEnabled: true,
    avatarUrl: ASSET_PATHS.salman,
  },
];

export const DEFAULT_ROI_CONFIG: RoiConfig = {
  nameRoi: { x: 0.06, y: 0.62, width: 0.24, height: 0.08 },
  dialogRoi: { x: 0.06, y: 0.72, width: 0.88, height: 0.22 },
  scanIntervalMs: 900,
  changeThreshold: 0.86,
};

export const DEFAULT_TRANSLATION_SETTINGS: TranslationSettings = {
  sourceLang: 'English',
  targetLang: 'Indonesian',
  preserveNames: true,
  preserveHonorifics: true,
  vnContextEnabled: true,
  autoPlayDub: true,
  glossary: {
    'Aether Core': 'Aether Core',
    'Neo-Tokyo Academy': 'Neo-Tokyo Academy',
  },
};

export const VN_DEMO_FRAMES: VnDemoFrame[] = [
  {
    id: 'frame-1',
    title: 'Scene 01 · Twilight Terrace Reunion',
    speaker: 'NORA',
    dialog:
      'Wait, Salman-kun! You actually climbed all the way up to the east terrace just to see the sunset with me?',
    backdropUrl: ASSET_PATHS.backdrop,
    portraitUrl: ASSET_PATHS.nora,
  },
  {
    id: 'frame-2',
    title: 'Scene 02 · Signal Intercept',
    speaker: 'SALMAN',
    dialog:
      'Of course. The Aether Core relay goes live in ten minutes, and we should check the skyline frequency together.',
    backdropUrl: ASSET_PATHS.backdrop,
    portraitUrl: ASSET_PATHS.salman,
  },
  {
    id: 'frame-3',
    title: 'Scene 03 · Rooftop Banter',
    speaker: 'LUCY',
    dialog:
      'Hey hey, don’t leave me out of the secret briefing! My headset picked up your voices from two floors below!',
    backdropUrl: ASSET_PATHS.backdrop,
    portraitUrl: ASSET_PATHS.lucy,
  },
  {
    id: 'frame-4',
    title: 'Scene 04 · Unknown Speaker Fallback',
    speaker: 'MYSTERIOUS GUARD',
    dialog:
      'All students must vacate the observation deck before the night barrier activates.',
    backdropUrl: ASSET_PATHS.backdrop,
  },
];

export function normalizeSpeakerKey(name: string): string {
  return name.replace(/[^a-zA-Z0-9\s_-]/g, '').trim().toUpperCase();
}

export function resolveCharacterProfile(
  speakerName: string,
  profiles: CharacterProfile[]
): { profile: CharacterProfile; usedNarratorFallback: boolean } {
  const key = normalizeSpeakerKey(speakerName);
  if (key) {
    const matched = profiles.find(
      (p) => normalizeSpeakerKey(p.characterName) === key && p.isEnabled
    );
    if (matched) {
      return { profile: matched, usedNarratorFallback: false };
    }
  }

  const narrator =
    profiles.find((p) => normalizeSpeakerKey(p.characterName) === 'NARRATOR') ??
    DEFAULT_CHARACTERS[2];

  return { profile: narrator, usedNarratorFallback: key !== 'NARRATOR' };
}

export function computeDialogSimilarity(a: string, b: string): number {
  const normA = a.replace(/\s+/g, ' ').trim().toLowerCase();
  const normB = b.replace(/\s+/g, ' ').trim().toLowerCase();
  if (normA === normB) return 1;
  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1;

  const n = normA.length;
  const m = normB.length;
  let prev = Array.from({ length: m + 1 }, (_, idx) => idx);
  let curr = new Array<number>(m + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    curr[0] = i;
    for (let j = 1; j <= m; j++) {
      const cost = normA[i - 1] === normB[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  return Number((1 - prev[m] / maxLen).toFixed(3));
}

export function shouldProcessOcrFrame(
  prev: { speaker: string; dialog: string } | null,
  next: { speaker: string; dialog: string },
  threshold = 0.86
): { shouldProcess: boolean; similarity: number; reason: string } {
  const cleanDialog = next.dialog.replace(/\s+/g, ' ').trim();
  if (cleanDialog.length < 2) {
    return { shouldProcess: false, similarity: 1, reason: 'Empty OCR dialog ignored' };
  }
  if (!prev) {
    return { shouldProcess: true, similarity: 0, reason: 'Initial dialog captured' };
  }

  const similarity = computeDialogSimilarity(prev.dialog, cleanDialog);
  const speakerChanged =
    normalizeSpeakerKey(next.speaker) !== '' &&
    normalizeSpeakerKey(next.speaker) !== normalizeSpeakerKey(prev.speaker);

  if (similarity < threshold) {
    return {
      shouldProcess: true,
      similarity,
      reason: 'New dialogue line detected',
    };
  }
  if (speakerChanged && similarity < 0.96) {
    return {
      shouldProcess: true,
      similarity,
      reason: 'Speaker changed in ROI 1',
    };
  }

  return {
    shouldProcess: false,
    similarity,
    reason: 'Duplicate dialog suppressed (saves API quota)',
  };
}

export function clampRoiBox(box: RoiBox): RoiBox {
  const x = Math.min(0.95, Math.max(0.01, Number(box.x.toFixed(2))));
  const y = Math.min(0.95, Math.max(0.01, Number(box.y.toFixed(2))));
  const width = Math.min(1 - x, Math.max(0.05, Number(box.width.toFixed(2))));
  const height = Math.min(1 - y, Math.max(0.04, Number(box.height.toFixed(2))));
  return { x, y, width, height };
}

export function validateOfflineGuard(
  isOnline: boolean
): { allowed: true } | { allowed: false; errorMessage: string } {
  if (!isOnline) {
    return {
      allowed: false,
      errorMessage:
        'Offline: Koneksi internet terputus. Permintaan cloud dihentikan dan tidak diganti ke TTS perangkat.',
    };
  }
  return { allowed: true };
}

import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  TRANSLATION_MODEL,
  TTS_MODELS,
  buildTranslationSystemInstruction,
  buildTranslationUserPrompt,
  buildVoiceStylePrompt,
  recommendVoiceForPersona,
  type ContextTurn,
  type EmotionType,
  type PrebuiltVoiceId,
} from '../core/autodubCore.ts';

export class BackendApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;

  constructor(status: number, code: string, message: string, retryable = false) {
    super(message);
    this.name = 'BackendApiError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

function createClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new BackendApiError(
      503,
      'GEMINI_API_KEY_MISSING',
      'Server environment variable GEMINI_API_KEY is not configured.',
      false
    );
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withTimeoutAndRetry<T>(
  operationName: string,
  fn: () => Promise<T>,
  timeoutMs = 35_000,
  maxRetries = 2
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new BackendApiError(
                  504,
                  'UPSTREAM_TIMEOUT',
                  `${operationName} timed out after ${timeoutMs}ms`,
                  true
                )
              ),
            timeoutMs
          )
        ),
      ]);
      return result;
    } catch (err: unknown) {
      lastError = err;
      const mapped = mapGeminiError(err);
      if (!mapped.retryable || attempt === maxRetries) {
        throw mapped;
      }
      const backoffMs = 400 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
  throw mapGeminiError(lastError);
}

function extractReadableErrorMessage(rawMessage: string): string {
  try {
    const parsed = JSON.parse(rawMessage) as { error?: { message?: string } };
    if (parsed?.error?.message) {
      return parsed.error.message;
    }
  } catch {
    // rawMessage is plain text
  }
  return rawMessage;
}

function mapGeminiError(err: unknown): BackendApiError {
  if (err instanceof BackendApiError) return err;

  const anyErr = err as { status?: number; code?: string | number; message?: string } | undefined;
  const rawMessage = anyErr?.message || 'Unexpected error while calling Gemini API.';
  const message = extractReadableErrorMessage(rawMessage);
  const status = typeof anyErr?.status === 'number' ? anyErr.status : 502;

  if (/API_KEY_INVALID|PERMISSION_DENIED/i.test(message) || status === 400 || status === 403) {
    const isQuotaOrBadRequest = status === 400 && !/API_KEY/i.test(message);
    return new BackendApiError(
      isQuotaOrBadRequest ? 400 : 403,
      isQuotaOrBadRequest ? 'GEMINI_BAD_REQUEST' : 'GEMINI_AUTH_ERROR',
      message,
      false
    );
  }

  if (status === 429 || /RESOURCE_EXHAUSTED|rate limit/i.test(message)) {
    return new BackendApiError(429, 'UPSTREAM_RATE_LIMIT', message, true);
  }

  if (status >= 500 || /ECONNRESET|ETIMEDOUT|ENOTFOUND|fetch failed/i.test(message)) {
    return new BackendApiError(502, 'UPSTREAM_UNAVAILABLE', message, true);
  }

  return new BackendApiError(502, 'GEMINI_API_ERROR', message, false);
}

export interface TranslationOutput {
  translatedText: string;
  detectedTone: string;
  preservedTerms: string[];
  modelUsed: string;
}

export async function translateDialogue(params: {
  text: string;
  speakerName?: string;
  sourceLang: string;
  targetLang: string;
  contextHistory?: ContextTurn[];
  glossary?: Record<string, string>;
  preserveNames: boolean;
  preserveHonorifics: boolean;
}): Promise<TranslationOutput> {
  const ai = createClient();
  const systemInstruction = buildTranslationSystemInstruction({
    sourceLang: params.sourceLang,
    targetLang: params.targetLang,
    preserveNames: params.preserveNames,
    preserveHonorifics: params.preserveHonorifics,
    glossary: params.glossary,
  });
  const userPrompt = buildTranslationUserPrompt({
    text: params.text,
    speakerName: params.speakerName,
    contextHistory: params.contextHistory,
  });

  return withTimeoutAndRetry('Gemini Translation', async () => {
    const response = await ai.models.generateContent({
      model: TRANSLATION_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedText: {
              type: Type.STRING,
              description: 'Natural Visual Novel translation in the target language.',
            },
            detectedTone: {
              type: Type.STRING,
              description: 'Short emotion/tone label such as cheerful, calm, sad, playful, or tense.',
            },
            preservedTerms: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Character names, honorifics, or special terms kept intact.',
            },
          },
          required: ['translatedText', 'detectedTone', 'preservedTerms'],
        },
      },
    });

    const rawJson = (response.text ?? '').trim();
    if (!rawJson) {
      throw new BackendApiError(502, 'EMPTY_TRANSLATION', 'Gemini returned an empty translation.');
    }

    let parsed: { translatedText?: string; detectedTone?: string; preservedTerms?: string[] };
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      return {
        translatedText: rawJson,
        detectedTone: 'neutral',
        preservedTerms: [],
        modelUsed: TRANSLATION_MODEL,
      };
    }

    const translatedText = (parsed.translatedText ?? '').trim();
    if (!translatedText) {
      throw new BackendApiError(502, 'EMPTY_TRANSLATION', 'Translation output was blank.');
    }

    return {
      translatedText,
      detectedTone: (parsed.detectedTone ?? 'neutral').trim() || 'neutral',
      preservedTerms: Array.isArray(parsed.preservedTerms)
        ? parsed.preservedTerms.filter((t): t is string => typeof t === 'string')
        : [],
      modelUsed: TRANSLATION_MODEL,
    };
  });
}

export interface TtsOutput {
  audioBase64: string;
  mimeType: string;
  modelUsed: string;
  styleApplied: string;
}

export async function generateSpeechAudio(params: {
  text: string;
  voiceId: PrebuiltVoiceId;
  voicePersonality?: string;
  emotion: EmotionType;
  speechRate: number;
  pitch: number;
  speakerName?: string;
  model: string;
}): Promise<TtsOutput> {
  const ai = createClient();
  const stylePrompt = buildVoiceStylePrompt({
    voicePersonality: params.voicePersonality,
    emotion: params.emotion,
    speechRate: params.speechRate,
    pitch: params.pitch,
    speakerName: params.speakerName,
  });

  return withTimeoutAndRetry('Gemini Neural TTS', async () => {
    const response = await ai.models.generateContent({
      model: params.model,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: params.text,
              speechMetadata: {
                style: stylePrompt,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: params.voiceId,
            },
          },
        },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const audioPart = parts.find((p) => p.inlineData?.data);
    const audioBase64 = audioPart?.inlineData?.data;
    const mimeType = audioPart?.inlineData?.mimeType || 'audio/wav';

    if (!audioBase64) {
      throw new BackendApiError(
        502,
        'EMPTY_AUDIO_RESPONSE',
        'Gemini TTS did not return audio inlineData.'
      );
    }

    return {
      audioBase64,
      mimeType,
      modelUsed: params.model,
      styleApplied: stylePrompt,
    };
  }, 30_000, 1);
}

export async function designVoicePersona(params: {
  personaDescription: string;
  sampleText: string;
  baseVoiceId?: PrebuiltVoiceId;
  emotion: EmotionType;
  speechRate: number;
  pitch: number;
}): Promise<{
  recommendedVoiceId: PrebuiltVoiceId;
  stylePrompt: string;
  audioBase64: string;
  mimeType: string;
  modelUsed: string;
}> {
  const recommendedVoiceId =
    params.baseVoiceId ?? recommendVoiceForPersona(params.personaDescription);
  const stylePrompt = buildVoiceStylePrompt({
    voicePersonality: params.personaDescription,
    emotion: params.emotion,
    speechRate: params.speechRate,
    pitch: params.pitch,
  });

  const ttsResult = await generateSpeechAudio({
    text: params.sampleText,
    voiceId: recommendedVoiceId,
    voicePersonality: params.personaDescription,
    emotion: params.emotion,
    speechRate: params.speechRate,
    pitch: params.pitch,
    model: TTS_MODELS.EXPRESSIVE,
  });

  return {
    recommendedVoiceId,
    stylePrompt,
    audioBase64: ttsResult.audioBase64,
    mimeType: ttsResult.mimeType,
    modelUsed: TTS_MODELS.EXPRESSIVE,
  };
}

import { Router, type Request, type Response } from 'express';
import {
  DEFAULT_CHARACTER_PRESETS,
  LruTtlCache,
  TTS_MODELS,
  TRANSLATION_MODEL,
  VALID_EMOTIONS,
  VOICE_CATALOG,
  estimateWavDurationMs,
  sha256Key,
  validateTranslateRequest,
  validateTtsRequest,
  validateVoiceDesignRequest,
} from '../core/autodubCore.ts';
import { createRateLimitMiddleware } from '../middleware/rateLimit.ts';
import {
  BackendApiError,
  designVoicePersona,
  generateSpeechAudio,
  translateDialogue,
  type TranslationOutput,
  type TtsOutput,
} from '../services/geminiService.ts';

const serverStartTime = Date.now();

export function createAutoDubRouter(): Router {
  const router = Router();
  const translationCache = new LruTtlCache<TranslationOutput>(400, 30 * 60 * 1000);
  const audioCache = new LruTtlCache<TtsOutput>(150, 20 * 60 * 1000);
  const apiRateLimit = createRateLimitMiddleware(90, 60_000);

  router.get('/health', (_req: Request, res: Response) => {
    const geminiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());
    res.json({
      status: geminiConfigured ? 'ok' : 'degraded',
      service: 'autodub-cloud-backend',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
      geminiConfigured,
      models: {
        translation: TRANSLATION_MODEL,
        ttsStandard: TTS_MODELS.STANDARD,
        ttsExpressive: TTS_MODELS.EXPRESSIVE,
      },
      cacheStats: {
        translations: translationCache.size,
        audioClips: audioCache.size,
      },
      privacy: {
        persistentScreenshotStorage: false,
        persistentDialogStorage: false,
      },
    });
  });

  router.get('/voices', (_req: Request, res: Response) => {
    res.json({
      voices: VOICE_CATALOG,
      emotions: VALID_EMOTIONS,
      presets: DEFAULT_CHARACTER_PRESETS,
      models: [
        {
          id: TTS_MODELS.STANDARD,
          label: 'Gemini 3.8 Flash Lite TTS',
          purpose: 'Low-latency standard Visual Novel dubbing',
        },
        {
          id: TTS_MODELS.EXPRESSIVE,
          label: 'Gemini 3.8 Flash TTS',
          purpose: 'Voice Design, custom personas, expressive emotion',
        },
      ],
    });
  });

  router.post('/translate', apiRateLimit, async (req: Request, res: Response) => {
    const validation = validateTranslateRequest(req.body);
    if (!validation.ok) {
      res.status(400).json({
        error: {
          code: validation.code,
          message: validation.message,
          retryable: false,
        },
      });
      return;
    }

    const payload = validation.value;
    const cacheKey = sha256Key({
      text: payload.text,
      speakerName: payload.speakerName ?? '',
      sourceLang: payload.sourceLang,
      targetLang: payload.targetLang,
      preserveNames: payload.preserveNames,
      preserveHonorifics: payload.preserveHonorifics,
      glossary: payload.glossary ?? {},
      contextTail: (payload.contextHistory ?? []).slice(-3),
    });

    const cached = translationCache.get(cacheKey);
    if (cached) {
      res.json({
        originalText: payload.text,
        speakerName: payload.speakerName ?? 'NARRATOR',
        sourceLang: payload.sourceLang,
        targetLang: payload.targetLang,
        translatedText: cached.translatedText,
        detectedTone: cached.detectedTone,
        preservedTerms: cached.preservedTerms,
        modelUsed: cached.modelUsed,
        cached: true,
      });
      return;
    }

    try {
      const result = await translateDialogue({
        text: payload.text,
        speakerName: payload.speakerName,
        sourceLang: payload.sourceLang,
        targetLang: payload.targetLang,
        contextHistory: payload.contextHistory,
        glossary: payload.glossary,
        preserveNames: payload.preserveNames,
        preserveHonorifics: payload.preserveHonorifics,
      });
      translationCache.set(cacheKey, result);

      res.json({
        originalText: payload.text,
        speakerName: payload.speakerName ?? 'NARRATOR',
        sourceLang: payload.sourceLang,
        targetLang: payload.targetLang,
        translatedText: result.translatedText,
        detectedTone: result.detectedTone,
        preservedTerms: result.preservedTerms,
        modelUsed: result.modelUsed,
        cached: false,
      });
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.post('/tts/generate', apiRateLimit, async (req: Request, res: Response) => {
    const validation = validateTtsRequest(req.body);
    if (!validation.ok) {
      res.status(400).json({
        error: {
          code: validation.code,
          message: validation.message,
          retryable: false,
        },
      });
      return;
    }

    const payload = validation.value;
    const cacheKey = sha256Key({
      text: payload.text,
      voiceId: payload.voiceId,
      voicePersonality: payload.voicePersonality,
      emotion: payload.emotion,
      speechRate: payload.speechRate,
      pitch: payload.pitch,
      model: payload.model,
    });

    let result = audioCache.get(cacheKey);
    let isCached = true;

    if (!result) {
      isCached = false;
      try {
        result = await generateSpeechAudio(payload);
        audioCache.set(cacheKey, result);
      } catch (err) {
        handleRouteError(res, err);
        return;
      }
    }

    const wantsBinary =
      req.query.format === 'binary' || req.headers.accept === 'audio/wav';

    if (wantsBinary) {
      const wavBuffer = Buffer.from(result.audioBase64, 'base64');
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Length', String(wavBuffer.length));
      res.setHeader('X-AutoDub-Cached', String(isCached));
      res.setHeader('X-AutoDub-Model', result.modelUsed);
      res.send(wavBuffer);
      return;
    }

    res.json({
      audioBase64: result.audioBase64,
      mimeType: result.mimeType,
      sampleRate: 24000,
      channels: 1,
      bitDepth: 16,
      durationEstimateMs: estimateWavDurationMs(result.audioBase64),
      voiceId: payload.voiceId,
      emotion: payload.emotion,
      modelUsed: result.modelUsed,
      styleApplied: result.styleApplied,
      cached: isCached,
    });
  });

  router.post('/voice/design', apiRateLimit, async (req: Request, res: Response) => {
    const validation = validateVoiceDesignRequest(req.body);
    if (!validation.ok) {
      res.status(400).json({
        error: {
          code: validation.code,
          message: validation.message,
          retryable: false,
        },
      });
      return;
    }

    const payload = validation.value;
    const cacheKey = sha256Key({
      design: true,
      personaDescription: payload.personaDescription,
      sampleText: payload.sampleText,
      baseVoiceId: payload.baseVoiceId ?? 'auto',
      emotion: payload.emotion,
      speechRate: payload.speechRate,
      pitch: payload.pitch,
    });

    const cached = audioCache.get(cacheKey);
    if (cached) {
      res.json({
        recommendedVoiceId:
          payload.baseVoiceId ??
          VOICE_CATALOG.find((v) => cached.styleApplied.includes(v.voiceId))?.voiceId ??
          'Kore',
        stylePrompt: cached.styleApplied,
        audioBase64: cached.audioBase64,
        mimeType: cached.mimeType,
        sampleRate: 24000,
        durationEstimateMs: estimateWavDurationMs(cached.audioBase64),
        modelUsed: cached.modelUsed,
        cached: true,
      });
      return;
    }

    try {
      const designed = await designVoicePersona(payload);
      audioCache.set(cacheKey, {
        audioBase64: designed.audioBase64,
        mimeType: designed.mimeType,
        modelUsed: designed.modelUsed,
        styleApplied: designed.stylePrompt,
      });

      res.json({
        recommendedVoiceId: designed.recommendedVoiceId,
        stylePrompt: designed.stylePrompt,
        audioBase64: designed.audioBase64,
        mimeType: designed.mimeType,
        sampleRate: 24000,
        durationEstimateMs: estimateWavDurationMs(designed.audioBase64),
        modelUsed: designed.modelUsed,
        cached: false,
      });
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.post('/cache/clear', (_req: Request, res: Response) => {
    translationCache.clear();
    audioCache.clear();
    res.json({
      cleared: true,
      cacheStats: {
        translations: translationCache.size,
        audioClips: audioCache.size,
      },
    });
  });

  return router;
}

function handleRouteError(res: Response, err: unknown): void {
  if (err instanceof BackendApiError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        retryable: err.retryable,
      },
    });
    return;
  }

  const msg = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: msg,
      retryable: false,
    },
  });
}

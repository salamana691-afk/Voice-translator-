import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LruTtlCache,
  SlidingWindowRateLimiter,
  TTS_MODELS,
  buildTranslationSystemInstruction,
  buildVoiceStylePrompt,
  recommendVoiceForPersona,
  selectTtsModel,
  sha256Key,
  validateTranslateRequest,
  validateTtsRequest,
  validateVoiceDesignRequest,
} from './autodubCore.ts';

test('validateTranslateRequest enforces non-empty text and applies VN defaults', () => {
  const bad = validateTranslateRequest({ text: '   ' });
  assert.equal(bad.ok, false);

  const ok = validateTranslateRequest({
    text: 'Good morning, Nora-san!',
    speakerName: 'SALMAN',
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.value.sourceLang, 'English');
    assert.equal(ok.value.targetLang, 'Indonesian');
    assert.equal(ok.value.preserveNames, true);
    assert.equal(ok.value.preserveHonorifics, true);
  }
});

test('validateTtsRequest normalizes voiceId, clamps rate/pitch, and selects expressive model for persona', () => {
  const res = validateTtsRequest({
    text: 'Selamat pagi semuanya!',
    voiceId: 'kore',
    voicePersonality: 'Lembut dan ceria',
    emotion: 'cheerful',
    speechRate: 4.5,
    pitch: -12,
  });
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.value.voiceId, 'Kore');
    assert.equal(res.value.speechRate, 2.0);
    assert.equal(res.value.pitch, -6.0);
    assert.equal(res.value.model, TTS_MODELS.EXPRESSIVE);
  }
});

test('selectTtsModel picks flash-lite for neutral standard dubbing and flash-tts for voice design', () => {
  assert.equal(
    selectTtsModel({ voicePersonality: '', emotion: 'neutral' }),
    TTS_MODELS.STANDARD
  );
  assert.equal(
    selectTtsModel({ voicePersonality: 'Warm energetic anime voice', emotion: 'neutral' }),
    TTS_MODELS.EXPRESSIVE
  );
  assert.equal(
    selectTtsModel({ voicePersonality: '', emotion: 'playful' }),
    TTS_MODELS.EXPRESSIVE
  );
});

test('recommendVoiceForPersona matches Indonesian and English persona descriptors accurately', () => {
  assert.equal(
    recommendVoiceForPersona('Suara laki-laki dewasa, rendah, tenang, dan percaya diri.'),
    'Charon'
  );
  assert.equal(
    recommendVoiceForPersona('Suara perempuan dewasa, energik, ramah, dan sedikit playful.'),
    'Zephyr'
  );
  assert.equal(
    recommendVoiceForPersona('Suara perempuan dewasa, tenang, natural, dan jelas.'),
    'Kore'
  );
});

test('buildVoiceStylePrompt and buildTranslationSystemInstruction include persona and preservation rules', () => {
  const style = buildVoiceStylePrompt({
    voicePersonality: 'Ceria dan ekspresif',
    emotion: 'cheerful',
    speechRate: 1.25,
    pitch: 2.5,
  });
  assert.match(style, /Ceria dan ekspresif/);
  assert.match(style, /cheerful/);
  assert.match(style, /1.25x/);
  assert.match(style, /higher/);

  const sys = buildTranslationSystemInstruction({
    sourceLang: 'English',
    targetLang: 'Indonesian',
    preserveNames: true,
    preserveHonorifics: true,
    glossary: { 'Aether Core': 'Aether Core' },
  });
  assert.match(sys, /Visual Novel/);
  assert.match(sys, /Preserve all character names/);
  assert.match(sys, /Aether Core/);
});

test('validateVoiceDesignRequest requires persona description >= 4 chars', () => {
  assert.equal(validateVoiceDesignRequest({ personaDescription: 'hi' }).ok, false);
  const valid = validateVoiceDesignRequest({
    personaDescription: 'Suara perempuan dewasa bergaya anime Jepang, lembut, ceria, dan ekspresif.',
  });
  assert.equal(valid.ok, true);
});

test('LruTtlCache evicts oldest entry when capacity exceeded and sha256Key is deterministic', () => {
  const cache = new LruTtlCache<string>(2, 60_000);
  cache.set('a', '1');
  cache.set('b', '2');
  assert.equal(cache.get('a'), '1'); // 'a' refreshed, 'b' is now oldest
  cache.set('c', '3'); // evicts 'b'
  assert.equal(cache.get('b'), undefined);
  assert.equal(cache.get('a'), '1');
  assert.equal(cache.get('c'), '3');

  assert.equal(sha256Key({ x: 1, y: 'a' }), sha256Key({ x: 1, y: 'a' }));
});

test('SlidingWindowRateLimiter enforces request limit and computes retryAfter', () => {
  const limiter = new SlidingWindowRateLimiter(2, 10_000);
  assert.equal(limiter.check('ip1', 1000).allowed, true);
  assert.equal(limiter.check('ip1', 2000).allowed, true);
  const blocked = limiter.check('ip1', 3000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSec, 8);
  assert.equal(limiter.check('ip1', 12000).allowed, true);
});

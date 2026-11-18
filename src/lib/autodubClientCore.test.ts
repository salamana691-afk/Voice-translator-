import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CHARACTERS,
  clampRoiBox,
  computeDialogSimilarity,
  resolveCharacterProfile,
  shouldProcessOcrFrame,
  validateOfflineGuard,
} from './autodubClientCore.ts';

test('resolveCharacterProfile matches known character and falls back to NARRATOR for unknown or disabled', () => {
  const nora = resolveCharacterProfile('Nora:', DEFAULT_CHARACTERS);
  assert.equal(nora.profile.characterName, 'NORA');
  assert.equal(nora.usedNarratorFallback, false);

  const unknown = resolveCharacterProfile('MYSTERIOUS GUARD', DEFAULT_CHARACTERS);
  assert.equal(unknown.profile.characterName, 'NARRATOR');
  assert.equal(unknown.usedNarratorFallback, true);

  const disabledList = DEFAULT_CHARACTERS.map((c) =>
    c.characterName === 'SALMAN' ? { ...c, isEnabled: false } : c
  );
  const disabledSalman = resolveCharacterProfile('SALMAN', disabledList);
  assert.equal(disabledSalman.profile.characterName, 'NARRATOR');
  assert.equal(disabledSalman.usedNarratorFallback, true);
});

test('shouldProcessOcrFrame suppresses duplicate OCR dialog frames and allows distinct lines', () => {
  const first = shouldProcessOcrFrame(
    null,
    { speaker: 'NORA', dialog: 'Wait, Salman-kun!' },
    0.86
  );
  assert.equal(first.shouldProcess, true);

  const duplicate = shouldProcessOcrFrame(
    { speaker: 'NORA', dialog: 'Wait, Salman-kun!' },
    { speaker: 'NORA', dialog: 'Wait,  Salman-kun!' },
    0.86
  );
  assert.equal(duplicate.shouldProcess, false);

  const changed = shouldProcessOcrFrame(
    { speaker: 'NORA', dialog: 'Wait, Salman-kun!' },
    { speaker: 'SALMAN', dialog: 'Of course, let us check the relay.' },
    0.86
  );
  assert.equal(changed.shouldProcess, true);
  assert.ok(computeDialogSimilarity('hello', 'hello') === 1);
});

test('clampRoiBox keeps ROI coordinates within [0..1] viewport bounds', () => {
  const clamped = clampRoiBox({ x: 0.9, y: 0.9, width: 0.5, height: 0.5 });
  assert.ok(clamped.x + clamped.width <= 1.001);
  assert.ok(clamped.y + clamped.height <= 1.001);
});

test('validateOfflineGuard blocks cloud requests when offline', () => {
  assert.equal(validateOfflineGuard(true).allowed, true);
  const off = validateOfflineGuard(false);
  assert.equal(off.allowed, false);
  if (!off.allowed) {
    assert.match(off.errorMessage, /Offline/i);
  }
});

import React, { useState } from 'react';
import { Plus, Trash2, UserCheck, Sparkles } from 'lucide-react';
import {
  type CharacterProfile,
  type EmotionOption,
  type VoiceId,
} from '../lib/autodubClientCore';

interface CharacterManagerViewProps {
  characters: CharacterProfile[];
  onUpsertCharacter: (profile: CharacterProfile) => void;
  onDeleteCharacter: (id: string) => void;
  onOpenInStudio: (profile: CharacterProfile) => void;
}

const VOICE_OPTIONS: VoiceId[] = ['Kore', 'Zephyr', 'Puck', 'Charon', 'Fenrir'];
const EMOTION_OPTIONS: EmotionOption[] = [
  'neutral',
  'cheerful',
  'playful',
  'calm',
  'sad',
  'angry',
  'surprised',
  'whisper',
];

export const CharacterManagerView: React.FC<CharacterManagerViewProps> = ({
  characters,
  onUpsertCharacter,
  onDeleteCharacter,
  onOpenInStudio,
}) => {
  const [name, setName] = useState('');
  const [voiceId, setVoiceId] = useState<VoiceId>('Kore');
  const [emotion, setEmotion] = useState<EmotionOption>('cheerful');
  const [personality, setPersonality] = useState('');
  const [speechRate, setSpeechRate] = useState(1.0);
  const [pitch, setPitch] = useState(0.0);
  const [formError, setFormError] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = name.trim().toUpperCase();
    if (!cleaned) {
      setFormError('Character name is required.');
      return;
    }
    setFormError(null);
    onUpsertCharacter({
      id: `char-${cleaned.toLowerCase()}-${Date.now()}`,
      characterName: cleaned,
      voiceId,
      voicePersonality:
        personality.trim() ||
        'Natural expressive visual novel voice acting in Indonesian.',
      emotion,
      speechRate,
      pitch,
      voiceProvider: 'Gemini Neural TTS',
      isEnabled: true,
    });
    setName('');
    setPersonality('');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Character List */}
        <section className="xl:col-span-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Multi-Character Dubbing Roster
              </h2>
              <p className="text-xs text-slate-400">
                Speakers detected in ROI 1 are matched here. Unknown or disabled characters automatically use NARRATOR.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {characters.map((char) => (
              <div
                key={char.id}
                className="bg-[#101522] border border-[#1E273B] rounded-xl p-4 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  {char.avatarUrl ? (
                    <img
                      src={char.avatarUrl}
                      alt={char.characterName}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-lg object-cover border border-[#26314A] shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg border border-[#26314A] bg-[#0B0F1A] flex items-center justify-center shrink-0">
                      <UserCheck className="w-5 h-5 text-cyan-400" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-100 truncate">
                        {char.characterName}
                      </h3>
                      <button
                        type="button"
                        onClick={() =>
                          onUpsertCharacter({ ...char, isEnabled: !char.isEnabled })
                        }
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          char.isEnabled
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {char.isEnabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5 tabular-nums">
                      {char.voiceId} · {char.emotion} · {char.speechRate.toFixed(2)}x · {char.pitch >= 0 ? `+${char.pitch}` : char.pitch} st
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {char.voicePersonality}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-[#1E273B] text-xs">
                  <span className="text-purple-400 font-mono">{char.voiceProvider}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenInStudio(char)}
                      className="px-2.5 py-1 rounded-md border border-[#26314A] text-cyan-300 hover:border-cyan-500/50 flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Tune in Studio</span>
                    </button>
                    {char.characterName !== 'NARRATOR' && (
                      <button
                        type="button"
                        aria-label={`Delete ${char.characterName}`}
                        onClick={() => onDeleteCharacter(char.id)}
                        className="p-1.5 rounded-md border border-[#26314A] text-rose-400 hover:border-rose-500/50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Add Character Form */}
        <section className="xl:col-span-4 bg-[#101522] border border-[#1E273B] rounded-xl p-5 h-fit">
          <h3 className="text-base font-semibold text-slate-100 mb-1">Add Character Profile</h3>
          <p className="text-xs text-slate-400 mb-4">
            Assign a dedicated Gemini Neural TTS voice and expressive personality.
          </p>

          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label htmlFor="char-name" className="block text-xs text-slate-400 mb-1">
                Character Name (matches ROI 1)
              </label>
              <input
                id="char-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. AKIRA"
                className="w-full px-3 py-2 text-xs rounded-lg bg-[#080A10] border border-[#26314A] text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="char-voice" className="block text-xs text-slate-400 mb-1">
                  Voice ID
                </label>
                <select
                  id="char-voice"
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value as VoiceId)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#080A10] border border-[#26314A] text-slate-100"
                >
                  {VOICE_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="char-emotion" className="block text-xs text-slate-400 mb-1">
                  Emotion
                </label>
                <select
                  id="char-emotion"
                  value={emotion}
                  onChange={(e) => setEmotion(e.target.value as EmotionOption)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#080A10] border border-[#26314A] text-slate-100"
                >
                  {EMOTION_OPTIONS.map((emo) => (
                    <option key={emo} value={emo}>
                      {emo}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="char-personality" className="block text-xs text-slate-400 mb-1">
                Voice Personality Prompt
              </label>
              <textarea
                id="char-personality"
                rows={3}
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                placeholder="Suara perempuan dewasa, lembut, penuh semangat..."
                className="w-full px-3 py-2 text-xs rounded-lg bg-[#080A10] border border-[#26314A] text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Rate</span>
                  <span className="font-mono text-cyan-400 tabular-nums">{speechRate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={0.6}
                  max={1.5}
                  step={0.02}
                  value={speechRate}
                  onChange={(e) => setSpeechRate(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Pitch</span>
                  <span className="font-mono text-purple-400 tabular-nums">{pitch.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={-5}
                  max={5}
                  step={0.5}
                  value={pitch}
                  onChange={(e) => setPitch(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>
            </div>

            {formError && (
              <p className="text-xs text-rose-400">{formError}</p>
            )}

            <button
              type="submit"
              className="w-full px-4 py-2.5 text-xs font-semibold rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Save Character Profile</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

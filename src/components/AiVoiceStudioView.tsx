import React from 'react';
import { Sparkles, Volume2, AlertTriangle, Save } from 'lucide-react';
import {
  type CharacterProfile,
  type EmotionOption,
  type VoiceId,
} from '../lib/autodubClientCore';

export interface VoiceStudioState {
  voiceId: VoiceId;
  personaDescription: string;
  emotion: EmotionOption;
  speechRate: number;
  pitch: number;
  sampleText: string;
  targetCharacterId: string;
  isGenerating: boolean;
  previewAudioUrl: string | null;
  lastModelUsed: string;
  lastStyleApplied: string;
  lastDurationMs: number;
  error: string | null;
}

interface AiVoiceStudioViewProps {
  studio: VoiceStudioState;
  characters: CharacterProfile[];
  onChangeStudio: (patch: Partial<VoiceStudioState>) => void;
  onGeneratePreview: () => void;
  onTestVoice: () => void;
  onSaveToCharacter: () => void;
}

const VOICES: Array<{ id: VoiceId; label: string; desc: string }> = [
  { id: 'Kore', label: 'Kore', desc: 'Clear Expressive Female' },
  { id: 'Zephyr', label: 'Zephyr', desc: 'Warm Playful Female' },
  { id: 'Puck', label: 'Puck', desc: 'Agile Youthful Male' },
  { id: 'Charon', label: 'Charon', desc: 'Deep Composed Male' },
  { id: 'Fenrir', label: 'Fenrir', desc: 'Intense Dramatic Male' },
];

const EMOTIONS: EmotionOption[] = [
  'neutral',
  'cheerful',
  'playful',
  'calm',
  'sad',
  'angry',
  'surprised',
  'whisper',
];

export const AiVoiceStudioView: React.FC<AiVoiceStudioViewProps> = ({
  studio,
  characters,
  onChangeStudio,
  onGeneratePreview,
  onTestVoice,
  onSaveToCharacter,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-7 bg-[#101522] border border-[#1E273B] rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">AI Voice Studio</h2>
            <p className="text-xs text-slate-400 mt-1">
              Design original neural voice personas with Gemini 3.8 Flash TTS (`POST /voice/design` &amp; `POST /tts/generate`).
            </p>
          </div>

          {/* Quick Preset Loader */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 mr-1">Load Character Preset:</span>
            {characters.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  onChangeStudio({
                    targetCharacterId: c.id,
                    voiceId: c.voiceId,
                    personaDescription: c.voicePersonality,
                    emotion: c.emotion,
                    speechRate: c.speechRate,
                    pitch: c.pitch,
                  })
                }
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  studio.targetCharacterId === c.id
                    ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300'
                    : 'border-[#26314A] bg-[#0B0F1A] text-slate-300 hover:border-slate-500'
                }`}
              >
                {c.characterName}
              </button>
            ))}
          </div>

          {/* Voice Personality Editor */}
          <div>
            <label htmlFor="studio-persona" className="block text-xs text-slate-400 mb-1.5">
              Voice Personality Editor
            </label>
            <textarea
              id="studio-persona"
              rows={3}
              value={studio.personaDescription}
              onChange={(e) => onChangeStudio({ personaDescription: e.target.value })}
              placeholder="Contoh: Suara perempuan dewasa bergaya anime Jepang, lembut, ceria, dan ekspresif."
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-[#080A10] border border-[#26314A] text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Sample Text */}
          <div>
            <label htmlFor="studio-sample" className="block text-xs text-slate-400 mb-1.5">
              Sample Dubbing Line
            </label>
            <textarea
              id="studio-sample"
              rows={2}
              value={studio.sampleText}
              onChange={(e) => onChangeStudio({ sampleText: e.target.value })}
              className="w-full px-3 py-2.5 text-sm rounded-lg bg-[#080A10] border border-[#26314A] text-slate-100 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Base Voice Selector */}
          <div>
            <span className="block text-xs text-slate-400 mb-2">Neural Voice Selector</span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {VOICES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onChangeStudio({ voiceId: v.id })}
                  className={`p-2.5 rounded-lg border text-left transition-colors ${
                    studio.voiceId === v.id
                      ? 'border-cyan-500 bg-cyan-500/15 text-cyan-200'
                      : 'border-[#26314A] bg-[#0B0F1A] text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="text-xs font-semibold">{v.label}</div>
                  <div className="text-[11px] text-slate-400 truncate">{v.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Emotion Selector */}
          <div>
            <span className="block text-xs text-slate-400 mb-2">Emotion Selector</span>
            <div className="flex flex-wrap gap-2">
              {EMOTIONS.map((emo) => (
                <button
                  key={emo}
                  type="button"
                  onClick={() => onChangeStudio({ emotion: emo })}
                  className={`px-3 py-1.5 text-xs rounded-lg border capitalize transition-colors ${
                    studio.emotion === emo
                      ? 'border-purple-500 bg-purple-500/20 text-purple-200'
                      : 'border-[#26314A] bg-[#0B0F1A] text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {emo}
                </button>
              ))}
            </div>
          </div>

          {/* Pitch & Speech Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-3.5 rounded-lg border border-[#1E273B] bg-[#0B0F1A]">
              <div className="flex justify-between text-xs mb-2">
                <label htmlFor="studio-rate" className="text-slate-400">Speech Rate</label>
                <span className="font-mono text-cyan-400 tabular-nums">
                  {studio.speechRate.toFixed(2)}x
                </span>
              </div>
              <input
                id="studio-rate"
                type="range"
                min={0.6}
                max={1.6}
                step={0.02}
                value={studio.speechRate}
                onChange={(e) => onChangeStudio({ speechRate: Number(e.target.value) })}
                className="w-full accent-cyan-500"
              />
            </div>

            <div className="p-3.5 rounded-lg border border-[#1E273B] bg-[#0B0F1A]">
              <div className="flex justify-between text-xs mb-2">
                <label htmlFor="studio-pitch" className="text-slate-400">Pitch Shift</label>
                <span className="font-mono text-purple-400 tabular-nums">
                  {studio.pitch >= 0 ? `+${studio.pitch.toFixed(1)}` : studio.pitch.toFixed(1)} st
                </span>
              </div>
              <input
                id="studio-pitch"
                type="range"
                min={-5}
                max={5}
                step={0.5}
                value={studio.pitch}
                onChange={(e) => onChangeStudio({ pitch: Number(e.target.value) })}
                className="w-full accent-purple-500"
              />
            </div>
          </div>

          {/* Studio Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={studio.isGenerating}
              onClick={onGeneratePreview}
              className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>{studio.isGenerating ? 'Synthesizing...' : 'Generate Preview'}</span>
            </button>

            <button
              type="button"
              disabled={studio.isGenerating}
              onClick={onTestVoice}
              className="px-4 py-2.5 text-xs font-semibold rounded-lg border border-purple-500/60 bg-purple-500/15 text-purple-200 hover:bg-purple-500/25 disabled:opacity-50 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Volume2 className="w-4 h-4" />
              <span>Test Voice</span>
            </button>

            <button
              type="button"
              onClick={onSaveToCharacter}
              className="ml-auto px-3.5 py-2.5 text-xs font-medium rounded-lg border border-[#26314A] text-slate-200 hover:border-cyan-500/50 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Save className="w-3.5 h-3.5 text-cyan-400" />
              <span>Apply to Character</span>
            </button>
          </div>
        </section>

        {/* Audio Playback Preview Panel */}
        <aside className="xl:col-span-5 space-y-4">
          <div className="bg-[#101522] border border-[#1E273B] rounded-xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-100">Audio Playback Preview</h3>

            {studio.error && (
              <div
                role="alert"
                className="p-3.5 rounded-lg border border-rose-500/50 bg-rose-950/30 text-xs text-rose-200 flex items-start gap-2 overflow-hidden"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="min-w-0 break-words">{studio.error}</span>
              </div>
            )}

            {studio.previewAudioUrl ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-cyan-500/30 bg-[#0B0F1A] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-cyan-400 font-mono">{studio.voiceId}</span>
                    <span className="text-slate-400 font-mono tabular-nums">
                      ~{(studio.lastDurationMs / 1000).toFixed(2)}s · 24kHz WAV
                    </span>
                  </div>
                  <audio
                    controls
                    autoPlay
                    src={studio.previewAudioUrl}
                    className="w-full h-10"
                  />
                </div>

                <div className="p-4 rounded-lg border border-[#1E273B] bg-[#0B0F1A] space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Engine Model</span>
                    <span className="font-mono text-purple-300">{studio.lastModelUsed}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Applied Style Directive</span>
                    <p className="text-slate-200 leading-relaxed">{studio.lastStyleApplied}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-lg border border-[#1E273B] bg-[#0B0F1A] text-center space-y-2">
                <Volume2 className="w-7 h-7 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-400">
                  Click Generate Preview to synthesize an expressive voice persona from your text prompt, or Test Voice to audition the selected prebuilt voice.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

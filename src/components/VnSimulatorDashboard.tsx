import React from 'react';
import { Volume2, VolumeX, Play, SkipForward, AlertTriangle, Radio } from 'lucide-react';
import {
  type CharacterProfile,
  type PipelineLogItem,
  type RoiConfig,
  type VnDemoFrame,
} from '../lib/autodubClientCore';

interface VnSimulatorDashboardProps {
  frames: VnDemoFrame[];
  activeFrameIndex: number;
  customSpeaker: string;
  customDialog: string;
  onSelectFrame: (index: number) => void;
  onChangeSpeaker: (val: string) => void;
  onChangeDialog: (val: string) => void;
  roiConfig: RoiConfig;
  characters: CharacterProfile[];
  isOnline: boolean;
  isProcessing: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onScanAndDub: () => void;
  activeSubtitle: {
    speaker: string;
    translated: string;
    voiceLabel: string;
    modelUsed: string;
    usedNarratorFallback: boolean;
  } | null;
  pipelineError: string | null;
  audioUrl: string | null;
  logs: PipelineLogItem[];
}

export const VnSimulatorDashboard: React.FC<VnSimulatorDashboardProps> = ({
  frames,
  activeFrameIndex,
  customSpeaker,
  customDialog,
  onSelectFrame,
  onChangeSpeaker,
  onChangeDialog,
  roiConfig,
  characters,
  isOnline,
  isProcessing,
  isMuted,
  onToggleMute,
  onScanAndDub,
  activeSubtitle,
  pipelineError,
  audioUrl,
  logs,
}) => {
  const frame = frames[activeFrameIndex] ?? frames[0];
  const matchedChar = characters.find(
    (c) => c.characterName.toUpperCase() === customSpeaker.trim().toUpperCase()
  );
  const portraitSrc = matchedChar?.avatarUrl || frame.portraitUrl;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Left 8 cols: Interactive VN Screen + ROI + Floating Overlay Preview */}
        <section className="xl:col-span-8 bg-[#101522] border border-[#1E273B] rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-[#1E273B] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Visual Novel Live Dubbing Simulator
              </h2>
              <p className="text-xs text-slate-400">
                ROI 1 (Character Name) · ROI 2 (Dialogue) · Floating Overlay Preview
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleMute}
                aria-label={isMuted ? 'Unmute dubbing audio' : 'Mute dubbing audio'}
                className="px-3 py-2 text-xs font-medium rounded-lg border border-[#26314A] bg-[#0B0F1A] text-slate-200 hover:border-cyan-500/50 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{isMuted ? 'Muted' : 'Audio On'}</span>
              </button>
              <button
                type="button"
                onClick={onScanAndDub}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-60 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Translating & Dubbing...' : 'Scan & Dub Frame'}</span>
              </button>
            </div>
          </div>

          {/* 16:9 Game Viewport */}
          <div className="relative aspect-video w-full bg-[#07090E] overflow-hidden">
            <img
              src={frame.backdropUrl}
              alt="Visual Novel Scene Backdrop"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080A10]/90 via-transparent to-[#080A10]/40" />

            {portraitSrc && (
              <div className="absolute bottom-[24%] right-[8%] w-36 h-36 sm:w-44 sm:h-44 rounded-xl overflow-hidden border border-[#26314A] bg-[#101522]/85">
                <img
                  src={portraitSrc}
                  alt={customSpeaker || 'Character Portrait'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Floating Translated Overlay Preview (Top-Center) */}
            <div
              data-testid="floating-overlay-preview"
              className="absolute top-4 left-4 right-4 sm:left-10 sm:right-10 rounded-xl border border-cyan-500/50 bg-[#0B0F1A]/92 px-4 py-3 backdrop-blur-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-cyan-400">
                    {activeSubtitle?.speaker || customSpeaker || 'NARRATOR'}
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-purple-400 font-mono">
                    {activeSubtitle?.voiceLabel || 'Ready for Gemini Neural TTS'}
                  </span>
                </div>
                {activeSubtitle?.usedNarratorFallback && (
                  <span className="text-[11px] font-mono text-amber-300">
                    Narrator Fallback Active
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-100 leading-relaxed">
                {activeSubtitle?.translated ||
                  'Tekan "Scan & Dub Frame" untuk mengekstrak ROI 1 & ROI 2, menerjemahkan ke Bahasa Indonesia, dan memutar suara neural.'}
              </p>
            </div>

            {/* ROI 1: Character Name Box */}
            <div
              style={{
                left: `${roiConfig.nameRoi.x * 100}%`,
                top: `${roiConfig.nameRoi.y * 100}%`,
                width: `${roiConfig.nameRoi.width * 100}%`,
                height: `${roiConfig.nameRoi.height * 100}%`,
              }}
              className="absolute border-2 border-cyan-400 bg-cyan-950/70 rounded px-3 flex items-center justify-between gap-2"
            >
              <span className="text-xs sm:text-sm font-semibold text-cyan-100 truncate">
                {customSpeaker || 'NARRATOR'}
              </span>
              <span className="text-[10px] font-mono text-cyan-300 shrink-0">
                ROI 1
              </span>
            </div>

            {/* ROI 2: Dialog Box */}
            <div
              style={{
                left: `${roiConfig.dialogRoi.x * 100}%`,
                top: `${roiConfig.dialogRoi.y * 100}%`,
                width: `${roiConfig.dialogRoi.width * 100}%`,
                height: `${roiConfig.dialogRoi.height * 100}%`,
              }}
              className="absolute border-2 border-purple-400 bg-[#0B0F1A]/85 rounded p-3 flex flex-col justify-between"
            >
              <p className="text-xs sm:text-sm text-slate-200 leading-snug line-clamp-3 pr-14">
                {customDialog}
              </p>
              <span className="text-[10px] font-mono text-purple-300 absolute top-1.5 right-2.5">
                ROI 2
              </span>
            </div>
          </div>

          {/* Scene Selector & Custom Frame Inputs */}
          <div className="p-4 border-t border-[#1E273B] space-y-3 bg-[#0D111C]">
            <div className="flex flex-wrap items-center gap-2">
              {frames.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectFrame(idx)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    idx === activeFrameIndex
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                      : 'bg-[#131928] text-slate-400 border border-[#1E273B] hover:text-slate-200'
                  }`}
                >
                  {item.speaker}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onSelectFrame((activeFrameIndex + 1) % frames.length)}
                className="ml-auto px-3 py-1.5 text-xs font-medium rounded-lg border border-[#26314A] text-slate-300 hover:border-cyan-500/50 flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Next Scene</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-4">
                <label htmlFor="sim-speaker" className="block text-xs text-slate-400 mb-1">
                  OCR ROI 1 (Speaker)
                </label>
                <input
                  id="sim-speaker"
                  type="text"
                  value={customSpeaker}
                  onChange={(e) => onChangeSpeaker(e.target.value)}
                  placeholder="NORA / LUCY / SALMAN"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#080A10] border border-[#26314A] text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="sm:col-span-8">
                <label htmlFor="sim-dialog" className="block text-xs text-slate-400 mb-1">
                  OCR ROI 2 (English Dialogue)
                </label>
                <input
                  id="sim-dialog"
                  type="text"
                  value={customDialog}
                  onChange={(e) => onChangeDialog(e.target.value)}
                  placeholder="Enter Visual Novel dialogue line..."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-[#080A10] border border-[#26314A] text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Right 4 cols: Live Output, Audio Player & Pipeline History */}
        <aside className="xl:col-span-4 flex flex-col gap-4">
          <div className="bg-[#101522] border border-[#1E273B] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-100">Neural Audio Output</h3>
              <span
                className={`text-xs font-mono ${
                  isOnline ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isOnline ? 'CLOUD READY' : 'OFFLINE'}
              </span>
            </div>

            {pipelineError && (
              <div
                role="alert"
                className="p-3 rounded-lg border border-rose-500/50 bg-rose-950/30 text-xs text-rose-200 flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{pipelineError}</span>
              </div>
            )}

            {audioUrl ? (
              <div className="space-y-2">
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>WAV 24kHz Mono (ExoPlayer Compatible)</span>
                  <span className="font-mono text-cyan-400">{activeSubtitle?.modelUsed}</span>
                </div>
                <audio
                  controls
                  src={audioUrl}
                  muted={isMuted}
                  className="w-full h-9"
                />
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-[#1E273B] bg-[#0B0F1A] text-xs text-slate-400 flex items-center gap-2">
                <Radio className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Run Scan &amp; Dub Frame to synthesize Gemini Neural WAV audio.</span>
              </div>
            )}
          </div>

          <div className="bg-[#101522] border border-[#1E273B] rounded-xl p-5 flex-1 flex flex-col min-h-[260px]">
            <h3 className="text-base font-semibold text-slate-100 mb-3">
              Recent Dubbing Feed
            </h3>
            {logs.length === 0 ? (
              <p className="text-xs text-slate-400">
                No dubbed lines yet in this session. Select any scene and click Scan &amp; Dub Frame.
              </p>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[340px] pr-1">
                {logs.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-lg border border-[#1E273B] bg-[#0B0F1A] space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-cyan-400">{entry.speaker}</span>
                      <span className="font-mono text-slate-500 tabular-nums">{entry.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-400">{entry.originalText}</p>
                    <p className="text-xs text-slate-100 font-medium">{entry.translatedText}</p>
                    <div className="text-[11px] font-mono text-purple-400 pt-1">
                      {entry.voiceUsed} · {entry.cached ? 'Cached' : 'Live Cloud'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

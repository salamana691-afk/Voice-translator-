import React from 'react';
import { Server, ShieldCheck, WifiOff, FolderGit2 } from 'lucide-react';

export interface ServerHealthData {
  status: string;
  service: string;
  timestamp: string;
  uptimeSeconds: number;
  geminiConfigured: boolean;
  models?: {
    translation: string;
    ttsStandard: string;
    ttsExpressive: string;
  };
  cacheStats?: {
    translations: number;
    audioClips: number;
  };
  privacy?: {
    persistentScreenshotStorage: boolean;
    persistentDialogStorage: boolean;
  };
}

interface ServerSettingsViewProps {
  serverUrl: string;
  onChangeServerUrl: (url: string) => void;
  isOnline: boolean;
  onToggleOfflineSim: () => void;
  healthData: ServerHealthData | null;
  healthError: string | null;
  isCheckingHealth: boolean;
  onCheckHealth: () => void;
}

const ANDROID_FILES = [
  'android/app/build.gradle.kts — Compose BOM, Material 3, Room, Retrofit, Media3 ExoPlayer, ML Kit OCR',
  'android/app/src/main/AndroidManifest.xml — MediaProjection, SYSTEM_ALERT_WINDOW, Internet',
  'data/local/AutoDubDatabase.kt — Room DB pre-seeded with NORA, LUCY, NARRATOR, SALMAN',
  'data/remote/AutoDubApiService.kt & NetworkMonitor.kt — Online-only Retrofit client',
  'ocr/RoiCropper.kt, MlKitOcrEngine.kt, DialogChangeDetector.kt — On-device 2-box OCR',
  'audio/ExoDubPlayer.kt — Media3 ExoPlayer WAV playback with speech rate control',
  'service/ScreenCaptureService.kt & FloatingOverlayService.kt — Real-time pipeline & draggable overlay',
  'ui/screens/* — All 7 Jetpack Compose Dark Cyber Gaming screens',
];

const BACKEND_FILES = [
  'backend/src/core/autodubCore.ts — Request validators, LRU TTL cache, SlidingWindowRateLimiter',
  'backend/src/services/geminiService.ts — @google/genai (gemini-4-hydrogen, gemini-3.8-flash-tts)',
  'backend/src/routes/autodubRoutes.ts — /health, /voices, /translate, /tts/generate, /voice/design',
  'backend/Dockerfile & backend/cloudrun.yaml — Google Cloud Run deployment configuration',
];

export const ServerSettingsView: React.FC<ServerSettingsViewProps> = ({
  serverUrl,
  onChangeServerUrl,
  isOnline,
  onToggleOfflineSim,
  healthData,
  healthError,
  isCheckingHealth,
  onCheckHealth,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-6 bg-[#101522] border border-[#1E273B] rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">API &amp; Server Settings</h2>
              <p className="text-xs text-slate-400 mt-1">
                Gemini API keys remain strictly in Cloud Run environment secrets — never inside the Android APK.
              </p>
            </div>
            <Server className="w-5 h-5 text-cyan-400 shrink-0" />
          </div>

          <div>
            <label htmlFor="server-url-input" className="block text-xs text-slate-400 mb-1.5">
              Cloud Backend Base URL
            </label>
            <div className="flex gap-2">
              <input
                id="server-url-input"
                type="text"
                value={serverUrl}
                onChange={(e) => onChangeServerUrl(e.target.value)}
                className="flex-1 px-3 py-2 text-xs font-mono rounded-lg bg-[#080A10] border border-[#26314A] text-slate-100"
              />
              <button
                type="button"
                disabled={isCheckingHealth}
                onClick={onCheckHealth}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {isCheckingHealth ? 'Checking...' : 'Check /health'}
              </button>
            </div>
          </div>

          {/* Online-Only Strict Policy Card */}
          <div className="p-4 rounded-lg border border-[#1E273B] bg-[#0B0F1A] flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <WifiOff className={`w-5 h-5 shrink-0 mt-0.5 ${isOnline ? 'text-slate-400' : 'text-rose-400'}`} />
              <div>
                <div className="text-sm font-medium text-slate-100">
                  Simulate Offline Connection Drop
                </div>
                <p className="text-xs text-slate-400">
                  Verifies that cloud calls halt cleanly with an offline alert and never fall back to device TTS.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleOfflineSim}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border whitespace-nowrap shrink-0 ${
                isOnline
                  ? 'border-[#26314A] bg-[#131928] text-slate-200'
                  : 'border-rose-500 bg-rose-500/20 text-rose-200'
              }`}
            >
              {isOnline ? 'Go Offline' : 'Reconnect Online'}
            </button>
          </div>

          {healthError && (
            <div role="alert" className="p-3.5 rounded-lg border border-rose-500/50 bg-rose-950/30 text-xs text-rose-200">
              {healthError}
            </div>
          )}

          {healthData && (
            <div className="p-4 rounded-lg border border-emerald-500/40 bg-emerald-950/15 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Backend Connected ({healthData.status.toUpperCase()})
                </span>
                <span className="font-mono text-slate-400 tabular-nums">
                  Uptime {healthData.uptimeSeconds}s
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-slate-300 font-mono">
                <div>Translation: {healthData.models?.translation}</div>
                <div>Expressive TTS: {healthData.models?.ttsExpressive}</div>
                <div>Cached Translations: {healthData.cacheStats?.translations ?? 0}</div>
                <div>Cached WAV Clips: {healthData.cacheStats?.audioClips ?? 0}</div>
              </div>
              <div className="text-[11px] text-slate-400 pt-1">
                Screenshot Persistence: Disabled · Dialog Persistence: Disabled (Ephemeral LRU Only)
              </div>
            </div>
          )}
        </section>

        {/* Project Architecture Explorer */}
        <section className="xl:col-span-6 bg-[#101522] border border-[#1E273B] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Workspace Project Deliverables
              </h3>
              <p className="text-xs text-slate-400">
                Both projects live separately in this repository and connect over REST JSON/WAV.
              </p>
            </div>
            <FolderGit2 className="w-5 h-5 text-purple-400 shrink-0" />
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-lg border border-[#1E273B] bg-[#0B0F1A]">
              <h4 className="text-xs font-semibold text-cyan-400 mb-2">
                A. Android Application (/android)
              </h4>
              <ul className="space-y-1.5 text-xs font-mono text-slate-300">
                {ANDROID_FILES.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-lg border border-[#1E273B] bg-[#0B0F1A]">
              <h4 className="text-xs font-semibold text-purple-400 mb-2">
                B. Cloud Run Backend (/backend)
              </h4>
              <ul className="space-y-1.5 text-xs font-mono text-slate-300">
                {BACKEND_FILES.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

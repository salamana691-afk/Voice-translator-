import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  ScanText,
  Crosshair,
  Users,
  AudioWaveform,
  Languages,
  Server,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  DEFAULT_CHARACTERS,
  DEFAULT_ROI_CONFIG,
  DEFAULT_TRANSLATION_SETTINGS,
  VN_DEMO_FRAMES,
  resolveCharacterProfile,
  validateOfflineGuard,
  type CharacterProfile,
  type PipelineLogItem,
  type RoiConfig,
  type TranslationSettings,
} from './lib/autodubClientCore';
import { VnSimulatorDashboard } from './components/VnSimulatorDashboard';
import { ScreenScannerView } from './components/ScreenScannerView';
import { RoiConfigView } from './components/RoiConfigView';
import { CharacterManagerView } from './components/CharacterManagerView';
import { AiVoiceStudioView, type VoiceStudioState } from './components/AiVoiceStudioView';
import { TranslationSettingsView } from './components/TranslationSettingsView';
import { ServerSettingsView, type ServerHealthData } from './components/ServerSettingsView';

type NavTab =
  | 'dashboard'
  | 'scanner'
  | 'roi'
  | 'characters'
  | 'studio'
  | 'translation'
  | 'server';

const NAV_ITEMS: Array<{ id: NavTab; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'scanner', label: 'Screen Scanner', icon: ScanText },
  { id: 'roi', label: 'ROI Configuration', icon: Crosshair },
  { id: 'characters', label: 'Character Manager', icon: Users },
  { id: 'studio', label: 'AI Voice Studio', icon: AudioWaveform },
  { id: 'translation', label: 'Translation Settings', icon: Languages },
  { id: 'server', label: 'API & Server Settings', icon: Server },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [browserOnline, setBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const isOnline = browserOnline && !simulatedOffline;

  const [characters, setCharacters] = useState<CharacterProfile[]>(() => {
    try {
      const saved = localStorage.getItem('autodub_characters');
      return saved ? JSON.parse(saved) : DEFAULT_CHARACTERS;
    } catch {
      return DEFAULT_CHARACTERS;
    }
  });

  const [roiConfig, setRoiConfig] = useState<RoiConfig>(() => {
    try {
      const saved = localStorage.getItem('autodub_roi');
      return saved ? JSON.parse(saved) : DEFAULT_ROI_CONFIG;
    } catch {
      return DEFAULT_ROI_CONFIG;
    }
  });

  const [translationSettings, setTranslationSettings] = useState<TranslationSettings>(() => {
    try {
      const saved = localStorage.getItem('autodub_translation');
      return saved ? JSON.parse(saved) : DEFAULT_TRANSLATION_SETTINGS;
    } catch {
      return DEFAULT_TRANSLATION_SETTINGS;
    }
  });

  const [serverUrl, setServerUrl] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  );

  // Dashboard Simulator State
  const [activeFrameIdx, setActiveFrameIdx] = useState(0);
  const [simSpeaker, setSimSpeaker] = useState(VN_DEMO_FRAMES[0].speaker);
  const [simDialog, setSimDialog] = useState(VN_DEMO_FRAMES[0].dialog);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [activeSubtitle, setActiveSubtitle] = useState<{
    speaker: string;
    translated: string;
    voiceLabel: string;
    modelUsed: string;
    usedNarratorFallback: boolean;
  } | null>(null);
  const [logs, setLogs] = useState<PipelineLogItem[]>([]);

  // Voice Studio State
  const [studio, setStudio] = useState<VoiceStudioState>({
    voiceId: 'Kore',
    personaDescription:
      'Suara perempuan dewasa bergaya anime Jepang, lembut, ceria, dan ekspresif.',
    emotion: 'cheerful',
    speechRate: 1.02,
    pitch: 1.0,
    sampleText:
      'Tunggu dulu, Salman-kun! Kamu benar-benar naik ke teras timur hanya untuk melihat matahari terbenam bersamaku?',
    targetCharacterId: DEFAULT_CHARACTERS[0].id,
    isGenerating: false,
    previewAudioUrl: null,
    lastModelUsed: '',
    lastStyleApplied: '',
    lastDurationMs: 0,
    error: null,
  });

  // Server Health State
  const [healthData, setHealthData] = useState<ServerHealthData | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);

  useEffect(() => {
    const onOnline = () => setBrowserOnline(true);
    const onOffline = () => setBrowserOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('autodub_characters', JSON.stringify(characters));
  }, [characters]);

  useEffect(() => {
    localStorage.setItem('autodub_roi', JSON.stringify(roiConfig));
  }, [roiConfig]);

  useEffect(() => {
    localStorage.setItem('autodub_translation', JSON.stringify(translationSettings));
  }, [translationSettings]);

  const checkHealth = async () => {
    const guard = validateOfflineGuard(isOnline);
    if (!guard.allowed) {
      setHealthError(guard.errorMessage);
      setHealthData(null);
      return;
    }
    setIsCheckingHealth(true);
    setHealthError(null);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || `Health check failed (${res.status})`);
      }
      setHealthData(data);
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : 'Failed to connect to backend server.');
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    void checkHealth();
  }, []);

  const base64WavToObjectUrl = (base64: string, mimeType = 'audio/wav'): string => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  };

  const runDubbingPipeline = async (speakerInput: string, dialogInput: string) => {
    const guard = validateOfflineGuard(isOnline);
    if (!guard.allowed) {
      setPipelineError(guard.errorMessage);
      return;
    }

    const cleanDialog = dialogInput.trim();
    if (!cleanDialog) {
      setPipelineError('ROI 2 dialogue text cannot be empty.');
      return;
    }

    setIsProcessing(true);
    setPipelineError(null);

    try {
      const { profile, usedNarratorFallback } = resolveCharacterProfile(speakerInput, characters);

      const contextHistory = logs
        .slice(0, 4)
        .reverse()
        .map((l) => ({
          speaker: l.speaker,
          original: l.originalText,
          translated: l.translatedText,
        }));

      const translateRes = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanDialog,
          speakerName: speakerInput.trim() || profile.characterName,
          sourceLang: translationSettings.sourceLang,
          targetLang: translationSettings.targetLang,
          contextHistory: translationSettings.vnContextEnabled ? contextHistory : [],
          glossary: translationSettings.glossary,
          preserveNames: translationSettings.preserveNames,
          preserveHonorifics: translationSettings.preserveHonorifics,
        }),
      });

      const translateData = await translateRes.json();
      if (!translateRes.ok) {
        throw new Error(translateData?.error?.message || 'Cloud translation failed.');
      }

      const translatedText: string = translateData.translatedText;
      let modelUsed = translateData.modelUsed;
      let ttsCached = Boolean(translateData.cached);

      if (translationSettings.autoPlayDub) {
        const ttsRes = await fetch('/api/tts/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: translatedText,
            voiceId: profile.voiceId,
            voicePersonality: profile.voicePersonality,
            emotion: profile.emotion,
            speechRate: profile.speechRate,
            pitch: profile.pitch,
            speakerName: profile.characterName,
          }),
        });

        const ttsData = await ttsRes.json();
        if (!ttsRes.ok) {
          throw new Error(ttsData?.error?.message || 'Gemini Neural TTS failed.');
        }

        modelUsed = ttsData.modelUsed;
        ttsCached = Boolean(ttsData.cached);

        const nextUrl = base64WavToObjectUrl(ttsData.audioBase64, ttsData.mimeType);
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return nextUrl;
        });

        if (!isMuted) {
          const player = new Audio(nextUrl);
          player.playbackRate = profile.speechRate;
          void player.play().catch(() => {
            // Browser autoplay policy fallback: user can still press play on the inline audio player
          });
        }
      }

      setActiveSubtitle({
        speaker: speakerInput.trim() || profile.characterName,
        translated: translatedText,
        voiceLabel: `${profile.characterName} · ${profile.voiceId} (${profile.emotion})`,
        modelUsed,
        usedNarratorFallback,
      });

      setLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour12: false }),
          speaker: speakerInput.trim() || profile.characterName,
          originalText: cleanDialog,
          translatedText,
          voiceUsed: `${profile.characterName} (${profile.voiceId})`,
          modelUsed,
          cached: ttsCached,
          usedNarratorFallback,
        },
        ...prev.slice(0, 24),
      ]);
    } catch (err) {
      setPipelineError(
        err instanceof Error
          ? `Koneksi / Pipeline Gagal: ${err.message}`
          : 'Koneksi ke server cloud gagal.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateVoicePreview = async () => {
    const guard = validateOfflineGuard(isOnline);
    if (!guard.allowed) {
      setStudio((prev) => ({ ...prev, error: guard.errorMessage }));
      return;
    }
    setStudio((prev) => ({ ...prev, isGenerating: true, error: null }));
    try {
      const res = await fetch('/api/voice/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaDescription: studio.personaDescription,
          sampleText: studio.sampleText,
          baseVoiceId: studio.voiceId,
          emotion: studio.emotion,
          speechRate: studio.speechRate,
          pitch: studio.pitch,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Voice design failed.');
      }
      const url = base64WavToObjectUrl(data.audioBase64, data.mimeType);
      setStudio((prev) => {
        if (prev.previewAudioUrl) URL.revokeObjectURL(prev.previewAudioUrl);
        return {
          ...prev,
          isGenerating: false,
          voiceId: data.recommendedVoiceId,
          previewAudioUrl: url,
          lastModelUsed: data.modelUsed,
          lastStyleApplied: data.stylePrompt,
          lastDurationMs: data.durationEstimateMs,
        };
      });
    } catch (err) {
      setStudio((prev) => ({
        ...prev,
        isGenerating: false,
        error: err instanceof Error ? err.message : 'Voice Design request failed.',
      }));
    }
  };

  const handleTestVoice = async () => {
    const guard = validateOfflineGuard(isOnline);
    if (!guard.allowed) {
      setStudio((prev) => ({ ...prev, error: guard.errorMessage }));
      return;
    }
    setStudio((prev) => ({ ...prev, isGenerating: true, error: null }));
    try {
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: studio.sampleText,
          voiceId: studio.voiceId,
          voicePersonality: studio.personaDescription,
          emotion: studio.emotion,
          speechRate: studio.speechRate,
          pitch: studio.pitch,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Test voice request failed.');
      }
      const url = base64WavToObjectUrl(data.audioBase64, data.mimeType);
      setStudio((prev) => {
        if (prev.previewAudioUrl) URL.revokeObjectURL(prev.previewAudioUrl);
        return {
          ...prev,
          isGenerating: false,
          previewAudioUrl: url,
          lastModelUsed: data.modelUsed,
          lastStyleApplied: data.styleApplied,
          lastDurationMs: data.durationEstimateMs,
        };
      });
    } catch (err) {
      setStudio((prev) => ({
        ...prev,
        isGenerating: false,
        error: err instanceof Error ? err.message : 'Test voice request failed.',
      }));
    }
  };

  const handleClearServerCache = async () => {
    const guard = validateOfflineGuard(isOnline);
    if (!guard.allowed) {
      setCacheMessage(guard.errorMessage);
      return;
    }
    try {
      const res = await fetch('/api/cache/clear', { method: 'POST' });
      if (res.ok) {
        setCacheMessage('Cloud cache cleared.');
        setTimeout(() => setCacheMessage(null), 3000);
      }
    } catch {
      setCacheMessage('Failed to clear cache.');
    }
  };

  const activeNavItem = NAV_ITEMS.find((n) => n.id === activeTab) ?? NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-[#080A10] text-slate-100 flex flex-col lg:flex-row">
      {/* Sidebar Navigation (260px) */}
      <aside className="w-full lg:w-[260px] shrink-0 border-b lg:border-b-0 lg:border-r border-[#1E273B] bg-[#0B0F1A] flex flex-col">
        <div className="px-5 py-5 border-b border-[#1E273B]">
          <span className="text-lg font-display font-bold tracking-tight text-slate-100 whitespace-nowrap">
            AutoDub Cloud
          </span>
        </div>

        <nav aria-label="Primary navigation" className="p-3 flex lg:flex-col gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 text-left ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#131928] border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="hidden lg:block mt-auto p-4 border-t border-[#1E273B] text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Cloud Connectivity</span>
            <span className={`font-mono font-semibold ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Android Kotlin + Jetpack Compose client &amp; Cloud Run Gemini backend.
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract */}
        <header className="px-6 py-4 border-b border-[#1E273B] bg-[#0B0F1A]/80 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-display font-semibold text-slate-100 truncate">
              {activeNavItem.label}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setSimulatedOffline((prev) => !prev)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                isOnline
                  ? 'border-[#26314A] bg-[#101522] text-emerald-300 hover:border-cyan-500/40'
                  : 'border-rose-500 bg-rose-500/20 text-rose-200'
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{isOnline ? 'Online Mode' : 'Offline — Cloud Halted'}</span>
            </button>
          </div>
        </header>

        {/* Strict Offline Banner */}
        {!isOnline && (
          <div
            role="status"
            data-testid="offline-banner"
            className="mx-6 mt-5 px-4 py-3 rounded-lg border border-rose-500/60 bg-rose-950/40 text-xs text-rose-200 flex items-center justify-between gap-3"
          >
            <span>
              Offline: Koneksi internet terputus. Permintaan cloud dihentikan dan tidak akan diganti secara diam-diam ke TTS perangkat.
            </span>
            <button
              type="button"
              onClick={() => setSimulatedOffline(false)}
              className="px-3 py-1 rounded bg-rose-500/30 hover:bg-rose-500/40 text-rose-100 font-medium whitespace-nowrap shrink-0"
            >
              Restore Connection
            </button>
          </div>
        )}

        <main className="p-6 flex-1">
          {activeTab === 'dashboard' && (
            <VnSimulatorDashboard
              frames={VN_DEMO_FRAMES}
              activeFrameIndex={activeFrameIdx}
              customSpeaker={simSpeaker}
              customDialog={simDialog}
              onSelectFrame={(idx) => {
                setActiveFrameIdx(idx);
                setSimSpeaker(VN_DEMO_FRAMES[idx].speaker);
                setSimDialog(VN_DEMO_FRAMES[idx].dialog);
              }}
              onChangeSpeaker={setSimSpeaker}
              onChangeDialog={setSimDialog}
              roiConfig={roiConfig}
              characters={characters}
              isOnline={isOnline}
              isProcessing={isProcessing}
              isMuted={isMuted}
              onToggleMute={() => setIsMuted((m) => !m)}
              onScanAndDub={() => void runDubbingPipeline(simSpeaker, simDialog)}
              activeSubtitle={activeSubtitle}
              pipelineError={pipelineError}
              audioUrl={audioUrl}
              logs={logs}
            />
          )}

          {activeTab === 'scanner' && (
            <ScreenScannerView
              roiConfig={roiConfig}
              logs={logs}
              isProcessing={isProcessing}
              onRunCustomOcrScan={(spk, dlg) => void runDubbingPipeline(spk, dlg)}
            />
          )}

          {activeTab === 'roi' && (
            <RoiConfigView roiConfig={roiConfig} onChangeRoiConfig={setRoiConfig} />
          )}

          {activeTab === 'characters' && (
            <CharacterManagerView
              characters={characters}
              onUpsertCharacter={(profile) => {
                setCharacters((prev) => {
                  const exists = prev.some((c) => c.id === profile.id);
                  return exists
                    ? prev.map((c) => (c.id === profile.id ? profile : c))
                    : [...prev, profile];
                });
              }}
              onDeleteCharacter={(id) => {
                setCharacters((prev) => prev.filter((c) => c.id !== id));
              }}
              onOpenInStudio={(profile) => {
                setStudio((prev) => ({
                  ...prev,
                  targetCharacterId: profile.id,
                  voiceId: profile.voiceId,
                  personaDescription: profile.voicePersonality,
                  emotion: profile.emotion,
                  speechRate: profile.speechRate,
                  pitch: profile.pitch,
                  error: null,
                }));
                setActiveTab('studio');
              }}
            />
          )}

          {activeTab === 'studio' && (
            <AiVoiceStudioView
              studio={studio}
              characters={characters}
              onChangeStudio={(patch) => setStudio((prev) => ({ ...prev, ...patch }))}
              onGeneratePreview={() => void handleGenerateVoicePreview()}
              onTestVoice={() => void handleTestVoice()}
              onSaveToCharacter={() => {
                setCharacters((prev) =>
                  prev.map((c) =>
                    c.id === studio.targetCharacterId
                      ? {
                          ...c,
                          voiceId: studio.voiceId,
                          voicePersonality: studio.personaDescription,
                          emotion: studio.emotion,
                          speechRate: studio.speechRate,
                          pitch: studio.pitch,
                        }
                      : c
                  )
                );
                setActiveTab('characters');
              }}
            />
          )}

          {activeTab === 'translation' && (
            <TranslationSettingsView
              settings={translationSettings}
              onChangeSettings={setTranslationSettings}
              onClearServerCache={() => void handleClearServerCache()}
              cacheMessage={cacheMessage}
            />
          )}

          {activeTab === 'server' && (
            <ServerSettingsView
              serverUrl={serverUrl}
              onChangeServerUrl={setServerUrl}
              isOnline={isOnline}
              onToggleOfflineSim={() => setSimulatedOffline((s) => !s)}
              healthData={healthData}
              healthError={healthError}
              isCheckingHealth={isCheckingHealth}
              onCheckHealth={() => void checkHealth()}
            />
          )}
        </main>
      </div>
    </div>
  );
}

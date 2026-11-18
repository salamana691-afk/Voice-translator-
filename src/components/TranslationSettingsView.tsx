import React, { useState } from 'react';
import { Trash2, Plus, RefreshCw } from 'lucide-react';
import { type TranslationSettings } from '../lib/autodubClientCore';

interface TranslationSettingsViewProps {
  settings: TranslationSettings;
  onChangeSettings: (next: TranslationSettings) => void;
  onClearServerCache: () => void;
  cacheMessage: string | null;
}

const LANGUAGES = ['English', 'Japanese', 'Indonesian', 'Korean', 'Chinese', 'Spanish'];

export const TranslationSettingsView: React.FC<TranslationSettingsViewProps> = ({
  settings,
  onChangeSettings,
  onClearServerCache,
  cacheMessage,
}) => {
  const [termSource, setTermSource] = useState('');
  const [termTarget, setTermTarget] = useState('');

  const handleAddGlossary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termSource.trim() || !termTarget.trim()) return;
    onChangeSettings({
      ...settings,
      glossary: {
        ...settings.glossary,
        [termSource.trim()]: termTarget.trim(),
      },
    });
    setTermSource('');
    setTermTarget('');
  };

  const removeGlossaryKey = (key: string) => {
    const next = { ...settings.glossary };
    delete next[key];
    onChangeSettings({ ...settings, glossary: next });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <section className="xl:col-span-7 bg-[#101522] border border-[#1E273B] rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Translation Settings</h2>
          <p className="text-xs text-slate-400 mt-1">
            Powered by Gemini 4 Hydrogen (`POST /translate`) with Visual Novel conversation memory and name/honorific preservation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="source-lang" className="block text-xs text-slate-400 mb-1.5">
              Source Language
            </label>
            <select
              id="source-lang"
              value={settings.sourceLang}
              onChange={(e) => onChangeSettings({ ...settings, sourceLang: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg bg-[#080A10] border border-[#26314A] text-slate-100"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="target-lang" className="block text-xs text-slate-400 mb-1.5">
              Target Language
            </label>
            <select
              id="target-lang"
              value={settings.targetLang}
              onChange={(e) => onChangeSettings({ ...settings, targetLang: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg bg-[#080A10] border border-[#26314A] text-slate-100"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="divide-y divide-[#1E273B] border border-[#1E273B] rounded-lg bg-[#0B0F1A]">
          <ToggleItem
            id="toggle-names"
            title="Preserve Character & Place Names"
            description="Prevent literal translation of character names and proper nouns."
            checked={settings.preserveNames}
            onChange={(preserveNames) => onChangeSettings({ ...settings, preserveNames })}
          />
          <ToggleItem
            id="toggle-honorifics"
            title="Preserve Anime Honorifics"
            description="Keep -san, -kun, -chan, -sama, and -senpai intact in Indonesian dubbing."
            checked={settings.preserveHonorifics}
            onChange={(preserveHonorifics) => onChangeSettings({ ...settings, preserveHonorifics })}
          />
          <ToggleItem
            id="toggle-context"
            title="Visual Novel Context Memory"
            description="Send recent turns so pronouns and tone remain consistent across lines."
            checked={settings.vnContextEnabled}
            onChange={(vnContextEnabled) => onChangeSettings({ ...settings, vnContextEnabled })}
          />
          <ToggleItem
            id="toggle-autoplay"
            title="Auto-Play Neural Dubbing"
            description="Play Gemini Neural TTS WAV audio immediately after translation."
            checked={settings.autoPlayDub}
            onChange={(autoPlayDub) => onChangeSettings({ ...settings, autoPlayDub })}
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onClearServerCache}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#26314A] text-slate-200 hover:border-cyan-500/50 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Clear Ephemeral Cloud Cache</span>
          </button>
          {cacheMessage && <span className="text-xs text-emerald-400">{cacheMessage}</span>}
        </div>
      </section>

      {/* Protected Terms Glossary */}
      <section className="xl:col-span-5 bg-[#101522] border border-[#1E273B] rounded-xl p-6 space-y-4 h-fit">
        <div>
          <h3 className="text-base font-semibold text-slate-100">Special Terms Glossary</h3>
          <p className="text-xs text-slate-400 mt-1">
            Lock lore terms, skill names, or titles so Gemini translates them consistently.
          </p>
        </div>

        <form onSubmit={handleAddGlossary} className="grid grid-cols-12 gap-2">
          <input
            type="text"
            aria-label="Source term"
            value={termSource}
            onChange={(e) => setTermSource(e.target.value)}
            placeholder="Source term"
            className="col-span-5 px-3 py-2 text-xs rounded-lg bg-[#080A10] border border-[#26314A] text-slate-100"
          />
          <input
            type="text"
            aria-label="Target term"
            value={termTarget}
            onChange={(e) => setTermTarget(e.target.value)}
            placeholder="Target form"
            className="col-span-5 px-3 py-2 text-xs rounded-lg bg-[#080A10] border border-[#26314A] text-slate-100"
          />
          <button
            type="submit"
            aria-label="Add glossary term"
            className="col-span-2 rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 flex items-center justify-center"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>

        <div className="space-y-2">
          {Object.entries(settings.glossary).map(([src, dst]) => (
            <div
              key={src}
              className="flex items-center justify-between px-3 py-2 rounded-lg border border-[#1E273B] bg-[#0B0F1A] text-xs"
            >
              <div>
                <span className="text-slate-300 font-medium">{src}</span>
                <span className="mx-2 text-slate-500">→</span>
                <span className="text-cyan-400">{dst}</span>
              </div>
              <button
                type="button"
                aria-label={`Remove ${src}`}
                onClick={() => removeGlossaryKey(src)}
                className="text-slate-400 hover:text-rose-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const ToggleItem: React.FC<{
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}> = ({ id, title, description, checked, onChange }) => (
  <div className="p-4 flex items-center justify-between gap-4">
    <div>
      <label htmlFor={id} className="text-sm font-medium text-slate-100 block cursor-pointer">
        {title}
      </label>
      <p className="text-xs text-slate-400">{description}</p>
    </div>
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 accent-cyan-500 cursor-pointer shrink-0"
    />
  </div>
);

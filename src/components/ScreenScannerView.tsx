import React, { useState } from 'react';
import { ScanText, CheckCircle2, Ban } from 'lucide-react';
import {
  shouldProcessOcrFrame,
  type PipelineLogItem,
  type RoiConfig,
} from '../lib/autodubClientCore';

interface ScreenScannerViewProps {
  roiConfig: RoiConfig;
  logs: PipelineLogItem[];
  onRunCustomOcrScan: (speaker: string, dialog: string) => void;
  isProcessing: boolean;
}

export const ScreenScannerView: React.FC<ScreenScannerViewProps> = ({
  roiConfig,
  logs,
  onRunCustomOcrScan,
  isProcessing,
}) => {
  const [prevSpeaker, setPrevSpeaker] = useState('NORA');
  const [prevDialog, setPrevDialog] = useState(
    'Wait, Salman-kun! You actually climbed all the way up to the east terrace?'
  );
  const [nextSpeaker, setNextSpeaker] = useState('NORA');
  const [nextDialog, setNextDialog] = useState(
    'Wait, Salman-kun! You actually climbed all the way up to the east terrace?'
  );

  const evaluation = shouldProcessOcrFrame(
    { speaker: prevSpeaker, dialog: prevDialog },
    { speaker: nextSpeaker, dialog: nextDialog },
    roiConfig.changeThreshold
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-[#101522] border border-[#1E273B] rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              On-Device OCR &amp; Dialog Change Detector
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Simulates Android MediaProjection + ML Kit local text extraction with Levenshtein deduplication so identical game frames never trigger redundant cloud API calls.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="prev-speaker" className="block text-xs text-slate-400">
                Previous Frame Speaker (ROI 1)
              </label>
              <input
                id="prev-speaker"
                type="text"
                value={prevSpeaker}
                onChange={(e) => setPrevSpeaker(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-[#080A10] border border-[#26314A] text-slate-100"
              />
              <label htmlFor="prev-dialog" className="block text-xs text-slate-400">
                Previous Frame Dialogue (ROI 2)
              </label>
              <textarea
                id="prev-dialog"
                rows={3}
                value={prevDialog}
                onChange={(e) => setPrevDialog(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-[#080A10] border border-[#26314A] text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="next-speaker" className="block text-xs text-slate-400">
                Current Frame Speaker (ROI 1)
              </label>
              <input
                id="next-speaker"
                type="text"
                value={nextSpeaker}
                onChange={(e) => setNextSpeaker(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-[#080A10] border border-[#26314A] text-slate-100"
              />
              <label htmlFor="next-dialog" className="block text-xs text-slate-400">
                Current Frame Dialogue (ROI 2)
              </label>
              <textarea
                id="next-dialog"
                rows={3}
                value={nextDialog}
                onChange={(e) => setNextDialog(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-[#080A10] border border-[#26314A] text-slate-100"
              />
            </div>
          </div>

          <div className="p-4 rounded-lg border border-[#1E273B] bg-[#0B0F1A] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {evaluation.shouldProcess ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <Ban className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              <div>
                <div className="text-sm font-medium text-slate-100">
                  {evaluation.shouldProcess ? 'Process & Dub Allowed' : 'Duplicate Suppressed'}
                </div>
                <div className="text-xs text-slate-400">
                  {evaluation.reason} · Similarity {(evaluation.similarity * 100).toFixed(1)}% (Threshold{' '}
                  {(roiConfig.changeThreshold * 100).toFixed(0)}%)
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={!evaluation.shouldProcess || isProcessing}
              onClick={() => {
                onRunCustomOcrScan(nextSpeaker, nextDialog);
                setPrevSpeaker(nextSpeaker);
                setPrevDialog(nextDialog);
              }}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-40 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <ScanText className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Processing...' : 'Send to Cloud Pipeline'}</span>
            </button>
          </div>
        </section>

        <section className="lg:col-span-5 bg-[#101522] border border-[#1E273B] rounded-xl p-6 space-y-4">
          <h3 className="text-base font-semibold text-slate-100">Scanner Parameters</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-[#0B0F1A] border border-[#1E273B]">
              <div className="text-slate-400">Scan Interval</div>
              <div className="text-base font-mono text-cyan-400 tabular-nums mt-1">
                {roiConfig.scanIntervalMs} ms
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[#0B0F1A] border border-[#1E273B]">
              <div className="text-slate-400">Similarity Cutoff</div>
              <div className="text-base font-mono text-purple-400 tabular-nums mt-1">
                {(roiConfig.changeThreshold * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-300">Pipeline Execution Log</h4>
            {logs.length === 0 ? (
              <p className="text-xs text-slate-400">No scans dispatched yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg bg-[#0B0F1A] border border-[#1E273B] text-xs"
                  >
                    <div className="flex justify-between text-slate-400 font-mono">
                      <span className="text-cyan-400">{log.speaker}</span>
                      <span>{log.modelUsed}</span>
                    </div>
                    <div className="text-slate-200 mt-1">{log.translatedText}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

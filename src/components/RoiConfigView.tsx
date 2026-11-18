import React from 'react';
import { RotateCcw } from 'lucide-react';
import {
  ASSET_PATHS,
  DEFAULT_ROI_CONFIG,
  clampRoiBox,
  type RoiBox,
  type RoiConfig,
} from '../lib/autodubClientCore';

interface RoiConfigViewProps {
  roiConfig: RoiConfig;
  onChangeRoiConfig: (next: RoiConfig) => void;
}

export const RoiConfigView: React.FC<RoiConfigViewProps> = ({
  roiConfig,
  onChangeRoiConfig,
}) => {
  const updateNameRoi = (patch: Partial<RoiBox>) => {
    onChangeRoiConfig({
      ...roiConfig,
      nameRoi: clampRoiBox({ ...roiConfig.nameRoi, ...patch }),
    });
  };

  const updateDialogRoi = (patch: Partial<RoiBox>) => {
    onChangeRoiConfig({
      ...roiConfig,
      dialogRoi: clampRoiBox({ ...roiConfig.dialogRoi, ...patch }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Visual Preview */}
        <section className="xl:col-span-7 bg-[#101522] border border-[#1E273B] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1E273B] flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">2-Box ROI Calibrator</h2>
              <p className="text-xs text-slate-400">
                ROI 1 (Cyan) reads speaker names · ROI 2 (Purple) reads dialogue lines
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChangeRoiConfig(DEFAULT_ROI_CONFIG)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#26314A] text-slate-300 hover:border-cyan-500/50 flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default</span>
            </button>
          </div>

          <div className="relative aspect-video w-full bg-[#07090E]">
            <img
              src={ASSET_PATHS.backdrop}
              alt="ROI Calibration Frame"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-75"
            />
            <div
              style={{
                left: `${roiConfig.nameRoi.x * 100}%`,
                top: `${roiConfig.nameRoi.y * 100}%`,
                width: `${roiConfig.nameRoi.width * 100}%`,
                height: `${roiConfig.nameRoi.height * 100}%`,
              }}
              className="absolute border-2 border-cyan-400 bg-cyan-500/20 rounded flex items-center justify-center"
            >
              <span className="text-xs font-mono font-semibold text-cyan-200">
                ROI 1 · NAME
              </span>
            </div>

            <div
              style={{
                left: `${roiConfig.dialogRoi.x * 100}%`,
                top: `${roiConfig.dialogRoi.y * 100}%`,
                width: `${roiConfig.dialogRoi.width * 100}%`,
                height: `${roiConfig.dialogRoi.height * 100}%`,
              }}
              className="absolute border-2 border-purple-400 bg-purple-500/20 rounded flex items-center justify-center"
            >
              <span className="text-xs font-mono font-semibold text-purple-200">
                ROI 2 · DIALOGUE BOX
              </span>
            </div>
          </div>

          <div className="p-4 border-t border-[#1E273B] flex flex-wrap gap-2 bg-[#0D111C]">
            <button
              type="button"
              onClick={() =>
                onChangeRoiConfig({
                  ...roiConfig,
                  nameRoi: { x: 0.06, y: 0.62, width: 0.24, height: 0.08 },
                  dialogRoi: { x: 0.06, y: 0.72, width: 0.88, height: 0.22 },
                })
              }
              className="px-3 py-1.5 text-xs rounded-lg border border-[#26314A] bg-[#131928] text-slate-200 hover:border-cyan-500/50"
            >
              Preset: Classic Bottom Box
            </button>
            <button
              type="button"
              onClick={() =>
                onChangeRoiConfig({
                  ...roiConfig,
                  nameRoi: { x: 0.12, y: 0.14, width: 0.28, height: 0.08 },
                  dialogRoi: { x: 0.12, y: 0.24, width: 0.76, height: 0.56 },
                })
              }
              className="px-3 py-1.5 text-xs rounded-lg border border-[#26314A] bg-[#131928] text-slate-200 hover:border-purple-500/50"
            >
              Preset: NVL Full-Screen Novel
            </button>
          </div>
        </section>

        {/* Coordinate Controls */}
        <section className="xl:col-span-5 space-y-4">
          <div className="bg-[#101522] border border-[#1E273B] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-cyan-400">
              ROI 1 — Character Name Coordinates
            </h3>
            <RoiRange label="X Offset" value={roiConfig.nameRoi.x} onChange={(x) => updateNameRoi({ x })} />
            <RoiRange label="Y Offset" value={roiConfig.nameRoi.y} onChange={(y) => updateNameRoi({ y })} />
            <RoiRange label="Width" value={roiConfig.nameRoi.width} onChange={(width) => updateNameRoi({ width })} />
            <RoiRange label="Height" value={roiConfig.nameRoi.height} onChange={(height) => updateNameRoi({ height })} />
          </div>

          <div className="bg-[#101522] border border-[#1E273B] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-purple-400">
              ROI 2 — Dialogue Box Coordinates
            </h3>
            <RoiRange label="X Offset" value={roiConfig.dialogRoi.x} onChange={(x) => updateDialogRoi({ x })} />
            <RoiRange label="Y Offset" value={roiConfig.dialogRoi.y} onChange={(y) => updateDialogRoi({ y })} />
            <RoiRange label="Width" value={roiConfig.dialogRoi.width} onChange={(width) => updateDialogRoi({ width })} />
            <RoiRange label="Height" value={roiConfig.dialogRoi.height} onChange={(height) => updateDialogRoi({ height })} />
          </div>

          <div className="bg-[#101522] border border-[#1E273B] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Scan Timing &amp; Deduplication</h3>
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="scan-interval" className="text-slate-400">Scan Interval (ms)</label>
              <span className="font-mono text-cyan-400 tabular-nums">{roiConfig.scanIntervalMs} ms</span>
            </div>
            <input
              id="scan-interval"
              type="range"
              min={400}
              max={2500}
              step={100}
              value={roiConfig.scanIntervalMs}
              onChange={(e) =>
                onChangeRoiConfig({ ...roiConfig, scanIntervalMs: Number(e.target.value) })
              }
              className="w-full accent-cyan-500"
            />
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="similarity-threshold" className="text-slate-400">Change Threshold</label>
              <span className="font-mono text-purple-400 tabular-nums">
                {(roiConfig.changeThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <input
              id="similarity-threshold"
              type="range"
              min={0.6}
              max={0.96}
              step={0.02}
              value={roiConfig.changeThreshold}
              onChange={(e) =>
                onChangeRoiConfig({ ...roiConfig, changeThreshold: Number(e.target.value) })
              }
              className="w-full accent-purple-500"
            />
          </div>
        </section>
      </div>
    </div>
  );
};

const RoiRange: React.FC<{
  label: string;
  value: number;
  onChange: (val: number) => void;
}> = ({ label, value, onChange }) => (
  <div className="flex items-center gap-3 text-xs">
    <span className="w-20 text-slate-400">{label}</span>
    <input
      type="range"
      min={0.02}
      max={0.95}
      step={0.01}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="flex-1 accent-cyan-500"
    />
    <span className="w-12 text-right font-mono text-slate-200 tabular-nums">
      {Math.round(value * 100)}%
    </span>
  </div>
);

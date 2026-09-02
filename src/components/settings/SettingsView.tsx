import React, { useState } from 'react';
import { Settings, Sliders, ShieldCheck, Cpu, Database, Save, RotateCcw } from 'lucide-react';
import type { ScoreWeightsConfig } from '../../types/index.js';

interface SettingsViewProps {
  weights: ScoreWeightsConfig;
  onUpdateWeights: (newWeights: ScoreWeightsConfig) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  weights,
  onUpdateWeights,
}) => {
  const [localWeights, setLocalWeights] = useState<ScoreWeightsConfig>({ ...weights });
  const [saved, setSaved] = useState(false);

  const total =
    Math.round(
      (localWeights.accessibility + localWeights.performance + localWeights.seo + localWeights.security) * 100
    );

  const handleSave = () => {
    onUpdateWeights(localWeights);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    const defaults = { accessibility: 0.40, performance: 0.25, seo: 0.20, security: 0.15 };
    setLocalWeights(defaults);
    onUpdateWeights(defaults);
  };

  return (
    <div className="max-w-4xl space-y-6 text-xs">
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          <span>Platform & Scoring Configuration</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Tune the quality formula weights and inspect engine health.
        </p>
      </div>

      {/* Scoring Weights Calculator */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>Overall Quality Formula Weights</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Adjust how much each pillar contributes to the 0-100 Quality Index.
            </p>
          </div>

          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
              total === 100
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
            }`}
          >
            Total: {total}% {total !== 100 && '(Must equal 100%)'}
          </span>
        </div>

        <div className="space-y-4">
          {/* Accessibility */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-semibold text-slate-300">
              <span>Accessibility (WCAG 2.1 Conformance)</span>
              <span className="font-mono text-emerald-400">
                {Math.round(localWeights.accessibility * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="70"
              step="5"
              value={Math.round(localWeights.accessibility * 100)}
              onChange={(e) =>
                setLocalWeights({ ...localWeights, accessibility: Number(e.target.value) / 100 })
              }
              className="w-full accent-emerald-500 bg-slate-950 h-2 rounded-lg"
            />
          </div>

          {/* Performance */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-semibold text-slate-300">
              <span>Performance (TTFB & Document Weight)</span>
              <span className="font-mono text-sky-400">
                {Math.round(localWeights.performance * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              step="5"
              value={Math.round(localWeights.performance * 100)}
              onChange={(e) =>
                setLocalWeights({ ...localWeights, performance: Number(e.target.value) / 100 })
              }
              className="w-full accent-sky-500 bg-slate-950 h-2 rounded-lg"
            />
          </div>

          {/* SEO */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-semibold text-slate-300">
              <span>Technical SEO (Metadata & OpenGraph)</span>
              <span className="font-mono text-amber-400">
                {Math.round(localWeights.seo * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              step="5"
              value={Math.round(localWeights.seo * 100)}
              onChange={(e) => setLocalWeights({ ...localWeights, seo: Number(e.target.value) / 100 })}
              className="w-full accent-amber-500 bg-slate-950 h-2 rounded-lg"
            />
          </div>

          {/* Security */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-semibold text-slate-300">
              <span>Security Headers (HTTPS, HSTS, CSP)</span>
              <span className="font-mono text-purple-400">
                {Math.round(localWeights.security * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="40"
              step="5"
              value={Math.round(localWeights.security * 100)}
              onChange={(e) =>
                setLocalWeights({ ...localWeights, security: Number(e.target.value) / 100 })
              }
              className="w-full accent-purple-500 bg-slate-950 h-2 rounded-lg"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset to Standard Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={total !== 100}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{saved ? 'Saved Successfully!' : 'Save Weights'}</span>
          </button>
        </div>
      </div>

      {/* Engine & Runtime Status */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          <span>Engine Status & Architecture</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block text-[11px]">WCAG Rule Engine</span>
            <span className="font-bold text-emerald-400 text-sm mt-0.5 block">axe-core 4.8 Spec</span>
            <span className="text-[10px] text-slate-500">Deterministic automated rules</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block text-[11px]">AI Remediation Model</span>
            <span className="font-bold text-indigo-400 text-sm mt-0.5 block">Gemini 3.7 Flash</span>
            <span className="text-[10px] text-slate-500">Multimodal code explanations</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Security Guard</span>
            <span className="font-bold text-sky-400 text-sm mt-0.5 block">SSRF & DNS Guard</span>
            <span className="text-[10px] text-slate-500">Blocks RFC 1918 / localhost</span>
          </div>
        </div>
      </div>
    </div>
  );
};

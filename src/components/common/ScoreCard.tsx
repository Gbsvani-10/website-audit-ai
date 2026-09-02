import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ScoreCardProps {
  id: string;
  title: string;
  score: number;
  icon: LucideIcon;
  description: string;
  benchmark?: string;
  delta?: number;
  colorTheme?: 'emerald' | 'cyan' | 'indigo' | 'amber' | 'purple';
}

export const ScoreCard: React.FC<ScoreCardProps> = ({
  id,
  title,
  score,
  icon: Icon,
  description,
  benchmark = 'Good',
  delta,
}) => {
  // Score rating color calculation
  const getScoreColor = (val: number) => {
    if (val >= 90) return 'text-emerald-400 stroke-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (val >= 75) return 'text-sky-400 stroke-sky-400 bg-sky-500/10 border-sky-500/20';
    if (val >= 50) return 'text-amber-400 stroke-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 stroke-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  const getProgressStroke = (val: number) => {
    if (val >= 90) return '#10b981';
    if (val >= 75) return '#38bdf8';
    if (val >= 50) return '#fbbf24';
    return '#f43f5e';
  };

  const circumference = 2 * Math.PI * 34; // radius = 34
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div
      id={id}
      className="relative p-5 bg-slate-900/80 border border-slate-800 rounded-xl hover:border-slate-700 transition-all duration-200 shadow-sm flex flex-col justify-between"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-300">
            <Icon className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
            <span className="text-xs text-slate-400">{description}</span>
          </div>
        </div>

        {/* Circular score gauge */}
        <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
          <svg className="w-16 h-16 -rotate-90 transform" viewBox="0 0 80 80">
            {/* Background ring */}
            <circle
              cx="40"
              cy="40"
              r="34"
              className="stroke-slate-800"
              strokeWidth="6"
              fill="transparent"
            />
            {/* Value stroke */}
            <circle
              cx="40"
              cy="40"
              r="34"
              stroke={getProgressStroke(score)}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-bold text-slate-100 leading-none">{score}</span>
            <span className="text-[10px] text-slate-400 font-medium leading-tight">/100</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
        <span className="text-slate-400">
          Status: <strong className="text-slate-200 font-medium">{benchmark}</strong>
        </span>
        {delta !== undefined && (
          <span className={`font-semibold ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {delta >= 0 ? `+${delta}` : delta} pts vs baseline
          </span>
        )}
      </div>
    </div>
  );
};

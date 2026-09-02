import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  id: string;
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  highlightColor?: 'emerald' | 'rose' | 'amber' | 'sky' | 'purple';
}

export const StatCard: React.FC<StatCardProps> = ({
  id,
  label,
  value,
  subtext,
  icon: Icon,
  highlightColor = 'sky',
}) => {
  const colorMap = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };

  return (
    <div
      id={id}
      className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between"
    >
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-slate-100 mt-1">{value}</p>
        {subtext && <p className="text-xs text-slate-400 mt-0.5">{subtext}</p>}
      </div>

      {Icon && (
        <div className={`p-3 rounded-lg border ${colorMap[highlightColor]}`}>
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
      )}
    </div>
  );
};

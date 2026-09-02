import React from 'react';
import type { IssueSeverity } from '../../types/index.js';
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

interface SeverityBadgeProps {
  severity: IssueSeverity | 'pass';
  showIcon?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  showIcon = true,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-medium',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  };

  const config = {
    critical: {
      label: 'Critical',
      classes: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
      icon: AlertCircle,
    },
    serious: {
      label: 'Serious',
      classes: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      icon: AlertTriangle,
    },
    moderate: {
      label: 'Moderate',
      classes: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
      icon: Info,
    },
    minor: {
      label: 'Minor',
      classes: 'bg-slate-500/15 text-slate-300 border border-slate-600/30',
      icon: Info,
    },
    pass: {
      label: 'Passed',
      classes: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      icon: CheckCircle2,
    },
  }[severity];

  const IconComponent = config.icon;

  return (
    <span
      id={`severity-badge-${severity}`}
      className={`inline-flex items-center gap-1.5 rounded-md ${config.classes} ${sizeClasses[size]} ${className}`}
    >
      {showIcon && <IconComponent className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
      <span>{config.label}</span>
    </span>
  );
};

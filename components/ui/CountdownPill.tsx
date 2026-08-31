'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { formatCutoffDisplay } from '@/lib/utils/dates';

export interface CountdownPillProps {
  urgency?: 'normal' | 'warning' | 'urgent' | 'closed';
  formattedTime?: string;
  cutoffTime?: string;
  className?: string;
}

export const CountdownPill: React.FC<CountdownPillProps> = ({
  urgency = 'normal',
  formattedTime = '',
  cutoffTime = '19:00',
  className,
}) => {
  const isClosed = urgency === 'closed';
  const isUrgent = urgency === 'urgent';
  const isWarning = urgency === 'warning';
  const displayCutoff = formatCutoffDisplay(cutoffTime);

  return (
    <div
      className={twMerge(
        clsx(
          'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold select-none transition-all',
          isClosed && 'bg-zinc-100 text-zinc-600 border border-zinc-200',
          isUrgent && 'bg-red-50 text-red-700 border border-red-200/80 shadow-sm animate-pulse',
          isWarning && 'bg-amber-50 text-amber-800 border border-amber-200/80',
          !isClosed && !isUrgent && !isWarning && 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
          className
        )
      )}
    >
      {/* Live Status Dot */}
      <span
        className={clsx(
          'w-2 h-2 rounded-full shrink-0',
          isClosed && 'bg-zinc-400',
          isUrgent && 'bg-red-500 animate-ping',
          isWarning && 'bg-amber-500',
          !isClosed && !isUrgent && !isWarning && 'bg-emerald-500'
        )}
      />

      <Clock className="w-3.5 h-3.5 shrink-0 opacity-70" />

      <span className="font-mono tabular-nums font-bold">
        {isClosed ? `Selection Closed (${displayCutoff})` : `${formattedTime} remaining (closes ${displayCutoff})`}
      </span>
    </div>
  );
};

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'veg' | 'nonveg' | 'skip' | 'pending' | 'brand' | 'neutral' | 'success' | 'warning' | 'danger';
  size?: 'xs' | 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center gap-1.5 font-semibold rounded-full select-none';

  const variants = {
    veg: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
    nonveg: 'bg-red-50 text-red-800 border border-red-200/80',
    skip: 'bg-zinc-100 text-zinc-700 border border-zinc-200',
    pending: 'bg-amber-50 text-amber-800 border border-amber-200/80',
    brand: 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20',
    neutral: 'bg-zinc-100 text-zinc-600 border border-zinc-200',
    success: 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-600 border border-amber-500/30',
    danger: 'bg-red-500/15 text-red-600 border border-red-500/30',
  };

  const sizes = {
    xs: 'text-[10px] px-2 py-0.5',
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-xs px-3 py-1',
  };

  const dotColors = {
    veg: 'bg-emerald-500',
    nonveg: 'bg-red-500',
    skip: 'bg-zinc-400',
    pending: 'bg-amber-500',
    brand: 'bg-emerald-500',
    neutral: 'bg-zinc-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  };

  return (
    <span className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))} {...props}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />}
      {children}
    </span>
  );
};

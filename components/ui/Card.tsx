import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'highlight' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    const baseStyles = 'rounded-3xl transition-all';

    const variants = {
      default: 'bg-white border border-zinc-200/80 shadow-card',
      elevated: 'bg-white border border-zinc-200/60 shadow-card-hover',
      interactive:
        'bg-white border border-zinc-200/80 shadow-card hover:border-zinc-300 hover:shadow-card-hover cursor-pointer transition-tactile',
      highlight: 'bg-emerald-50/50 border border-emerald-200 shadow-card',
      bordered: 'bg-transparent border border-zinc-200',
    };

    const paddings = {
      none: '',
      sm: 'p-3.5 sm:p-4',
      md: 'p-5 sm:p-6',
      lg: 'p-6 sm:p-8',
    };

    return (
      <div
        ref={ref}
        className={twMerge(clsx(baseStyles, variants[variant], paddings[padding], className))}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

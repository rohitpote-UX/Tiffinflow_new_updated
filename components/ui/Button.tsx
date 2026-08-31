import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'subtle';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-2xl transition-tactile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none';

    const variants = {
      primary:
        'bg-emerald-600 hover:bg-emerald-700 text-white shadow-button-brand focus-visible:ring-emerald-500',
      accent:
        'bg-amber-500 hover:bg-amber-600 text-zinc-950 shadow-button-accent focus-visible:ring-amber-400 font-bold',
      secondary:
        'bg-white hover:bg-zinc-100 text-zinc-900 border border-zinc-200 shadow-sm focus-visible:ring-zinc-400',
      outline:
        'bg-transparent hover:bg-zinc-100 text-zinc-700 border border-zinc-300 focus-visible:ring-zinc-400',
      ghost:
        'bg-transparent hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 focus-visible:ring-zinc-400',
      danger:
        'bg-red-600 hover:bg-red-700 text-white shadow-sm focus-visible:ring-red-500',
      subtle:
        'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 focus-visible:ring-zinc-400',
    };

    const sizes = {
      xs: 'text-xs px-2.5 py-1.5 gap-1.5 rounded-lg',
      sm: 'text-xs px-3.5 py-2 gap-2 rounded-xl',
      md: 'text-sm px-4 py-2.5 gap-2 rounded-xl',
      lg: 'text-base px-6 py-3.5 gap-2.5 rounded-2xl',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-bold uppercase tracking-wider text-zinc-600 select-none"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-zinc-400 pointer-events-none shrink-0">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            className={twMerge(
              clsx(
                'w-full py-2.5 px-4 rounded-xl border text-sm text-zinc-900 bg-white placeholder:text-zinc-400 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:bg-zinc-50',
                leftIcon ? 'pl-10' : 'pl-3.5',
                rightIcon ? 'pr-10' : 'pr-3.5',
                error ? 'border-red-400 focus:ring-red-500' : 'border-zinc-300',
                className
              )
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3.5 text-zinc-400 pointer-events-none shrink-0">
              {rightIcon}
            </div>
          )}
        </div>

        {error ? (
          <p className="text-xs text-red-600 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-zinc-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

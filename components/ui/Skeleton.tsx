import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  rounded = 'xl',
  ...props
}) => {
  const roundMap = {
    sm: 'rounded-md',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    xl: 'rounded-2xl',
    '2xl': 'rounded-3xl',
    full: 'rounded-full',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'bg-zinc-200/70 animate-pulse',
          roundMap[rounded],
          className
        )
      )}
      {...props}
    />
  );
};

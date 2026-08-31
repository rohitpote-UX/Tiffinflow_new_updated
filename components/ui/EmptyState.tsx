import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`py-12 px-6 flex flex-col items-center justify-center text-center ${className}`}>
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-2xl text-zinc-400 mb-4 shadow-subtle">
          {icon}
        </div>
      )}
      <h4 className="text-base font-bold text-zinc-900 tracking-tight mb-1">{title}</h4>
      {description && <p className="text-xs text-zinc-500 max-w-xs mb-5 leading-relaxed">{description}</p>}
      {actionLabel && onAction && (
        <Button size="sm" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

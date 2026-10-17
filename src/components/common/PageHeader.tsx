import React from 'react';
import { cn } from '@/lib/ui';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  /** Optional row under the title (tabs, filters) inside the same card */
  children?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, badge, actions, children, className }) => (
  <div className={cn('card p-4 sm:p-5 space-y-4', className)}>
    <div className="min-h-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold text-slate-900 truncate">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
    {children}
  </div>
);

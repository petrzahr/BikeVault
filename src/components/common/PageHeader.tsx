import React from 'react';
import { cardClass, cn } from '@/lib/ui';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, badge, actions, className }) => (
  <div
    className={cn(
      cardClass,
      'p-5 min-h-[5rem] flex flex-col sm:flex-row sm:items-center justify-between gap-4',
      className,
    )}
  >
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {badge}
      </div>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {actions}
  </div>
);

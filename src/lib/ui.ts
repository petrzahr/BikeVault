import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'danger' | 'dangerOutline' | 'warning' | 'dark' | 'ghost' | 'outlineDark';
export type ButtonSize = 'sm' | 'md';

const buttonBase =
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-bold rounded-xl transition-colors cursor-pointer ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500/30 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-navy-600 hover:bg-navy-700 text-white shadow-sm',
  secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200',
  soft: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm',
  dangerOutline: 'bg-white hover:bg-rose-50 text-rose-600 border border-rose-200',
  warning: 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm',
  dark: 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm',
  ghost: 'text-slate-500 hover:text-slate-800 hover:bg-slate-100',
  outlineDark: 'bg-white/5 hover:bg-white/10 text-white border border-white/15',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-xs',
};

export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size], className);
}

export const inputClass =
  'w-full px-3.5 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-xl shadow-sm transition-colors ' +
  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-500/30 focus:border-navy-500 ' +
  'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed';

export const labelClass = 'block text-xs font-semibold text-slate-700 mb-1';

export const cardClass = 'bg-white border border-slate-200/80 rounded-2xl shadow-sm';

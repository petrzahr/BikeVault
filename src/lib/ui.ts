import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Component styling lives in recipe classes in src/app/globals.css (see DESIGN.md);
// cn() only combines a recipe with layout utilities or conditional classes.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

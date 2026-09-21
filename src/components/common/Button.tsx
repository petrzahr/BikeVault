import React from 'react';
import { buttonClass, type ButtonSize, type ButtonVariant } from '@/lib/ui';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  ...props
}) => <button type={type} className={buttonClass(variant, size, className)} {...props} />;

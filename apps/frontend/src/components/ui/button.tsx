import * as React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 focus-visible:ring-offset-white select-none active:scale-[0.99] cursor-pointer disabled:pointer-events-none disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] disabled:border-[#E2E8F0] disabled:opacity-100 disabled:shadow-none',
  {
    variants: {
      variant: {
        default: 'bg-[#111827] text-white border border-[#111827] hover:bg-[#1F2937] hover:border-[#1F2937] active:bg-[#0F172A] shadow-xs',
        secondary: 'bg-white text-[#0F172A] border border-[#CBD5E1] hover:bg-[#F8FAFC] hover:border-[#94A3B8] active:bg-[#F1F5F9] shadow-2xs',
        outline: 'bg-white text-[#0F172A] border border-[#CBD5E1] hover:bg-[#F8FAFC] hover:border-[#94A3B8] active:bg-[#F1F5F9] shadow-2xs',
        ghost: 'text-[#334155] bg-transparent hover:text-[#0F172A] hover:bg-[#F8FAFC]',
        destructive: 'bg-[#DC2626] text-white border border-[#DC2626] hover:bg-[#B91C1C] hover:border-[#B91C1C] active:bg-[#991B1B] shadow-xs',
        link: 'text-[#334155] hover:text-[#0F172A] underline-offset-4 hover:underline p-0 h-auto font-medium',
        ai: 'bg-[#7C3AED] text-white border border-[#7C3AED] hover:bg-[#6D28D9] hover:border-[#6D28D9] active:bg-[#5B21B6] shadow-xs',
        'ai-outline': 'bg-violet-50/60 text-[#7C3AED] border border-violet-200 hover:bg-violet-100 hover:border-violet-300 shadow-2xs',
      },
      size: {
        default: 'h-9 px-4 py-2 text-sm',
        sm: 'h-8 px-3 text-xs rounded-lg',
        lg: 'h-11 px-6 text-base rounded-xl font-semibold',
        icon: 'h-9 w-9 p-0 rounded-lg',
        'icon-sm': 'h-8 w-8 p-0 rounded-lg',
        'icon-lg': 'h-10 w-10 p-0 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />
        ) : leftIcon ? (
          <span className="mr-2 shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {!isLoading && rightIcon ? (
          <span className="ml-2 shrink-0">{rightIcon}</span>
        ) : null}
      </button>
    );
  }
);
Button.displayName = 'Button';

export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon'> {
  icon: React.ReactNode;
  'aria-label': string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, className, size = 'icon', ...props }, ref) => {
    return (
      <Button ref={ref} size={size} className={className} {...props}>
        {icon}
      </Button>
    );
  }
);
IconButton.displayName = 'IconButton';

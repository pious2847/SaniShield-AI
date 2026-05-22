"use client";

import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
}

const variantClasses = {
  primary:     "bg-[var(--color-primary)] text-[var(--color-text-inv)] hover:bg-[var(--color-primary-hover)] shadow-sm",
  secondary:   "bg-[var(--color-ochre)] text-white hover:bg-[var(--color-ochre-hover)] shadow-sm",
  ghost:       "bg-transparent text-[var(--color-text-2)] hover:bg-[var(--color-primary-muted)] hover:text-[var(--color-primary)]",
  outline:     "border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-muted)] bg-transparent",
  destructive: "bg-[var(--color-critical)] text-white hover:opacity-90 shadow-sm",
};

const sizeClasses = {
  xs: "h-7  px-3   text-[11px] rounded-[var(--radius-sm)]",
  sm: "h-8  px-4   text-[13px] rounded-[var(--radius-md)]",
  md: "h-10 px-5   text-[14px] rounded-[var(--radius-md)]",
  lg: "h-12 px-7   text-[15px] rounded-[var(--radius-lg)]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-display font-semibold",
        "transition-all duration-[var(--transition-fast)]",
        "focus-visible:ring-2 focus-visible:ring-[var(--color-ochre)] focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "select-none whitespace-nowrap",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {children}
    </button>
  )
);
Button.displayName = "Button";

import React, { forwardRef, ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", children, asChild, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer";

    let variantStyles = "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90";
    if (variant === "destructive") variantStyles = "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90";
    if (variant === "outline") variantStyles = "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground";
    if (variant === "secondary") variantStyles = "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80";
    if (variant === "ghost") variantStyles = "hover:bg-accent hover:text-accent-foreground";
    if (variant === "link") variantStyles = "text-primary underline-offset-4 hover:underline";

    let sizeStyles = "h-11 px-5 py-2";
    if (size === "sm") sizeStyles = "h-8 rounded-lg px-3 text-xs";
    if (size === "lg") sizeStyles = "h-12 rounded-xl px-8 text-base";
    if (size === "icon") sizeStyles = "size-9 rounded-lg";

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

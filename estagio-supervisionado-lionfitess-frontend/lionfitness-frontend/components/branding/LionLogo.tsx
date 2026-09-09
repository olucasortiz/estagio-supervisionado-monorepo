import { cn } from "@/lib/utils";

export interface LionLogoProps {
  className?: string;
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  layout?: "horizontal" | "vertical";
}

export function LionLogo({ className, variant = "dark", size = "md", layout = "horizontal" }: LionLogoProps) {
  const textColor = variant === "light" ? "text-white" : "text-foreground";
  const accentColor = "text-lion-red";

  const sizeClasses = {
    sm: "text-lg gap-1.5",
    md: "text-xl gap-2",
    lg: "text-2xl gap-2.5",
  };

  const iconSizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  if (layout === "vertical") {
    return (
      <div className={cn("flex flex-col items-center text-center font-semibold tracking-tight", textColor, className)}>
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cn("shrink-0 mb-3", size === "lg" ? "h-14 w-14" : iconSizes[size])}
          aria-hidden="true"
        >
          <rect width="32" height="32" rx="8" fill="currentColor" className={accentColor} />
          <path
            d="M8 24c0-4.418 3.582-8 8-8s8 3.582 8 8M10 13c0-2.209 1.791-4 4-4s4 1.791 4 4"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="22" cy="11" r="2.5" fill="white" />
        </svg>
        <div className={cn("flex items-center justify-center", sizeClasses[size])}>
          <span>Lion</span>
          <span className={accentColor}>Fitness</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center font-semibold tracking-tight", textColor, sizeClasses[size], className)}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", iconSizes[size])}
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="8" fill="currentColor" className={accentColor} />
        <path
          d="M8 24c0-4.418 3.582-8 8-8s8 3.582 8 8M10 13c0-2.209 1.791-4 4-4s4 1.791 4 4"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="22" cy="11" r="2.5" fill="white" />
      </svg>
      <span>Lion</span>
      <span className={accentColor}>Fitness</span>
    </div>
  );
}

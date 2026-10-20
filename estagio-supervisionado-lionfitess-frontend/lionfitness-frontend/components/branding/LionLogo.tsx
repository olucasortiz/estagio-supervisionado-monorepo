import Image from "next/image";
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

  const dimensions = {
    sm: 24,
    md: 32,
    lg: 40,
  };

  if (layout === "vertical") {
    const vertDim = size === "lg" ? 56 : dimensions[size];
    return (
      <div className={cn("flex flex-col items-center text-center font-semibold tracking-tight", textColor, className)}>
        <Image
          src="/03-LOGO-ORIGINAL-LION.png"
          alt="Lion Fitness"
          width={vertDim}
          height={vertDim}
          className={cn("shrink-0 mb-3 rounded-lg object-contain shadow-sm", size === "lg" ? "h-14 w-14" : iconSizes[size])}
          priority
        />
        <div className={cn("flex items-center justify-center", sizeClasses[size])}>
          <span>Lion</span>
          <span className={accentColor}>Fitness</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center font-semibold tracking-tight", textColor, sizeClasses[size], className)}>
      <Image
        src="/03-LOGO-ORIGINAL-LION.png"
        alt="Lion Fitness"
        width={dimensions[size]}
        height={dimensions[size]}
        className={cn("shrink-0 rounded-lg object-contain shadow-sm", iconSizes[size])}
        priority
      />
      <span>Lion</span>
      <span className={accentColor}>Fitness</span>
    </div>
  );
}

import { useId } from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  tone?: "light" | "dark";
  tagline?: boolean;
}

const sizes = {
  sm: { mark: "h-8 w-8", name: "text-base", tagline: "text-[9px]" },
  md: { mark: "h-10 w-10", name: "text-lg", tagline: "text-[10px]" },
  lg: { mark: "h-12 w-12", name: "text-xl", tagline: "text-[10px]" },
};

export function Logo({ className, size = "md", tone = "dark", tagline = false }: LogoProps) {
  const gradientId = `ewuswap-mark-${useId().replace(/:/g, "")}`;
  const textColor = tone === "light" ? "text-white" : "text-slate-900 dark:text-white";
  const mutedColor = tone === "light" ? "text-white/60" : "text-muted-foreground";

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        aria-hidden="true"
        viewBox="0 0 40 40"
        className={cn("shrink-0 drop-shadow-md", sizes[size].mark)}
        fill="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="5" y1="4" x2="36" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#5C55EE" />
            <stop offset="1" stopColor="#3479D8" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="38" height="38" rx="13" fill={`url(#${gradientId})`} />
        <path d="M11 15.5h14.5a5 5 0 0 1 0 10H23" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m27 21.5-4 4 4 4" stroke="#9BE7CF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M29 24.5H14.5a5 5 0 0 1 0-10H16" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m13 18.5 4-4-4-4" stroke="#FFC1A9" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="flex min-w-0 flex-col gap-1">
        <span className={cn("font-extrabold leading-none tracking-tight", sizes[size].name, textColor)}>
          Ewu<span className="text-indigo-500">Swap</span>
        </span>
        {tagline && (
          <span className={cn("font-medium leading-none", sizes[size].tagline, mutedColor)}>
            Campus skill exchange
          </span>
        )}
      </span>
    </span>
  );
}
import { useState } from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  tone?: "light" | "dark";
  tagline?: boolean;
}

const sizes = {
  sm: { img: "h-8 max-w-[150px]", mark: "h-7 w-7", name: "text-base", tagline: "text-[9px]" },
  md: { img: "h-10 max-w-[180px]", mark: "h-9 w-9", name: "text-lg", tagline: "text-[10px]" },
  lg: { img: "h-12 max-w-[220px]", mark: "h-11 w-11", name: "text-xl", tagline: "text-[11px]" },
  xl: { img: "h-16 max-w-[280px]", mark: "h-14 w-14", name: "text-2xl", tagline: "text-xs" },
};

export function Logo({ className, size = "md", tone = "dark", tagline = false }: LogoProps) {
  const [imgError, setImgError] = useState(false);
  const textColor = tone === "light" ? "text-white" : "text-slate-900 dark:text-white";
  const mutedColor = tone === "light" ? "text-slate-400" : "text-slate-500 dark:text-slate-400";
  const accentColor = tone === "light" ? "text-blue-400" : "text-blue-600 dark:text-blue-400";

  // Use the transparent official logos: logo-light.png on dark backgrounds, logo.png on light backgrounds
  const logoSrc = tone === "light" ? "/logo-light.png" : "/logo.png";

  return (
    <span className={cn("inline-flex flex-col items-start select-none", className)}>
      {!imgError ? (
        <img
          src={logoSrc}
          alt="EWUSwap"
          onError={() => setImgError(true)}
          className={cn("w-auto object-contain drop-shadow-sm transition-transform duration-200", sizes[size].img)}
          draggable={false}
        />
      ) : (
        <span className="inline-flex items-center gap-2.5">
          <img
            src="/logo-mark-hd.png"
            alt="EWUSwap"
            className={cn("shrink-0 object-contain drop-shadow-sm", sizes[size].mark)}
            draggable={false}
          />
          <span className="flex min-w-0 flex-col leading-none">
            <span className={cn("font-black tracking-tight leading-none", sizes[size].name, textColor)}>
              EWU<span className={accentColor}>Swap</span>
            </span>
          </span>
        </span>
      )}
      {tagline && (
        <span className={cn("pl-1 text-[9px] font-medium tracking-wide leading-none mt-1 opacity-80", mutedColor)}>
          Campus skill exchange
        </span>
      )}
    </span>
  );
}

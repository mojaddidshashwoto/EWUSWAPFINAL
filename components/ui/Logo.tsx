import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  tone?: "light" | "dark";
  tagline?: boolean;
}

const sizes = {
  sm: "h-8",
  md: "h-10",
  lg: "h-12",
};

export function Logo({ className, size = "md", tone = "dark", tagline = false }: LogoProps) {
  const mutedColor = tone === "light" ? "text-white/60" : "text-muted-foreground";

  return (
    <span className={cn("inline-flex min-w-0 flex-col items-start gap-1", className)}>
      <img
        src={tone === "light" ? "/logo-light.png" : "/logo.png"}
        alt="EWUSwap"
        className={cn("w-auto object-contain", sizes[size])}
      />
      {tagline && <span className={cn("pl-1 text-[10px] font-medium leading-none", mutedColor)}>Campus skill exchange</span>}
    </span>
  );
}
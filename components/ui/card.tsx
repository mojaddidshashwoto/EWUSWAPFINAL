import * as React from "react";

import { cn } from "@/lib/utils";

function Card({
  className,
  onMouseMove,
  style,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
      e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
      onMouseMove?.(e);
    },
    [onMouseMove]
  );

  return (
    <div
      data-slot="card"
      onMouseMove={handleMouseMove}
      style={style}
      className={cn(
        "group relative flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/[0.025] text-card-foreground py-6 shadow-2xl backdrop-blur-3xl transition-all duration-300 hover:border-white/20 hover:bg-white/[0.04]",
        className
      )}
      {...props}
    >
      {/* Dynamic Mouse Spotlight: radial gradient following cursor */}
      <div
        className="pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(450px circle at var(--mouse-x, -200px) var(--mouse-y, -200px), rgba(99, 102, 241, 0.12), rgba(16, 185, 129, 0.08), transparent 70%)",
        }}
      />
      {children}
    </div>
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6 relative z-10",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-bold tracking-tight text-white", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-zinc-400 text-xs tracking-normal leading-relaxed", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 relative z-10", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6 relative z-10", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};

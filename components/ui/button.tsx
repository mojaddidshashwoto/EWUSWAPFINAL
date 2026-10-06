import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, useMotionValue, useSpring } from "framer-motion";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 text-white border border-indigo-400/30 shadow-[0_0_20px_rgba(99,102,241,0.25)] hover:shadow-[0_0_35px_rgba(99,102,241,0.5),0_0_20px_rgba(53,169,133,0.35)] hover:scale-105 active:scale-95 transition-all duration-300 font-bold tracking-tight",
        destructive:
          "bg-rose-600/90 text-white border border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:bg-rose-500 hover:shadow-[0_0_35px_rgba(244,63,94,0.5)] active:scale-95",
        outline:
          "border-white/10 bg-white/[0.03] text-zinc-200 backdrop-blur-xl hover:border-white/25 hover:bg-white/[0.07] hover:text-white hover:shadow-[0_0_25px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95",
        secondary:
          "bg-white/10 text-white border border-white/10 backdrop-blur-md hover:bg-white/15 hover:shadow-[0_0_25px_rgba(99,102,241,0.25)] hover:scale-105 active:scale-95",
        ghost:
          "text-zinc-400 hover:bg-white/[0.06] hover:text-white active:scale-95",
        link: "text-indigo-400 underline-offset-4 hover:underline hover:text-indigo-300",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-9 rounded-xl gap-1.5 px-3.5 has-[>svg]:px-3 text-xs",
        lg: "h-11 rounded-xl px-6 has-[>svg]:px-4 text-base",
        icon: "size-9 rounded-xl",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

interface MagneticButtonProps extends ButtonProps {
  magneticPull?: number;
}

/**
 * Tactile Magnetic Button powered by Framer Motion.
 * Magnetically pulls the button toward cursor coordinates on hover.
 */
const MagneticButton = React.forwardRef<HTMLButtonElement, MagneticButtonProps>(
  ({ children, className, magneticPull = 0.28, onMouseMove, onMouseLeave, ...props }, ref) => {
    const innerRef = React.useRef<HTMLButtonElement | null>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const springConfig = { damping: 14, stiffness: 160, mass: 0.12 };
    const springX = useSpring(x, springConfig);
    const springY = useSpring(y, springConfig);

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
      const target = innerRef.current;
      if (target) {
        const rect = target.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        x.set((e.clientX - centerX) * magneticPull);
        y.set((e.clientY - centerY) * magneticPull);
      }
      onMouseMove?.(e);
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      x.set(0);
      y.set(0);
      onMouseLeave?.(e);
    };

    return (
      <motion.div
        style={{ x: springX, y: springY }}
        className="inline-block"
      >
        <Button
          ref={(node) => {
            innerRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={className}
          {...props}
        >
          {children}
        </Button>
      </motion.div>
    );
  }
);
MagneticButton.displayName = "MagneticButton";

export { Button, MagneticButton, buttonVariants };

import { useEffect, useRef, useState } from "react";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { Logo } from "@/components/ui/Logo";
import { motionEase } from "@/lib/motion";

const INTRO_SESSION_KEY = "ewuswap-brand-intro-seen";

export function shouldPlayBrandIntro() {
  if (typeof window === "undefined") return false;

  try {
    if (window.sessionStorage.getItem(INTRO_SESSION_KEY)) return false;
    window.sessionStorage.setItem(INTRO_SESSION_KEY, "true");
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

interface BrandIntroProps {
  onReveal: () => void;
  onFinish: () => void;
}

export function BrandIntro({ onReveal, onFinish }: BrandIntroProps) {
  const shouldReduceMotion = useReducedMotion();
  const logoControls = useAnimationControls();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    let active = true;
    const finish = () => {
      if (!active || finishedRef.current) return;
      finishedRef.current = true;
      onReveal();
      onFinish();
    };

    const fallbackTimer = window.setTimeout(finish, 3200);

    const play = async () => {
      try {
        if (shouldReduceMotion) {
          finish();
          return;
        }

        await logoControls.start({
          opacity: 1,
          scale: 1,
          rotateX: 0,
          y: 0,
          transition: { duration: 0.5, ease: motionEase },
        });
        await logoControls.start({
          rotateX: -11,
          scale: 0.985,
          y: -3,
          transition: { duration: 1, ease: motionEase },
        });

        if (!active) return;
        setIsTransitioning(true);
        onReveal();
        await logoControls.start({
          opacity: 0,
          y: -36,
          rotateX: -16,
          scale: 0.94,
          transition: { duration: 0.85, ease: motionEase },
        });
        finish();
      } catch {
        finish();
      }
    };

    void play();
    return () => {
      active = false;
      window.clearTimeout(fallbackTimer);
    };
  }, [logoControls, onFinish, onReveal, shouldReduceMotion]);

  return (
    <motion.div
      key="ewuswap-brand-intro"
      initial={{ opacity: 1 }}
      animate={{ opacity: isTransitioning ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: isTransitioning ? 0.9 : 0.2, ease: motionEase }}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#080b16]"
      aria-label="EWUSwap introduction"
      role="status"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_46%,rgba(79,70,229,0.16),transparent_42%),radial-gradient(ellipse_at_50%_58%,rgba(16,185,129,0.08),transparent_50%)]" />
      <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[90px] sm:h-72 sm:w-72" />

      <motion.div
        initial={{ opacity: 0, scale: 0.84, rotateX: 0, y: 0 }}
        animate={logoControls}
        style={{ transformPerspective: 1000, transformOrigin: "center center" }}
        className="relative z-10 px-8 drop-shadow-[0_0_30px_rgba(99,102,241,0.3)]"
      >
        <Logo size="xl" tone="light" />
      </motion.div>
    </motion.div>
  );
}

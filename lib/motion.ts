import type { Variants } from "framer-motion";

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export const revealVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

export const staggerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.08,
    },
  },
};

export const revealItemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

export const revealFromLeftVariants: Variants = {
  hidden: { opacity: 0, x: -18 },
  visible: { opacity: 1, x: 0 },
};

export const revealFromRightVariants: Variants = {
  hidden: { opacity: 0, x: 18 },
  visible: { opacity: 1, x: 0 },
};

export const revealFromTopVariants: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0 },
};

export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
};

export const modalVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.985 },
};

export const cardHoverTransition = {
  type: "spring",
  stiffness: 280,
  damping: 24,
} as const;

export const motionEase = [0.22, 1, 0.36, 1] as const;

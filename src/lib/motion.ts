import type { Transition, Variants } from "motion/react";

export const EASE_SMOOTH: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const EASE_EXIT: [number, number, number, number] = [0.4, 0, 1, 1];
export const EASE_BOUNCE: [number, number, number, number] = [0.34, 1.56, 0.64, 1];

export const DURATION_FAST = 0.15;
export const DURATION_NORMAL = 0.24;
export const DURATION_ENTER = 0.32;
export const DURATION_EXIT = 0.18;

export const STAGGER_FAST = 0.045;
export const STAGGER_NORMAL = 0.055;

export const transitionSmooth: Transition = {
  duration: DURATION_NORMAL,
  ease: EASE_SMOOTH,
};

export const transitionFast: Transition = {
  duration: DURATION_FAST,
  ease: EASE_SMOOTH,
};

export const transitionExit: Transition = {
  duration: DURATION_EXIT,
  ease: EASE_EXIT,
};

export const staggerContainer = (staggerDelay = STAGGER_NORMAL): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: 0.05,
    },
  },
});

export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION_NORMAL,
      ease: EASE_SMOOTH,
    },
  },
};

export const fadeInItem: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATION_NORMAL,
      ease: EASE_SMOOTH,
    },
  },
};

export const scalePopItem: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: DURATION_NORMAL,
      ease: EASE_SMOOTH,
    },
  },
};

export const pageTransitionVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.18,
      ease: EASE_SMOOTH,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.12,
      ease: EASE_EXIT,
    },
  },
};

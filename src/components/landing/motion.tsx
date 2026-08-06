"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * The motion vocabulary for the landing page and user app — three primitives,
 * nothing more. The admin panel imports none of this; it is deliberately static.
 *
 * Everything is entrance-only and one-shot (`once: true`). A page that keeps
 * animating as you scroll up and down draws attention to the animation rather
 * than the content.
 *
 * Every primitive checks `useReducedMotion` and collapses to a plain render,
 * because these are decorative and a vestibular disorder is not a preference.
 */

const EASE = [0.2, 0.8, 0.2, 1] as const;

/**
 * Only the bottom edge is inset, so an element must rise 80px into the viewport
 * before it reveals. Insetting the top edge too — as `margin: "-80px"` does —
 * means anything already above that line when the observer attaches never
 * intersects at all, and stays invisible permanently.
 */
const VIEWPORT = { once: true, margin: "0px 0px -80px 0px" } as const;

export function Rise({
  children,
  delay = 0,
  className,
  onMount = false,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  /**
   * Animate immediately instead of waiting to scroll into view. Required above
   * the fold: the viewport margin below shrinks the trigger area, so content
   * already at the top of the page never fires and stays at opacity 0.
   */
  onMount?: boolean;
}) {
  const still = useReducedMotion();

  if (still) return <div className={className}>{children}</div>;

  const reveal = { opacity: 1, y: 0 };

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      {...(onMount
        ? { animate: reveal }
        : { whileInView: reveal, viewport: VIEWPORT })}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** A card that lands with its stamped shadow, used for the three-up rows. */
export function Stamp({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const still = useReducedMotion();

  if (still) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 22, rotate: -1.5 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.45, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A slow drift. Unlike the others this one loops, so it is capped at a few
 * pixels over several seconds — enough to keep the page feeling alive, small
 * enough that it never competes with the headline for attention.
 */
export function Float({
  children,
  className,
  distance = 8,
  duration = 5,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
  duration?: number;
  delay?: number;
}) {
  const still = useReducedMotion();

  if (still) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      animate={{ y: [0, -distance, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

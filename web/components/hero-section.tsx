"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import SubscribeBox from "@/components/subscribe-box";
import CursorMesh from "@/components/cursor-mesh";
import usePrefersReducedMotion from "@/hooks/use-prefers-reduced-motion";

const HEADLINE = "The Daily AI Signal That Keeps You Ahead";
const WORDS = HEADLINE.split(" ");

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

function formatToday(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, -80]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);
  const prefersReducedMotion = usePrefersReducedMotion();

  const [todayLabel, setTodayLabel] = useState<string>("");
  useEffect(() => {
    setTodayLabel(formatToday());
  }, []);

  return (
    <motion.section
      ref={containerRef}
      style={{ opacity }}
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-cyan/10 via-transparent to-accent-purple/10 dark:from-accent-cyan/5 dark:to-accent-purple/5" />

        <div className="glow-orb absolute left-0 top-0 h-[500px] w-[500px] bg-accent-cyan/30 blur-[150px] dark:bg-accent-cyan/15" style={{ animationDelay: "0s" }} />
        <div className="glow-orb absolute bottom-0 right-0 h-[450px] w-[450px] bg-accent-purple/30 blur-[140px] dark:bg-accent-purple/15" style={{ animationDelay: "2.5s" }} />
        <div className="glow-orb absolute bottom-10 left-1/2 h-[400px] w-[400px] -translate-x-1/2 bg-accent-blue/25 blur-[120px] dark:bg-accent-blue/10" style={{ animationDelay: "5s" }} />

        <div className="gradient-mesh-bg absolute inset-0 opacity-30" />
      </div>

      <CursorMesh />

      <motion.div
        style={{ y }}
        className="relative z-10 flex max-w-5xl flex-col items-center text-center px-6 py-28 md:py-40"
      >
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
          className="mb-8 flex items-center gap-2 rounded-full border border-accent-cyan/40 bg-accent-cyan/10 px-5 py-2 backdrop-blur-xl"
        >
          <span className="relative flex h-2.5 w-2.5">
            <motion.span
              className="absolute inline-flex h-full w-full rounded-full bg-gradient-to-r from-accent-cyan to-accent-blue"
              animate={
                prefersReducedMotion
                  ? undefined
                  : { scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }
              }
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gradient-to-r from-accent-cyan to-accent-blue" />
          </span>
          <span className="text-xs font-semibold tracking-widest uppercase text-accent-cyan-light">
            Today&apos;s Edition{prefersReducedMotion || todayLabel ? ` • ${todayLabel || formatToday()}` : ""}
          </span>
        </motion.div>

        <h1 className="text-balance text-5xl font-extrabold tracking-tight md:text-7xl lg:text-8xl">
          <span className="sr-only">{HEADLINE}</span>
          <span aria-hidden="true" className="gradient-text-shimmer flex flex-wrap justify-center gap-x-[0.25em] gap-y-2">
            {WORDS.map((word, i) => (
              <motion.span
                key={`${word}-${i}`}
                className="inline-block"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 24, filter: "blur(8px)" }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.08, ease: EASE }}
              >
                {word}
              </motion.span>
            ))}
          </span>
        </h1>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, scaleX: 0 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.2 + WORDS.length * 0.08 + 0.1, ease: EASE }}
          className="mt-8 h-px w-[120px] origin-center bg-gradient-to-r from-transparent via-accent-cyan to-accent-purple animate-gradient-x"
        />

        <motion.p
          initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: EASE }}
          className="mt-6 max-w-2xl text-xl leading-relaxed text-slate-400 md:text-2xl"
        >
          Curated research, breaking industry updates, and architectural breakdowns delivered to your inbox every morning.
        </motion.p>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: EASE }}
          className="mt-10 w-full"
        >
          <SubscribeBox />
        </motion.div>
      </motion.div>
    </motion.section>
  );
}
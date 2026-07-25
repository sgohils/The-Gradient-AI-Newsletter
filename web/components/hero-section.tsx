"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { NewsletterIssue } from "@/types";
import usePrefersReducedMotion from "@/hooks/use-prefers-reduced-motion";

interface HeroSectionProps {
  latestIssue: NewsletterIssue;
}

export default function HeroSection({ latestIssue }: HeroSectionProps) {
  const [mounted, setMounted] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, -80]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dotVariants = prefersReducedMotion
    ? { animate: () => ({}) }
    : {
        animate: (i: number) => ({
          x: [0, 30 + i * 5, -20 + i * 3, 0],
          y: [0, -40 - i * 8, 20 + i * 4, 0],
          opacity: [0.3, 0.8, 0.5, 0.3],
          transition: {
            duration: 8 + i * 2,
            repeat: Infinity,
            ease: "easeInOut",
          },
        }),
      };

  return (
    <motion.section
      ref={containerRef}
      style={{ opacity }}
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/20 via-transparent to-accent-cyan/20 dark:from-accent-blue/10 dark:to-accent-emerald/10" />
        <div className="absolute left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-blue/30 blur-[120px] dark:bg-accent-blue/20" />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 translate-x-1/3 translate-y-1/3 rounded-full bg-accent-cyan/25 blur-[100px] dark:bg-accent-cyan/15" />
        <div className="absolute left-1/3 top-2/3 h-64 w-64 -translate-x-1/2 translate-y-1/4 rounded-full bg-accent-green/20 blur-[100px] dark:bg-accent-green/10" />
      </div>

      {mounted &&
        Array.from({ length: 28 }).map((_, i) => (
          <motion.div
            key={i}
            custom={i}
            variants={dotVariants}
            animate="animate"
            className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-accent-blue/60 dark:bg-accent-cyan/50"
            style={{
              left: `${(i * 37 + 13) % 100}%`,
              top: `${(i * 23 + 17) % 100}%`,
            }}
          />
        ))}

      <motion.div
        style={{ y }}
        className="relative z-10 flex max-w-4xl flex-col items-center text-center px-6"
      >
        <motion.h1
          initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? {} : { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-balance bg-gradient-to-r from-accent-blue via-accent-cyan to-accent-green bg-clip-text text-5xl font-bold tracking-tight text-transparent md:text-7xl dark:from-accent-cyan dark:via-accent-emerald dark:to-accent-green"
        >
          {latestIssue.title}
        </motion.h1>

        <motion.p
          initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? {} : { duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 md:text-xl dark:text-gray-300"
        >
          {latestIssue.intro}
        </motion.p>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? {} : { duration: 0.6, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <motion.div {...(prefersReducedMotion ? {} : { whileHover: { scale: 1.06 }, whileTap: { scale: 0.96 } })}>
            <Link
              href={`/archive/${latestIssue.date}`}
              className="inline-block rounded-full bg-gradient-to-r from-accent-blue to-accent-cyan px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-accent-blue/25 transition-shadow duration-300 hover:shadow-xl hover:shadow-accent-blue/40 dark:shadow-accent-blue/20"
            >
              Read Latest Issue
            </Link>
          </motion.div>
          <motion.div {...(prefersReducedMotion ? {} : { whileHover: { scale: 1.06 }, whileTap: { scale: 0.96 } })}>
            <Link
              href="/archive"
              className="inline-block rounded-full border border-gray-300 px-8 py-3.5 text-base font-semibold text-gray-700 transition-all duration-300 hover:border-accent-blue hover:text-accent-blue dark:border-gray-700 dark:text-gray-300 dark:hover:border-accent-cyan dark:hover:text-accent-cyan"
            >
              Browse Archive
            </Link>
          </motion.div>
        </motion.div>

        {latestIssue.tags.length > 0 && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={prefersReducedMotion ? {} : { duration: 0.6, delay: 0.7 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-2"
          >
            {latestIssue.tags.slice(0, 5).map((tag, index) => (
              <motion.span
                key={tag}
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={prefersReducedMotion ? {} : { duration: 0.4, delay: 0.8 + index * 0.07 }}
                className="rounded-full border border-glass-border bg-glass-highlight px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400"
              >
                {tag}
              </motion.span>
            ))}
          </motion.div>
        )}
      </motion.div>

      <motion.div
        animate={prefersReducedMotion ? {} : { y: [0, -12, 0] }}
        transition={prefersReducedMotion ? {} : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          className="text-gray-400 dark:text-gray-600"
        >
          <path
            d="M12 5v14M5 12l7 7 7-7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
    </motion.section>
  );
}

"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { NewsletterIssue } from "@/types";
import usePrefersReducedMotion from "@/hooks/use-prefers-reduced-motion";
import SubscribeBox from "@/components/subscribe-box";

interface HeroSectionProps {
  latestIssue: NewsletterIssue;
}

export default function HeroSection({ latestIssue }: HeroSectionProps) {
  const [mounted, setMounted] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, -100]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const meshVariants = prefersReducedMotion
    ? {}
    : {
        animate: {
          backgroundPosition: ["0% 0%", "100% 100%", "0% 100%", "0% 0%"],
          transition: {
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          },
        },
      };

  return (
    <motion.section
      ref={containerRef}
      style={{ opacity }}
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          {...meshVariants}
          animate={prefersReducedMotion ? undefined : "animate"}
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 20% 30%, rgba(79,124,255,0.12) 0%, transparent 60%),
              radial-gradient(ellipse 60% 50% at 80% 70%, rgba(91,77,255,0.08) 0%, transparent 55%),
              radial-gradient(ellipse 50% 40% at 50% 50%, rgba(51,214,255,0.06) 0%, transparent 50%),
              radial-gradient(ellipse 70% 50% at 60% 20%, rgba(79,124,255,0.06) 0%, transparent 50%)
            `,
            backgroundSize: "200% 200%",
          }}
        />
        <div className="absolute left-[15%] top-[20%] h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-blue/8 blur-[150px]" />
        <div className="absolute bottom-[10%] right-[20%] h-[400px] w-[400px] translate-x-1/3 translate-y-1/3 rounded-full bg-accent-cyan/6 blur-[130px]" />
        <div className="absolute left-[60%] top-[60%] h-[350px] w-[350px] -translate-x-1/2 translate-y-1/2 rounded-full bg-accent-indigo/6 blur-[120px]" />
      </div>

      {mounted &&
        Array.from({ length: 35 }).map((_, i) => (
          <motion.div
            key={i}
            className="pointer-events-none absolute h-1 w-1 rounded-full bg-accent-blue/40 dark:bg-accent-cyan/30"
            style={{
              left: `${(i * 31 + 17) % 100}%`,
              top: `${(i * 27 + 13) % 100}%`,
            }}
            {...(prefersReducedMotion
              ? {}
              : {
                  animate: {
                    opacity: [0.1, 0.6, 0.1],
                    scale: [0.8, 1.4, 0.8],
                  },
                  transition: {
                    duration: 4 + (i % 5),
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut",
                  },
                })}
          />
        ))}

      <motion.div
        style={{ y }}
        className="relative z-10 flex max-w-5xl flex-col items-center text-center px-6"
      >
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? {} : { duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-gray-400 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-cyan opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-cyan" />
            </span>
            AI-Powered Daily Newsletter
          </span>
        </motion.div>

        <motion.h1
          initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? {} : { duration: 0.9, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mt-8 text-balance bg-gradient-to-r from-accent-blue via-accent-indigo to-accent-cyan bg-clip-text text-5xl font-bold tracking-tight text-transparent md:text-7xl lg:text-[72px]"
        >
          {latestIssue.title}
        </motion.h1>

        <motion.p
          initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? {} : { duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 md:text-xl"
        >
          {latestIssue.intro}
        </motion.p>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? {} : { duration: 0.6, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <motion.div
            {...(prefersReducedMotion ? {} : { whileHover: { scale: 1.04 }, whileTap: { scale: 0.97 } })}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Link
              href={`/archive/${latestIssue.date}`}
              className="btn-primary"
            >
              Read Latest Issue
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </motion.div>
          <motion.div
            {...(prefersReducedMotion ? {} : { whileHover: { scale: 1.04 }, whileTap: { scale: 0.97 } })}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Link
              href="/archive"
              className="btn-secondary"
            >
              Browse Archive
            </Link>
          </motion.div>
        </motion.div>

        <SubscribeBox />

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
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-400 backdrop-blur-sm"
              >
                {tag}
              </motion.span>
            ))}
          </motion.div>
        )}
      </motion.div>

      <motion.div
        animate={prefersReducedMotion ? {} : { y: [0, -14, 0] }}
        transition={prefersReducedMotion ? {} : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          className="text-gray-500"
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
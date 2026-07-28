"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import usePrefersReducedMotion from "@/hooks/use-prefers-reduced-motion";

interface Stat {
  label: string;
  value: number;
  suffix?: string;
}

interface StatsBarProps {
  issues: {
    articles: { sourceName: string }[];
    tags: string[];
  }[];
}

function CountUp({ end, suffix = "", duration = 2 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!isInView || end === 0) return;
    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [isInView, end, duration]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

export default function StatsBar({ issues }: StatsBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const prefersReducedMotion = usePrefersReducedMotion();

  const totalArticles = issues.reduce((sum, issue) => sum + issue.articles.length, 0);
  const uniqueTags = new Set(issues.flatMap((issue) => issue.tags)).size;
  const uniqueSources = new Set(issues.flatMap((issue) => issue.articles.map((a) => a.sourceName))).size;

  const computedStats: Stat[] = [
    { label: "Issues Published", value: issues.length, suffix: "+" },
    { label: "Articles Shared", value: totalArticles, suffix: "" },
    { label: "Topics Covered", value: uniqueTags, suffix: "+" },
    { label: "Sources Tracked", value: uniqueSources, suffix: "" },
  ];

  return (
    <section ref={ref} className="relative z-10 -mt-20 w-full px-4 sm:px-6">
      <motion.div
        initial={prefersReducedMotion ? false : "hidden"}
        animate={prefersReducedMotion ? false : isInView ? "visible" : "hidden"}
        variants={prefersReducedMotion ? {} : {
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.12,
              delayChildren: 0.2,
            },
          },
        }}
        className="mx-auto flex max-w-5xl flex-wrap justify-center gap-4 md:gap-6"
      >
        {computedStats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={
              prefersReducedMotion
                ? {}
                : {
                    hidden: { opacity: 0, y: 30 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: {
                        duration: 0.6,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      },
                    },
                  }
            }
            className="flex min-w-[160px] flex-1 flex-col items-center rounded-2xl border border-glass-border bg-glass-highlight px-6 py-5 backdrop-blur-xl dark:bg-bento-surface/80 md:min-w-[200px]"
          >
            <span className="text-3xl font-bold bg-gradient-to-r from-accent-blue to-accent-cyan bg-clip-text text-transparent md:text-4xl dark:from-accent-cyan dark:to-accent-emerald">
              <CountUp end={stat.value} suffix={stat.suffix} />
            </span>
            <span className="mt-1 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {stat.label}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

  return (
    <section ref={ref} className="relative z-10 -mt-20 w-full px-4 sm:px-6">
      <motion.div
        initial={prefersReducedMotion ? false : "hidden"}
        animate={prefersReducedMotion ? false : isInView ? "visible" : "hidden"}
        variants={prefersReducedMotion ? {} : {
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.12,
              delayChildren: 0.2,
            },
          },
        }}
        className="mx-auto flex max-w-5xl flex-wrap justify-center gap-4 md:gap-6"
      >
        {computedStats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={
              prefersReducedMotion
                ? {}
                : {
                    hidden: { opacity: 0, y: 30 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: {
                        duration: 0.6,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      },
                    },
                  }
            }
            className="flex min-w-[160px] flex-1 flex-col items-center rounded-2xl border border-glass-border bg-glass-highlight px-6 py-5 backdrop-blur-xl dark:bg-bento-surface/80 md:min-w-[200px]"
          >
            <span className="text-3xl font-bold bg-gradient-to-r from-accent-blue to-accent-cyan bg-clip-text text-transparent md:text-4xl dark:from-accent-cyan dark:to-accent-emerald">
              <CountUp end={stat.value} suffix={stat.suffix} />
            </span>
            <span className="mt-1 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {stat.label}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import usePrefersReducedMotion from "@/hooks/use-prefers-reduced-motion";
import { mdToHtml } from "@/lib/markdown";

interface FeaturedCardProps {
  issue: {
    id: string;
    title: string;
    date: string;
    intro: string;
    tags: string[];
    featuredImageUrl?: string;
    articles: { id: string; title: string }[];
  };
}

export default function FeaturedCard({ issue }: FeaturedCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [200, 800], [40, -20]);
  const [mounted, setMounted] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section ref={cardRef} className="relative z-10 w-full px-4 sm:px-6 py-16 md:py-24">
      <motion.div style={{ y }} className="mx-auto max-w-5xl">
        <div className="group relative">
          <div className="absolute -inset-[2px] rounded-[28px] overflow-hidden opacity-70 transition-opacity duration-700 group-hover:opacity-100">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: mounted ? 1 : 0 }}
              transition={prefersReducedMotion ? {} : { duration: 0.8 }}
              className="absolute inset-0 gradient-border-spin"
            />
          </div>

          <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-bento-surface via-bento-surface-light to-bento-surface p-1 dark:from-bento-surface-dark dark:via-bento-surface-dark dark:to-bento-surface-darkest">
            <div className="flex flex-col gap-6 rounded-[24px] bg-bento-surface/80 backdrop-blur-xl dark:bg-bento-surface-dark/80 md:flex-row">
              <div className="relative h-64 w-full overflow-hidden md:h-auto md:w-2/5 md:min-h-[320px]">
                {issue.featuredImageUrl ? (
                  <Image
                    src={issue.featuredImageUrl}
                    alt={issue.title}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 40vw"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-blue/20 via-accent-cyan/20 to-accent-green/20 dark:from-accent-blue/10 dark:via-accent-cyan/10 dark:to-accent-emerald/10">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ y: [0, -6, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                            className="h-2 w-2 rounded-full bg-accent-blue dark:bg-accent-cyan"
                          />
                        ))}
                      </div>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Featured Edition
                      </span>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              </div>

              <div className="flex flex-1 flex-col justify-center p-6 md:p-8">
                <div className="mb-4 flex items-center gap-2">
                  <span className="rounded-full bg-accent-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-blue dark:bg-accent-cyan/10 dark:text-accent-cyan">
                    Featured
                  </span>
                  <time
                    dateTime={issue.date}
                    className="text-xs text-gray-500 dark:text-gray-400"
                  >
                    {new Date(issue.date + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                </div>

                <h2 className="text-2xl font-bold leading-tight text-gray-900 transition-colors duration-300 group-hover:text-accent-blue dark:text-white dark:group-hover:text-accent-emerald md:text-3xl">
                  {issue.title}
                </h2>

                <div
                  className="mt-3 line-clamp-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300"
                  dangerouslySetInnerHTML={{ __html: mdToHtml(issue.intro) }}
                />

                {issue.tags.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {issue.tags.slice(0, 4).map((tag, index) => (
                      <motion.span
                        key={tag}
                        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.8, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={
                          prefersReducedMotion
                            ? {}
                            : { duration: 0.4, delay: 0.3 + index * 0.08, ease: [0.34, 1.56, 0.64, 1] }
                        }
                        className="rounded-full bg-bento-surface-light px-3 py-1 text-xs font-medium text-accent-blue dark:bg-bento-surface-dark dark:text-accent-cyan"
                      >
                        {tag}
                      </motion.span>
                    ))}
                  </div>
                )}

                <div className="mt-6">
                  <Link
                    href={`/archive/${issue.date}`}
                    className="group/link inline-flex items-center gap-1.5 text-sm font-semibold text-accent-blue transition-colors duration-300 hover:text-accent-cyan dark:text-accent-cyan dark:hover:text-accent-emerald"
                  >
                    Read full issue
                    <svg
                      className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

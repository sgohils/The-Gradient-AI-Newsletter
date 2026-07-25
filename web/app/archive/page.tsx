"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { NewsletterIssue } from "@/types";
import ArticleCard from "@/components/article-card";
import ScrollReveal from "@/components/scroll-reveal";
import { motion } from "framer-motion";
import usePrefersReducedMotion from "@/hooks/use-prefers-reduced-motion";

const PAGE_SIZE = 9;

function ShimmerSearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="2"
      stroke="currentColor"
      className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400 dark:text-gray-500 transition-colors duration-200"
    >
      <circle cx="10.5" cy="10.5" r="7.5" />
      <path d="m15.5 15.5 5 5" strokeLinecap="round" />
    </svg>
  );
}

function EmptyStateIllustration({ prefersReducedMotion }: { prefersReducedMotion: boolean }) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      className="mb-6 h-32 w-32 text-accent-cyan dark:text-accent-emerald"
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={prefersReducedMotion ? {} : { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <defs>
        <linearGradient id="emptyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.6" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="90" r="55" fill="none" stroke="url(#emptyGrad)" strokeWidth="3" />
      <motion.circle
        cx="80"
        cy="72"
        r="8"
        fill="currentColor"
        opacity="0.3"
        animate={prefersReducedMotion ? {} : { cx: [80, 120, 80], cy: [72, 55, 72] }}
        transition={prefersReducedMotion ? {} : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="120"
        cy="108"
        r="6"
        fill="currentColor"
        opacity="0.2"
        animate={prefersReducedMotion ? {} : { cx: [120, 85, 120], cy: [108, 125, 108] }}
        transition={prefersReducedMotion ? {} : { duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="105"
        cy="130"
        r="5"
        fill="currentColor"
        opacity="0.15"
        animate={prefersReducedMotion ? {} : { cx: [105, 135, 80, 105], cy: [130, 100, 140, 130] }}
        transition={prefersReducedMotion ? {} : { duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <line x1="85" y1="85" x2="138" y2="138" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
    </motion.svg>
  );
}

export default function ArchivePage() {
  const [issues, setIssues] = useState<NewsletterIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    fetch("/api/issues")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data: NewsletterIssue[]) => {
        setIssues(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const uniqueDates = useMemo(() => {
    const dates = Array.from(new Set(issues.map((i) => i.date)));
    return dates.sort((a, b) => b.localeCompare(a));
  }, [issues]);

  const currentDateIndex = useMemo(
    () => (selectedDate ? uniqueDates.indexOf(selectedDate) : -1),
    [selectedDate, uniqueDates]
  );

  const filteredIssues = useMemo(() => {
    let result = issues;

    if (selectedDate) {
      result = result.filter((i) => i.date === selectedDate);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [issues, selectedDate, searchQuery]);

  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [searchQuery, selectedDate]);

  const paginatedIssues = filteredIssues.slice(0, displayCount);
  const hasMore = displayCount < filteredIssues.length;

  const totalArticles = useMemo(
    () => issues.reduce((sum, i) => sum + i.articles.length, 0),
    [issues]
  );

  const dateRange = useMemo(() => {
    if (uniqueDates.length === 0) return "N/A";
    return `${uniqueDates[uniqueDates.length - 1]} — ${uniqueDates[0]}`;
  }, [uniqueDates]);

  const latestDate = uniqueDates[0] || "N/A";

  const goToPrevDay = useCallback(() => {
    if (currentDateIndex < uniqueDates.length - 1) {
      setSelectedDate(uniqueDates[currentDateIndex + 1]);
    }
  }, [currentDateIndex, uniqueDates]);

  const goToNextDay = useCallback(() => {
    if (currentDateIndex > 0) {
      setSelectedDate(uniqueDates[currentDateIndex - 1]);
    }
  }, [currentDateIndex, uniqueDates]);

  const clearDateFilter = useCallback(() => {
    setSelectedDate(null);
  }, []);

  const skeletonCards = Array.from({ length: PAGE_SIZE });

  const statsItems = loading
    ? []
    : [
        { label: "Total Issues", value: issues.length.toString(), colorClass: "text-accent-blue dark:text-accent-emerald" },
        { label: "Total Articles", value: totalArticles.toString(), colorClass: "text-accent-cyan dark:text-accent-emerald" },
        { label: "Date Range", value: dateRange, colorClass: "text-accent-green dark:text-accent-emerald" },
        { label: "Latest Issue", value: latestDate, colorClass: "text-accent-emerald dark:text-accent-emerald" },
      ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Archive
        </h1>
        <motion.div
          className="mt-3 h-1 rounded-full bg-gradient-to-r from-accent-blue via-accent-cyan to-accent-green"
          initial={prefersReducedMotion ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={prefersReducedMotion ? {} : { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ transformOrigin: "left" }}
        />
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Browse all past issues of The Gradient
        </p>
      </div>

      {!loading && issues.length > 0 && (
        <ScrollReveal className="mb-8" delay={0.1}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {statsItems.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  prefersReducedMotion
                    ? {}
                    : { duration: 0.5, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }
                }
                className="relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white/70 p-4 backdrop-blur-sm
                  dark:border-bento-surface-light/40 dark:bg-bento-surface/60 dark:backdrop-blur-md
                  hover:border-accent-blue/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.12)]
                  dark:hover:border-accent-cyan/30 dark:hover:shadow-[0_0_20px_rgba(6,182,212,0.08)]
                  transition-all duration-300"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 to-transparent dark:from-bento-surface-light/10 dark:to-transparent" />
                <p className="relative text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {stat.label}
                </p>
                <p className={`relative mt-1 text-lg font-bold text-gray-900 dark:text-white`}>
                  <span className={stat.colorClass}>{stat.value}</span>
                </p>
              </motion.div>
            ))}
          </div>
        </ScrollReveal>
      )}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <ShimmerSearchIcon />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or tags..."
            className="w-full rounded-full border border-gray-300 bg-white px-4 py-2.5 pl-10 text-sm text-gray-900 placeholder-gray-400
              transition-all duration-200
              focus:border-accent-blue focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none focus:ring-0
              dark:border-gray-700 dark:bg-bento-surface dark:text-white dark:placeholder-gray-500
              dark:focus:border-accent-cyan dark:focus:shadow-[0_0_0_3px_rgba(6,182,212,0.1)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              Clear
            </button>
          )}
        </div>

        {!loading && uniqueDates.length > 0 && (
          <motion.div className="flex items-center gap-2">
            <motion.button
              onClick={goToPrevDay}
              disabled={currentDateIndex >= uniqueDates.length - 1}
              {...(prefersReducedMotion ? {} : { whileHover: { scale: currentDateIndex >= uniqueDates.length - 1 ? 1 : 1.06 }, whileTap: { scale: currentDateIndex >= uniqueDates.length - 1 ? 1 : 0.96 } })}
              className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700
                transition-colors hover:border-accent-blue hover:text-accent-blue
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:text-gray-700
                dark:border-gray-700 dark:bg-bento-surface dark:text-gray-300
                dark:hover:border-accent-cyan dark:hover:text-accent-cyan
                dark:disabled:hover:border-gray-700 dark:disabled:hover:text-gray-300"
            >
              Prev
            </motion.button>
            {selectedDate ? (
              <motion.button
                onClick={clearDateFilter}
                {...(prefersReducedMotion ? {} : { whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 } })}
                className="shimmer-sweep rounded-full border border-accent-blue/30 bg-white px-4 py-2 text-sm font-medium text-accent-blue
                  dark:border-accent-cyan/20 dark:bg-bento-surface dark:text-accent-cyan"
              >
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                <span className="ml-1.5 opacity-60">×</span>
              </motion.button>
            ) : (
              <span className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-500
                dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-400">
                All Days
              </span>
            )}
            <motion.button
              onClick={goToNextDay}
              disabled={currentDateIndex <= 0}
              {...(prefersReducedMotion ? {} : { whileHover: { scale: currentDateIndex <= 0 ? 1 : 1.06 }, whileTap: { scale: currentDateIndex <= 0 ? 1 : 0.96 } })}
              className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700
                transition-colors hover:border-accent-blue hover:text-accent-blue
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:text-gray-700
                dark:border-gray-700 dark:bg-bento-surface dark:text-gray-300
                dark:hover:border-accent-cyan dark:hover:text-accent-cyan
                dark:disabled:hover:border-gray-700 dark:disabled:hover:text-gray-300"
            >
              Next
            </motion.button>
          </motion.div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {skeletonCards.map((_, i) => (
            <div
              key={i}
              className="shimmer-sweep rounded-2xl border border-gray-200/60 bg-white/60 p-6
                dark:border-bento-surface-light/30 dark:bg-bento-surface/50"
            >
              <div className="mb-4 h-40 rounded-xl bg-gray-200/70 dark:bg-gray-700/40" />
              <div className="mb-3 h-3 w-24 rounded bg-gray-200/70 dark:bg-gray-700/40" />
              <div className="mb-2 h-5 w-3/4 rounded bg-gray-200/70 dark:bg-gray-700/40" />
              <div className="mb-4 h-4 w-full rounded bg-gray-200/70 dark:bg-gray-700/40" />
              <div className="flex gap-2">
                <div className="h-5 w-16 rounded-full bg-gray-200/70 dark:bg-gray-700/40" />
                <div className="h-5 w-20 rounded-full bg-gray-200/70 dark:bg-gray-700/40" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredIssues.length === 0 ? (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <EmptyStateIllustration prefersReducedMotion={prefersReducedMotion} />
          <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            No issues found
          </h3>
          <p className="max-w-md text-sm text-gray-600 dark:text-gray-400">
            {searchQuery
              ? `We couldn't find any issues matching "${searchQuery}". Try adjusting your search.`
              : selectedDate
              ? `There are no issues for this date.`
              : "There are no issues in the archive yet."}
          </p>
          {(searchQuery || selectedDate) && (
            <motion.button
              onClick={() => {
                setSearchQuery("");
                setSelectedDate(null);
              }}
              {...(prefersReducedMotion ? {} : { whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 } })}
              className="shimmer-sweep mt-4 rounded-full bg-accent-blue px-6 py-2.5 text-sm font-medium text-white
                transition-colors hover:bg-accent-blue/90 dark:bg-accent-cyan dark:text-gray-900 dark:hover:bg-accent-cyan/90"
            >
              Clear all filters
            </motion.button>
          )}
        </motion.div>
      ) : (
        <>
          <motion.div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {paginatedIssues.map((issue, i) => (
              <motion.div
                key={issue.date + issue.id}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={
                  prefersReducedMotion
                    ? {}
                    : { duration: 0.5, delay: i * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }
                }
              >
                <ArticleCard issue={issue} />
              </motion.div>
            ))}
          </motion.div>

          {hasMore && (
            <div className="mt-10 flex justify-center">
              <motion.button
                onClick={() => setDisplayCount((c) => c + PAGE_SIZE)}
                {...(prefersReducedMotion ? {} : { whileHover: { scale: 1.04 }, whileTap: { scale: 0.96 } })}
                className="rounded-full border border-gray-300 bg-white px-8 py-3 text-sm font-semibold text-gray-700
                  transition-all hover:border-accent-blue hover:text-accent-blue
                  dark:border-gray-700 dark:bg-bento-surface dark:text-gray-300
                  dark:hover:border-accent-cyan dark:hover:text-accent-cyan"
              >
                Load More ({filteredIssues.length - displayCount} remaining)
              </motion.button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

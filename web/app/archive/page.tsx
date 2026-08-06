"use client";

import Image from "next/image";

import { useState, useEffect, useMemo, useCallback } from "react";
import { NewsletterIssue } from "@/types";
import ArticleCard from "@/components/article-card";
import ScrollReveal from "@/components/scroll-reveal";
import { motion } from "framer-motion";
import usePrefersReducedMotion from "@/hooks/use-prefers-reduced-motion";

const PAGE_SIZE = 9;

const CATEGORIES = [
  { label: "All", value: "" },
  { label: "Company Blog", value: "Company Blog" },
  { label: "Research", value: "Research" },
  { label: "Product", value: "Product" },
  { label: "Engineering", value: "Engineering" },
];

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="2"
      stroke="currentColor"
      className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 transition-colors duration-200"
    >
      <circle cx="10.5" cy="10.5" r="7.5" />
      <path d="m15.5 15.5 5 5" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="2"
      stroke="currentColor"
      className="h-4 w-4"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
    </svg>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 h-16 w-16 rounded-full bg-accent-blue/10 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-8 w-8 text-accent-blue">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
      </div>
      <h3 className="mb-2 text-xl font-semibold text-gray-200">No issues found</h3>
      <p className="max-w-md text-sm text-gray-400">
        Try adjusting your search or filter to find what you're looking for.
      </p>
    </div>
  );
}

export default function ArchivePage() {
  const [issues, setIssues] = useState<NewsletterIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
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

  const filteredIssues = useMemo(() => {
    let result = issues;

    if (selectedDate) {
      result = result.filter((i) => i.date === selectedDate);
    }

    if (selectedCategory) {
      result = result.filter((i) => i.tags.includes(selectedCategory));
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
  }, [issues, selectedDate, selectedCategory, searchQuery]);

  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [searchQuery, selectedCategory, selectedDate]);

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

  const clearDateFilter = useCallback(() => {
    setSelectedDate(null);
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedDate(null);
  }, []);

  const hasActiveFilters = searchQuery || selectedCategory || selectedDate;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <ScrollReveal direction="up" className="mb-12">
        <div className="mb-10 flex items-start gap-6">
          <Image
            src="/images/gradient horizontal logo.png"
            alt="The Gradient Logo"
            width={48}
            height={48}
            className="rounded-xl mt-1 shrink-0"
          />
          <div>
            <h1 className="text-4xl font-bold text-gray-100 sm:text-5xl">
              Newsletter Archive
            </h1>
            <motion.div
              className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-accent-blue via-accent-indigo to-accent-cyan"
              initial={prefersReducedMotion ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={prefersReducedMotion ? {} : { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ transformOrigin: "left" }}
            />
            <p className="mt-3 text-gray-400">
              Browse all past issues of The Gradient
            </p>
          </div>
        </div>
      </ScrollReveal>

      {!loading && issues.length > 0 && (
        <ScrollReveal className="mb-10" delay={0.1}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Total Issues", value: issues.length.toString(), colorClass: "text-accent-blue" },
              { label: "Total Articles", value: totalArticles.toString(), colorClass: "text-accent-cyan" },
              { label: "Date Range", value: dateRange, colorClass: "text-gray-300" },
              { label: "Latest Issue", value: latestDate, colorClass: "text-accent-blue" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  prefersReducedMotion
                    ? {}
                    : { duration: 0.5, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }
                }
                className="rounded-2xl border border-white/[0.06] bg-bg-card/60 backdrop-blur-sm p-5 transition-all duration-300 hover:border-accent-blue/20 hover:shadow-[0_0_30px_-10px_rgba(79,124,255,0.15)]"
              >
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  {stat.label}
                </p>
                <p className={`mt-1 text-lg font-bold text-gray-100`}>
                  <span className={stat.colorClass}>{stat.value}</span>
                </p>
              </motion.div>
            ))}
          </div>
        </ScrollReveal>
      )}

      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <SearchIcon />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or tags..."
            className="input-field-light dark:input-field"
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

        <div className="flex items-center gap-2">
          <FilterIcon />
          <span className="text-xs text-gray-500">Filters</span>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <motion.button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            {...(prefersReducedMotion ? {} : { whileHover: { scale: 1.04 }, whileTap: { scale: 0.96 } })}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
              selectedCategory === cat.value
                ? "bg-gradient-to-r from-accent-blue to-accent-cyan text-white shadow-lg shadow-accent-blue/20"
                : "border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            {cat.label}
          </motion.button>
        ))}
      </div>

      {selectedDate && (
        <div className="mb-6 flex items-center gap-3">
          <motion.button
            onClick={clearDateFilter}
            {...(prefersReducedMotion ? {} : { whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 } })}
            className="inline-flex items-center gap-1.5 rounded-full border border-accent-blue/30 bg-accent-blue/10 px-4 py-2 text-xs font-semibold text-accent-blue transition-colors hover:bg-accent-blue/20"
          >
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            <span>×</span>
          </motion.button>
          {hasActiveFilters && (
            <motion.button
              onClick={clearAllFilters}
              {...(prefersReducedMotion ? {} : { whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 } })}
              className="text-xs text-gray-500 underline transition-colors hover:text-gray-300"
            >
              Clear all filters
            </motion.button>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/[0.06] bg-bg-card/40 p-6"
            >
              <div className="mb-4 h-40 rounded-xl bg-white/5" />
              <div className="mb-3 h-3 w-24 rounded bg-white/5" />
              <div className="mb-2 h-5 w-3/4 rounded bg-white/5" />
              <div className="mb-4 h-4 w-full rounded bg-white/5" />
              <div className="flex gap-2">
                <div className="h-5 w-16 rounded-full bg-white/5" />
                <div className="h-5 w-20 rounded-full bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredIssues.length === 0 ? (
        <EmptyState />
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
            <div className="mt-12 flex justify-center">
              <motion.button
                onClick={() => setDisplayCount((c) => c + PAGE_SIZE)}
                {...(prefersReducedMotion ? {} : { whileHover: { scale: 1.04 }, whileTap: { scale: 0.96 } })}
                className="btn-secondary"
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
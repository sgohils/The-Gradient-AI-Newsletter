"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { NewsletterIssue } from "@/types";
import usePrefersReducedMotion from "@/hooks/use-prefers-reduced-motion";
import { mdToHtml } from "@/lib/posts";

interface ArticleCardProps {
  issue: NewsletterIssue;
}

export default function ArticleCard({ issue }: ArticleCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const formattedDate = new Date(issue.date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const articleCount = issue.articles.length;

  return (
    <Link
      href={`/archive/${issue.date}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-500 hover:border-transparent hover:shadow-[0_20px_50px_-12px_rgba(59,130,246,0.25)] dark:border-gray-800 dark:bg-bento-surface dark:hover:border-bento-surface-light dark:hover:shadow-[0_20px_50px_-12px_rgba(59,130,246,0.15)]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute inset-x-0 top-0 h-[2px] -translate-y-full bg-gradient-to-r from-accent-blue via-accent-cyan to-accent-green transition-transform duration-500 ease-out group-hover:translate-y-0" />

      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-bento-surface-light/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full dark:via-bento-surface-light/10" />

      {issue.featuredImageUrl && (
        <div className="relative mb-4 h-40 w-full overflow-hidden rounded-xl">
          <Image
            src={issue.featuredImageUrl}
            alt={issue.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <time
          dateTime={issue.date}
          className="text-xs font-medium uppercase tracking-wider text-gray-500 transition-colors duration-300 group-hover:text-accent-cyan dark:text-gray-400 dark:group-hover:text-accent-emerald"
        >
          {formattedDate}
        </time>
        <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
        <span className="text-xs text-gray-500 transition-colors duration-300 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300">
          {articleCount} {articleCount === 1 ? "article" : "articles"}
        </span>
      </div>

      <h3 className="mb-2 text-lg font-semibold leading-snug text-gray-900 transition-colors duration-300 group-hover:text-accent-blue dark:text-white dark:group-hover:text-accent-emerald">
        {issue.title}
      </h3>

      {issue.intro && (
        <div
          className="mb-4 line-clamp-2 text-sm leading-relaxed text-gray-600 transition-colors duration-300 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300"
          dangerouslySetInnerHTML={{ __html: mdToHtml(issue.intro) }}
        />
      )}

      {issue.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {issue.tags.slice(0, 4).map((tag, index) => (
            <motion.span
              key={tag}
              initial={{ scale: 1, y: 0 }}
              animate={
                prefersReducedMotion
                  ? { scale: 1, y: 0 }
                  : isHovered
                    ? { scale: [1, 1.08, 1], y: [0, -2, 0] }
                    : { scale: 1, y: 0 }
              }
              transition={
                prefersReducedMotion
                  ? {}
                  : { duration: 0.4, delay: index * 0.05, ease: [0.34, 1.56, 0.64, 1] }
              }
              className="rounded-full bg-bento-surface-light px-2.5 py-0.5 text-xs font-medium text-accent-blue dark:bg-bento-surface-dark dark:text-accent-cyan"
            >
              {tag}
            </motion.span>
          ))}
        </div>
      )}
    </Link>
  );
}

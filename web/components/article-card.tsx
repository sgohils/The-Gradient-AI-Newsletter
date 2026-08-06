"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { NewsletterIssue } from "@/types";
import usePrefersReducedMotion from "@/hooks/use-prefers-reduced-motion";
import { mdToHtml } from "@/lib/markdown";

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
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-bg-card/60 backdrop-blur-sm transition-all duration-500 hover:border-accent-blue/20 hover:shadow-[0_20px_60px_-15px_rgba(79,124,255,0.2)] hover:-translate-y-0.5 dark:hover:border-accent-cyan/20 dark:hover:shadow-[0_20px_60px_-15px_rgba(51,214,255,0.15)]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute inset-x-0 top-0 h-[2px] -translate-y-full bg-gradient-to-r from-accent-blue via-accent-indigo to-accent-cyan transition-transform duration-500 ease-out group-hover:translate-y-0" />

      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.03] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />

      {issue.featuredImageUrl && (
        <div className="relative mb-4 h-44 w-full overflow-hidden rounded-xl">
          <Image
            src={issue.featuredImageUrl}
            alt={issue.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center gap-3 flex-wrap">
          <Image
            src="/images/gradient icon.png"
            alt="The Gradient"
            width={24}
            height={24}
            className="rounded"
          />
          <time
            dateTime={issue.date}
            className="text-xs font-medium uppercase tracking-wider text-gray-500 transition-colors duration-300 group-hover:text-accent-cyan"
          >
            {formattedDate}
          </time>
          <span className="text-xs text-gray-600 dark:text-gray-600">•</span>
          <span className="text-xs text-gray-500 transition-colors duration-300 group-hover:text-gray-300">
            {articleCount} {articleCount === 1 ? "article" : "articles"}
          </span>
        </div>

        <h3 className="mb-3 text-lg font-semibold leading-snug text-gray-100 transition-colors duration-300 group-hover:text-white">
          {issue.title}
        </h3>

        {issue.intro && (
          <div
            className="mb-4 line-clamp-2 text-sm leading-relaxed text-gray-500 transition-colors duration-300 group-hover:text-gray-300"
            dangerouslySetInnerHTML={{ __html: mdToHtml(issue.intro) }}
          />
        )}

        {issue.tags.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1.5">
            {issue.tags.slice(0, 3).map((tag, index) => (
              <motion.span
                key={tag}
                initial={prefersReducedMotion ? false : { scale: 1 }}
                animate={
                  prefersReducedMotion
                    ? { scale: 1 }
                    : isHovered
                      ? { scale: [1, 1.05, 1] }
                      : { scale: 1 }
                }
                transition={
                  prefersReducedMotion
                    ? {}
                    : { duration: 0.3, delay: index * 0.04 }
                }
                className="rounded-full bg-accent-blue/10 px-2.5 py-0.5 text-xs font-medium text-accent-blue dark:bg-accent-cyan/10 dark:text-accent-cyan"
              >
                {tag}
              </motion.span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
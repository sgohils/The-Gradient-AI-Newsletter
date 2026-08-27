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
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const prefersReducedMotion = usePrefersReducedMotion();

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;
    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
    setIsHovered(false);
  };

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
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all duration-500 hover:border-accent-cyan/20"
      style={{
        transform: prefersReducedMotion ? undefined : `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
      }}
    >
      <div
        className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: isHovered
            ? "linear-gradient(135deg, rgba(34,211,238,0.12), rgba(139,92,246,0.12))"
            : "transparent",
        }}
      />

      <div className="absolute inset-x-0 top-0 h-[2px] -translate-y-full bg-gradient-to-r from-accent-cyan via-accent-blue to-accent-purple transition-transform duration-500 ease-out group-hover:translate-y-0" />

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
          className="text-xs font-medium uppercase tracking-wider text-slate-500 transition-colors duration-300 group-hover:text-accent-cyan-light dark:text-slate-400 dark:group-hover:text-accent-cyan-light"
        >
          {formattedDate}
        </time>
        <span className="text-xs text-slate-600 dark:text-slate-600">•</span>
        <span className="text-xs text-slate-500 transition-colors duration-300 group-hover:text-slate-300 dark:text-slate-400 dark:group-hover:text-slate-300">
          {articleCount} {articleCount === 1 ? "article" : "articles"}
        </span>
      </div>

      <h3 className="mb-2 text-lg font-semibold leading-snug text-gray-900 transition-colors duration-300 dark:text-white group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-accent-cyan group-hover:via-accent-blue group-hover:to-accent-purple group-hover:text-transparent">
        {issue.title}
      </h3>

      {issue.intro && (
        <div
          className="mb-4 line-clamp-2 text-sm leading-relaxed text-gray-600 transition-colors duration-300 group-hover:text-gray-300 dark:text-gray-400 dark:group-hover:text-gray-300"
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
              className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-accent-cyan-light transition-colors duration-300 group-hover:bg-accent-cyan/10"
            >
              {tag}
            </motion.span>
          ))}
        </div>
      )}
    </Link>
  );
}
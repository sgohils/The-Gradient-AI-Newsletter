"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function ShareButtons({ issue }: { issue: { date: string; title: string } }) {
  const [copied, setCopied] = useState(false);
  const url = `/archive/${issue.date}`;
  const title = issue.title;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
  const linkedinHref = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;

  return (
    <div className="mt-16 rounded-2xl border border-white/[0.06] bg-bg-card/40 backdrop-blur-sm p-6">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
        Share this issue
      </h3>
      <div className="flex items-center gap-3">
        <a
          href={twitterHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.06] bg-white/5 text-gray-400 transition-all duration-300 hover:border-accent-blue/30 hover:bg-accent-blue/10 hover:text-accent-blue"
          aria-label="Share on Twitter"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
        <a
          href={linkedinHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.06] bg-white/5 text-gray-400 transition-all duration-300 hover:border-accent-blue/30 hover:bg-accent-blue/10 hover:text-accent-blue"
          aria-label="Share on LinkedIn"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        </a>
        <button
          onClick={handleCopy}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.06] bg-white/5 text-gray-400 transition-all duration-300 hover:border-accent-blue/30 hover:bg-accent-blue/10 hover:text-accent-blue"
          aria-label="Copy link"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>
        {copied && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-green-400"
          >
            Link copied!
          </motion.span>
        )}
      </div>
    </div>
  );
}
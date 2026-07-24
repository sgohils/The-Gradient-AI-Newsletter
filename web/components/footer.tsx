"use client";

import { motion } from "framer-motion";
import usePrefersReducedMotion from "@/hooks/use-prefers-reduced-motion";

export default function Footer() {
  const prefersReducedMotion = usePrefersReducedMotion();
  return (
    <footer className="relative bg-bento-surface-light dark:bg-bento-surface">
      <div className="absolute inset-x-0 top-0 h-px overflow-hidden">
        <div className="shimmer-sweep h-full w-full" />
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              The Gradient
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-500">
              – AI insights, delivered daily.
            </span>
          </div>
          <motion.p
            className="text-sm text-gray-500 dark:text-gray-500"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? {} : { delay: 0.3, duration: 0.5, ease: "easeOut" }}
          >
            © {new Date().getFullYear()} The Gradient. All rights reserved.
          </motion.p>
        </div>
      </div>
    </footer>
  );
}

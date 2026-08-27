"use client";

import { motion } from "framer-motion";
import usePrefersReducedMotion from "@/hooks/use-prefers-reduced-motion";
import Image from "next/image";

export default function Footer() {
  const prefersReducedMotion = usePrefersReducedMotion();
  return (
    <footer className="relative border-t border-white/10 bg-[#090D16]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-px left-0 right-0 mx-auto h-px max-w-7xl bg-gradient-to-r from-transparent via-accent-purple/40 to-transparent"
      />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="relative h-6 w-6">
              <Image
                src="/images/gradient-icon.png"
                alt="Gradient"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-sm font-bold tracking-tight text-white">
              Gradient News
            </span>
            <span className="text-sm text-slate-500">
              – <span className="text-accent-cyan-light">AI</span> insights, delivered daily.
            </span>
          </div>
          <motion.div
            className="flex items-center gap-4 text-sm text-slate-500"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? {} : { delay: 0.3, duration: 0.5, ease: "easeOut" }}
          >
            <p>© {new Date().getFullYear()} The Gradient. All rights reserved.</p>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
                }
              }}
              className="inline-flex items-center gap-1 text-xs text-slate-500 transition-colors duration-200 hover:text-accent-cyan-light"
              aria-label="Back to top"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 19V5" />
                <path d="m5 12 7-7 7 7" />
              </svg>
              Back to top
            </button>
          </motion.div>
        </div>
      </div>
    </footer>
  );
}

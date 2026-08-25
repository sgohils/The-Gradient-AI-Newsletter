"use client";

import { motion } from "framer-motion";
import usePrefersReducedMotion from "@/hooks/use-prefers-reduced-motion";
import Image from "next/image";

export default function Footer() {
  const prefersReducedMotion = usePrefersReducedMotion();
  return (
    <footer className="relative border-t border-white/10 bg-[#090D16]">
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
              – AI insights, delivered daily.
            </span>
          </div>
          <motion.p
            className="text-sm text-slate-500"
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

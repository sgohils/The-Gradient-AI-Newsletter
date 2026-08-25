"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import SubscribeBox from "@/components/subscribe-box";
import CursorMesh from "@/components/cursor-mesh";

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, -80]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);

  return (
    <motion.section
      ref={containerRef}
      style={{ opacity }}
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00F2FE]/10 via-transparent to-[#0072FF]/10 dark:from-[#00F2FE]/5 dark:to-[#0072FF]/5" />
        <div className="absolute left-1/4 top-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00F2FE]/20 blur-[150px] dark:bg-[#00F2FE]/10" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] translate-x-1/3 translate-y-1/3 rounded-full bg-[#0072FF]/25 blur-[120px] dark:bg-[#0072FF]/15" />
      </div>

      <CursorMesh />

      <motion.div
        style={{ y }}
        className="relative z-10 flex max-w-5xl flex-col items-center text-center px-6 py-28 md:py-40"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-8 flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-950/40 px-5 py-2 backdrop-blur-xl"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300" />
          </span>
          <span className="text-xs font-semibold tracking-widest uppercase text-cyan-300">
            Today&apos;s Edition &bull; August 24, 2026
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-balance bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent md:text-7xl lg:text-8xl"
        >
          The Daily AI Signal That Keeps You Ahead
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mt-6 max-w-2xl text-xl leading-relaxed text-slate-400 md:text-2xl"
        >
          Curated research, breaking industry updates, and architectural breakdowns delivered to your inbox every morning.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mt-10 w-full"
        >
          <SubscribeBox />
        </motion.div>
      </motion.div>
    </motion.section>
  );
}

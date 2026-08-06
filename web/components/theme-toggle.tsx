"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import usePrefersReducedMotion from "@/hooks/use-prefers-reduced-motion";

const iconVariants = {
  initial: { scale: 0.5, opacity: 0, rotate: -90 },
  animate: { scale: 1, opacity: 1, rotate: 0, transition: { duration: 0.3 } },
  exit: { scale: 0.5, opacity: 0, rotate: 90, transition: { duration: 0.2 } },
};

const noMotionVariants = {
  initial: { scale: 1, opacity: 1, rotate: 0 },
  animate: { scale: 1, opacity: 1, rotate: 0, transition: { duration: 0 } },
  exit: { scale: 1, opacity: 1, rotate: 0, transition: { duration: 0 } },
};

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const reducedMotionVariants = prefersReducedMotion ? noMotionVariants : iconVariants;

  return (
    <motion.button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
      {...(prefersReducedMotion ? {} : { whileHover: { scale: 1.1 }, whileTap: { scale: 0.9 } })}
      aria-label="Toggle theme"
    >
      <span className="sr-only">Toggle theme</span>
      {mounted && (
        <motion.div className="relative" layout>
          {theme === "dark" ? (
            <motion.svg
              key="moon"
              variants={reducedMotionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-accent-cyan"
            >
              <path d="M12 3a6 6 0 0 0 9 9 6 6 0 1 1-9-9Z" />
            </motion.svg>
          ) : (
            <motion.svg
              key="sun"
              variants={reducedMotionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-amber-400"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </motion.svg>
          )}
        </motion.div>
      )}
    </motion.button>
  );
}
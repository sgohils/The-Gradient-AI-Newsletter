"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import ThemeToggle from "@/components/theme-toggle";
import usePrefersReducedMotion from "@/hooks/use-prefers-reduced-motion";

const navLinkVariants = {
  hidden: { opacity: 0, y: -8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, type: "spring", stiffness: 300, damping: 24 },
  }),
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/archive", label: "Archive" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return false;
    return typeof window !== "undefined" && window.location.pathname.startsWith(href);
  };

  return (
    <nav
      className={`sticky top-0 z-50 w-full border-b backdrop-blur-xl transition-all duration-300 ${
        scrolled
          ? "border-bento-surface-dark/30 bg-bento-surface/80 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:border-bento-surface-darkest/30 dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
          : "border-gray-200 bg-white/80 dark:border-gray-800 dark:bg-gray-950/80"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="shimmer-sweep text-xl font-bold tracking-tight text-gray-900 dark:text-white"
        >
          The Gradient
        </Link>

        <div className="hidden items-center md:flex md:gap-1">
          {navLinks.map(({ href, label }) => (
            <motion.div
              key={href}
              custom={0}
              variants={prefersReducedMotion ? {} : navLinkVariants}
              initial={prefersReducedMotion ? undefined : "hidden"}
              animate={prefersReducedMotion ? undefined : "visible"}
              exit={prefersReducedMotion ? undefined : "exit"}
            >
              <Link
                href={href}
                className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  isActive(href)
                    ? "text-accent-blue dark:text-accent-cyan"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                }`}
              >
                {label}
                {isActive(href) && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute -bottom-0.5 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-accent-blue to-accent-cyan dark:from-accent-cyan dark:to-accent-emerald"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            </motion.div>
          ))}
          <div className="ml-1">
            <ThemeToggle />
          </div>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <motion.button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            {...(prefersReducedMotion ? {} : { whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 } })}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <AnimatePresence mode="wait" initial={false}>
                {mobileMenuOpen ? (
                  <motion.g
                    key="close"
                    initial={prefersReducedMotion ? undefined : { opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, rotate: 90 }}
                    transition={prefersReducedMotion ? {} : { duration: 0.2 }}
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </motion.g>
                ) : (
                  <motion.g
                    key="open"
                    initial={prefersReducedMotion ? undefined : { opacity: 0, rotate: 90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, rotate: -90 }}
                    transition={prefersReducedMotion ? {} : { duration: 0.2 }}
                  >
                    <path d="M3 12h18" />
                    <path d="M3 6h18" />
                    <path d="M3 18h18" />
                  </motion.g>
                )}
              </AnimatePresence>
            </svg>
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
            transition={prefersReducedMotion ? {} : { duration: 0.25, ease: "easeInOut" }}
            className={`overflow-hidden md:hidden ${
              scrolled
                ? "border-t border-bento-surface-dark/30 dark:border-bento-surface-darkest/30"
                : "border-t border-gray-200 dark:border-gray-800"
            }`}
          >
            <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
              {navLinks.map(({ href, label }, i) => (
                <motion.div
                  key={href}
                  custom={i}
                  variants={prefersReducedMotion ? {} : navLinkVariants}
                  initial={prefersReducedMotion ? undefined : "hidden"}
                  animate={prefersReducedMotion ? undefined : "visible"}
                  exit={prefersReducedMotion ? undefined : "exit"}
                >
                   <Link
                     href={href}
                     onClick={() => setMobileMenuOpen(false)}
                     className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-accent-blue dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-accent-cyan"
                   >
                     {label}
                   </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

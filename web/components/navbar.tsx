"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
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
  const prefersReducedMotion = usePrefersReducedMotion();

  const navLinks = [
    { href: "/archive", label: "Archive" },
    { href: "/topics", label: "Topics" },
    { href: "/about", label: "About" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return false;
    return typeof window !== "undefined" && window.location.pathname.startsWith(href);
  };

  return (
    <>
      <nav className="sticky top-6 z-50 px-4 sm:px-6">
        <div
          aria-hidden="true"
          className="h-px w-full bg-gradient-to-r from-transparent via-accent-cyan to-accent-purple animate-gradient-x"
        />
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? {} : { type: "spring", stiffness: 200, damping: 25 }}
          className="relative mx-auto max-w-5xl rounded-full border border-white/10 bg-[#090D16]/80 shadow-2xl backdrop-blur-2xl transition-all duration-300 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-gradient-to-r before:from-accent-cyan/5 before:via-transparent before:to-accent-purple/5"
        >
          <div className="flex h-14 items-center justify-between px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <div className="relative h-8 w-8">
                <Image
                  src="/images/gradient-icon.png"
                  alt="Gradient"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="hidden sm:block text-lg font-extrabold tracking-tight text-gray-900 transition-transform duration-300 hover:scale-105 dark:text-white">
                Gradient News
              </span>
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
                    className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
                      isActive(href)
                        ? "text-accent-cyan-light"
                        : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                    }`}
                  >
                    {label}
                    {isActive(href) && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute -bottom-0.5 left-3 right-3 h-0.5 rounded-full bg-gradient-to-r from-accent-cyan via-accent-blue to-accent-purple"
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

            <div className="hidden md:block">
              <Link
                href="/subscribe"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-cyan via-accent-blue to-accent-purple px-5 py-2 text-sm font-bold text-white shadow-lg shadow-glow-brand transition-all duration-300 hover:shadow-glow-brand"
              >
                Subscribe
              </Link>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
              transition={prefersReducedMotion ? {} : { duration: 0.25, ease: "easeInOut" }}
              className="mt-2 overflow-hidden md:hidden"
            >
              <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-[#090D16]/90 p-4 shadow-2xl backdrop-blur-2xl">
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
                      className="block rounded-2xl px-4 py-3 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      {label}
                    </Link>
                  </motion.div>
                ))}
                <div className="mt-2">
                  <Link
                    href="/subscribe"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-accent-cyan via-accent-blue to-accent-purple px-5 py-3 text-sm font-bold text-white shadow-lg shadow-glow-brand"
                  >
                    Subscribe
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}

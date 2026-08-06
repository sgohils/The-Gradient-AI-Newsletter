"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/theme-toggle";
import usePrefersReducedMotion from "@/hooks/use-prefers-reduced-motion";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/archive", label: "Archive" },
  { href: "/subscribe", label: "Subscribe" },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className={`sticky top-0 z-50 w-full border-b transition-all duration-500 ${
        scrolled
          ? "border-white/[0.06] bg-bg-primary/80 backdrop-blur-2xl shadow-[0_1px_20px_rgba(0,0,0,0.3)]"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-white transition-opacity duration-300 hover:opacity-90"
        >
          <Image
            src="/images/gradient horizontal logo.png"
            alt="The Gradient Logo"
            width={40}
            height={40}
            className="rounded-lg"
          />
          The Gradient
        </Link>

        <div className="hidden items-center md:flex md:gap-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="relative rounded-lg px-4 py-2 text-sm font-medium text-gray-400 transition-colors duration-200 hover:text-white"
            >
              {label}
              {isActive(href) && (
                <motion.span
                  layoutId="nav-indicator"
                  className="absolute -bottom-0.5 left-3 right-3 h-0.5 rounded-full bg-gradient-to-r from-accent-blue to-accent-cyan"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          ))}
          <div className="ml-2">
            <ThemeToggle />
          </div>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <motion.button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
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
                ? "border-t border-white/[0.06] bg-bg-primary/95 backdrop-blur-2xl"
                : "border-t border-white/[0.06] bg-bg-primary/95 backdrop-blur-2xl"
            }`}
          >
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
              {navLinks.map(({ href, label }, i) => (
                <motion.div
                  key={href}
                  initial={prefersReducedMotion ? undefined : { opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={prefersReducedMotion ? {} : { delay: i * 0.08, duration: 0.3 }}
                >
                  <Link
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                      isActive(href)
                        ? "text-accent-blue dark:text-accent-cyan"
                        : "text-gray-400 hover:text-white"
                    }`}
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
"use client";
import Link from "next/link";
import usePrefersReducedMotion from "@/hooks/use-prefers-reduced-motion";
export default function Footer() {
  const reduced = usePrefersReducedMotion();
  return <footer className="border-t border-[var(--border)]"><div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-7 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8"><div><Link href="/" className="font-serif text-lg font-semibold">The Gradient</Link><span className="ml-3 text-[var(--text-muted)]">AI insights, delivered daily.</span></div><div className="flex items-center gap-5 text-xs text-[var(--text-muted)]"><Link href="/archive" className="hover:text-[var(--accent)]">Archive</Link><span>© {new Date().getFullYear()} The Gradient</span><button onClick={() => window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" })} className="hover:text-[var(--accent)]">Back to top ↑</button></div></div></footer>;
}

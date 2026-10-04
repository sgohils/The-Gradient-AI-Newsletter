"use client";
import Link from "next/link";
import usePrefersReducedMotion from "@/hooks/use-prefers-reduced-motion";
import { GITHUB_URL } from "@/lib/site";

export default function Footer() {
  const reduced = usePrefersReducedMotion();
  return (
    <footer className="site-footer">
      <div className="site-container footer-main">
        <div>
          <Link href="/" className="footer-wordmark">
            The Gradient<span className="accent-text">.</span>
          </Link>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            A clearer view of what’s next.
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/archive">Archive</Link>
          <Link href="/about">About the project</Link>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            GitHub <span aria-hidden="true">↗</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </nav>
      </div>
      <div className="site-container footer-bottom">
        <p>© {new Date().getFullYear()} The Gradient</p>
        <p>Built with TypeScript & a little curiosity.</p>
        <button
          type="button"
          onClick={() =>
            window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" })
          }
        >
          Back to top <span aria-hidden="true">↑</span>
        </button>
      </div>
    </footer>
  );
}

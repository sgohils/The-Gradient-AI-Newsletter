"use client";
import Link from "next/link";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="site-container state-page" role="alert">
      <p className="eyebrow">The Gradient / Temporarily unavailable</p>
      <h1 className="page-title mt-4">The briefing couldn’t be loaded.</h1>
      <p className="mt-5 text-[var(--text-secondary)]">
        Please try again in a moment.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-6">
        <button type="button" className="primary-button" onClick={reset}>
          Try again
        </button>
        <Link className="editorial-link" href="/">
          Return home
        </Link>
      </div>
    </section>
  );
}

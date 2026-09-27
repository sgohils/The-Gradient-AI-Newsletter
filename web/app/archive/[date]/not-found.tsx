import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
      <div className="text-center">
        <p className="text-6xl font-bold text-[var(--text-muted)] mb-4">404</p>
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-4">
          Issue Not Found
        </h1>
        <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
          There&apos;s no newsletter issue published on this date. Check the archive for available issues.
        </p>
        <Link
          href="/archive"
          className="primary-button"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Browse Archive
        </Link>
      </div>
    </div>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-200 dark:text-gray-800 mb-4">404</p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Issue Not Found
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
          There&apos;s no newsletter issue published on this date. Check the archive for available issues.
        </p>
        <Link
          href="/archive"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-blue to-accent-cyan px-6 py-3 font-medium text-white shadow-lg shadow-accent-blue/20 transition-all duration-300 hover:shadow-xl hover:shadow-accent-blue/30 dark:shadow-accent-cyan/10 dark:hover:shadow-accent-cyan/20"
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

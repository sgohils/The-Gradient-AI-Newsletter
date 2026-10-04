import Link from "next/link";
import ArticleCard from "@/components/article-card";
import { readIssuesFromMarkdown } from "@/lib/posts";
import { archiveHref, parseArchiveQuery, queryArchive } from "@/lib/archive";

export const dynamic = "force-dynamic";
export const metadata = { title: "Archive | The Gradient" };

export default function ArchivePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();
  for (const key of ["q", "date", "page"]) {
    const value = searchParams[key];
    if (typeof value === "string") params.set(key, value);
  }
  const query = parseArchiveQuery(params);
  const issues = readIssuesFromMarkdown();
  const leadingStories = new Map(
    issues.map((issue) => [issue.date, issue.articles[0]]),
  );
  const result = queryArchive(issues, query);
  const returnTo = archiveHref({ ...query, page: result.page });
  return (
    <div className="archive-editorial">
      <header className="archive-header">
        <div>
          <p className="eyebrow">The Gradient / Index</p>
          <h1 className="mt-3 page-title">The reading room.</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Search the stories, research, and sources from every issue.
          </p>
        </div>
        <p className="archive-count">
          {issues.length} editions &middot;{" "}
          {issues.reduce((sum, issue) => sum + issue.articles.length, 0)}{" "}
          stories
        </p>
      </header>
      <form
        action="/archive"
        method="get"
        className="archive-filters"
        key={query.q + query.date}
      >
        <div className="min-w-0 flex-1">
          <label htmlFor="archive-search">Search stories</label>
          <input
            id="archive-search"
            name="q"
            type="search"
            defaultValue={query.q}
            maxLength={200}
            placeholder="Search topics, companies, or sources"
          />
        </div>
        <div>
          <label htmlFor="archive-date">Issue date</label>
          <input
            id="archive-date"
            name="date"
            type="date"
            defaultValue={query.date}
          />
        </div>
        <button className="primary-button" type="submit">
          Search
        </button>
        {(query.q || query.date) && (
          <Link className="editorial-link py-3" href="/archive">
            Clear filters
          </Link>
        )}
      </form>
      <p className="my-6 text-sm text-[var(--text-secondary)]" role="status">
        {result.total} {result.total === 1 ? "issue" : "issues"} found
        {query.q ? " for " + query.q : ""}
        {query.date ? " on " + query.date : ""}
      </p>
      {result.total === 0 ? (
        <div className="border-y border-[var(--border)] py-12">
          <h2 className="text-2xl">No issues found</h2>
          <p className="mt-2 text-[var(--text-secondary)]">
            Try a different topic or remove the date filter.
          </p>
        </div>
      ) : (
        <div className="issue-grid">
          {result.issues.map((issue) => (
            <ArticleCard
              key={issue.id}
              issue={issue}
              leadingStory={leadingStories.get(issue.date)}
              returnTo={returnTo}
            />
          ))}
        </div>
      )}
      {result.pages > 1 && (
        <nav
          aria-label="Archive pages"
          className="mt-10 flex items-center justify-between gap-4 border-t border-[var(--border)] pt-6"
        >
          {result.page > 1 ? (
            <Link
              className="editorial-link archive-page-link"
              href={archiveHref({ ...query, page: result.page - 1 })}
            >
              Previous page
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm">
            Page {result.page} of {result.pages}
          </span>
          {result.page < result.pages ? (
            <Link
              className="editorial-link archive-page-link"
              href={archiveHref({ ...query, page: result.page + 1 })}
            >
              Next page
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

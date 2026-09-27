import type { NewsletterIssue } from "@/types";

export const PAGE_SIZE = 9;
export type IssueSummary = Pick<NewsletterIssue, "id" | "title" | "date" | "intro" | "tags"> & { articleCount: number };
export type ArchiveQuery = { q: string; date: string; page: number };

export function parseArchiveQuery(params: URLSearchParams): ArchiveQuery {
  const rawPage = Number(params.get("page"));
  return {
    q: (params.get("q") || "").trim().slice(0, 200),
    date: /^\d{4}-\d{2}-\d{2}$/.test(params.get("date") || "") ? params.get("date")! : "",
    page: Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1,
  };
}

export function archiveHref(query: ArchiveQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.date) params.set("date", query.date);
  if (query.page > 1) params.set("page", String(query.page));
  return "/archive" + (params.size ? "?" + params.toString() : "");
}

export function queryArchive(issues: NewsletterIssue[], query: ArchiveQuery) {
  const terms = query.q.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = issues.filter((issue) => {
    if (query.date && issue.date !== query.date) return false;
    const text = [issue.title, issue.intro, ...issue.tags,
      ...issue.articles.flatMap((article) => [article.title, article.description || "", article.sourceName, article.url]),
    ].join(" ").toLowerCase();
    return terms.every((term) => text.includes(term));
  }).sort((a, b) => b.date.localeCompare(a.date));
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const page = Math.min(query.page, pages);
  const summaries: IssueSummary[] = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((issue) => ({
    id: issue.id, title: issue.title, date: issue.date, intro: issue.intro.slice(0, 600),
    tags: issue.tags, articleCount: issue.articles.length,
  }));
  return { issues: summaries, total: matches.length, page, pages, pageSize: PAGE_SIZE };
}

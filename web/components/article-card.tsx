import Link from "next/link";
import { NewsletterIssue } from "@/types";
import { mdToHtml } from "@/lib/markdown";
export default function ArticleCard({ issue }: { issue: NewsletterIssue }) {
  const date = new Date(issue.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return <Link href={`/archive/${issue.date}`} className="group block h-full border-t border-[var(--border)] py-5 transition-colors hover:border-[var(--accent)] focus-visible:outline-offset-4"><p className="text-xs uppercase tracking-[.1em] text-[var(--text-muted)]"><time dateTime={issue.date}>{date}</time><span className="px-2">·</span>{issue.articles.length} {issue.articles.length === 1 ? "article" : "articles"}</p><h3 className="mt-3 text-xl leading-snug group-hover:text-[var(--accent)]">{issue.title}</h3>{issue.intro && <div className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]" dangerouslySetInnerHTML={{ __html: mdToHtml(issue.intro) }}/>}<span className="mt-4 inline-block text-xs font-semibold text-[var(--accent)]">Read issue →</span></Link>;
}

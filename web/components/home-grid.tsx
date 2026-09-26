import Link from "next/link";
import ArticleCard from "@/components/article-card";
import type { NewsletterIssue } from "@/types";
export default function HomeGrid({ issues }: { issues: NewsletterIssue[] }) {
  if (!issues?.length) return null;
  return <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8 md:py-16"><div className="mb-7 flex items-end justify-between border-b border-[var(--border)] pb-4"><div><h2 className="text-2xl">Recent issues</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Catch up on the latest in AI and technology.</p></div><Link href="/archive" className="text-sm font-semibold text-[var(--accent)] hover:underline">All issues →</Link></div><div className="grid gap-x-8 md:grid-cols-2 lg:grid-cols-3">{issues.slice(0,6).map(issue => <ArticleCard key={issue.id} issue={issue}/>)}</div></section>;
}

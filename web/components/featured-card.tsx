import Image from "next/image";
import Link from "next/link";
import { mdToHtml } from "@/lib/markdown";
interface FeaturedCardProps { issue: { id: string; title: string; date: string; intro: string; tags: string[]; featuredImageUrl?: string; articles: { id: string; title: string }[] } }
export default function FeaturedCard({ issue }: FeaturedCardProps) {
  if (!issue.date) return null;
  return <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 md:py-14"><div className="mb-5 flex items-center gap-3"><h2 className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--text-muted)]">Featured edition</h2><span className="h-px flex-1 bg-[var(--border)]"/></div>
    <article className="grid border-y border-[var(--border)] md:grid-cols-[.8fr_1.2fr]">{issue.featuredImageUrl && <div className="relative min-h-56 md:min-h-full"><Image src={issue.featuredImageUrl} alt={issue.title} fill sizes="(max-width: 768px) 100vw, 40vw" className="object-cover"/></div>}<div className="py-7 md:px-9 md:py-9"><p className="text-xs uppercase tracking-[.12em] text-[var(--text-muted)]">{issue.date} <span className="px-2">·</span>{issue.articles.length} stories</p><h3 className="mt-3 max-w-[25ch] text-3xl leading-tight">{issue.title}</h3><div className="mt-4 line-clamp-3 max-w-[62ch] text-sm leading-7 text-[var(--text-secondary)]" dangerouslySetInnerHTML={{ __html: mdToHtml(issue.intro) }}/>{issue.tags.length > 0 && <p className="mt-4 text-xs text-[var(--text-muted)]">{issue.tags.slice(0,4).join(" · ")}</p>}<Link href={`/archive/${issue.date}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] hover:underline">Read full issue <span aria-hidden="true">→</span></Link></div></article>
  </section>;
}

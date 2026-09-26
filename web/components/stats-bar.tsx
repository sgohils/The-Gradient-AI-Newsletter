"use client";

interface Stat { label: string; value: number }

interface StatsBarProps {
  issues: {
    articles: { sourceName: string }[];
    tags: string[];
  }[];
}

export default function StatsBar({ issues }: StatsBarProps) {

  const totalArticles = issues.reduce((sum, issue) => sum + issue.articles.length, 0);
  const uniqueTags = new Set(issues.flatMap((issue) => issue.tags)).size;
  const uniqueSources = new Set(issues.flatMap((issue) => issue.articles.map((a) => a.sourceName))).size;

  const computedStats: Stat[] = [
    { label: "Issues published", value: issues.length },
    { label: "Articles shared", value: totalArticles },
    { label: "Topics covered", value: uniqueTags },
    { label: "Sources tracked", value: uniqueSources },
  ];

  return (
    <section className="mx-auto max-w-6xl px-5 py-6 sm:px-8"><div className="grid grid-cols-2 border-y border-[var(--border)] md:grid-cols-4">{computedStats.map((stat) => (
          <div key={stat.label} className="border-r border-[var(--border)] px-4 py-4 last:border-r-0"><p className="font-serif text-2xl text-[var(--accent)]">{stat.value}</p><p className="mt-1 text-[10px] font-medium uppercase tracking-[.12em] text-[var(--text-muted)]">{stat.label}</p></div>
        ))}</div>
    </section>
  );
}

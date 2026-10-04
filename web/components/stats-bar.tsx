import type { NewsletterIssue } from "@/types";

export default function StatsBar({ issues }: { issues: NewsletterIssue[] }) {
  const stats = [
    { label: "Published editions", value: issues.length },
    {
      label: "Stories in the archive",
      value: issues.reduce((sum, issue) => sum + issue.articles.length, 0),
    },
    {
      label: "Topics represented",
      value: new Set(issues.flatMap((issue) => issue.tags)).size,
    },
    {
      label: "Sources represented",
      value: new Set(
        issues.flatMap((issue) =>
          issue.articles.map((article) => article.sourceName),
        ),
      ).size,
    },
  ];
  return (
    <section className="site-container" aria-label="Publication statistics">
      <dl className="publication-stats">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt>{stat.label}</dt>
            <dd>{stat.value.toLocaleString("en-US")}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

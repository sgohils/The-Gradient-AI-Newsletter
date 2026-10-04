import Link from "next/link";
import ArticleCard from "@/components/article-card";
import type { NewsletterIssue } from "@/types";

export default function HomeGrid({ issues }: { issues: NewsletterIssue[] }) {
  const recent = issues.slice(1, 7);
  if (!recent.length) return null;
  return (
    <section className="site-container section-spacing">
      <div className="section-heading">
        <div>
          <p className="eyebrow mb-3">From the archive</p>
          <h2>Worth catching up on.</h2>
        </div>
        <Link href="/archive" className="text-link">
          All editions <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="issue-grid">
        {recent.map((issue) => (
          <ArticleCard key={issue.id} issue={issue} />
        ))}
      </div>
    </section>
  );
}

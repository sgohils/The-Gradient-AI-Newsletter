import Link from "next/link";
import type { Article, NewsletterIssue } from "@/types";
import { markdownToText } from "@/lib/markdown";
import { formatIssueDate } from "@/lib/issue-presentation";
import type { IssueSummary } from "@/lib/archive";

export default function ArticleCard({
  issue,
  returnTo,
  leadingStory,
}: {
  issue: NewsletterIssue | IssueSummary;
  returnTo?: string;
  leadingStory?: Pick<Article, "title" | "sourceName">;
}) {
  const count =
    "articleCount" in issue ? issue.articleCount : issue.articles.length;
  const story =
    leadingStory || ("articles" in issue ? issue.articles[0] : undefined);
  const href = `/archive/${issue.date}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;
  return (
    <Link href={href} className="issue-card group">
      <div className="card-meta">
        <time dateTime={issue.date}>{formatIssueDate(issue.date, true)}</time>
        <span>
          {count} {count === 1 ? "story" : "stories"}
        </span>
      </div>
      <h3>{story?.title || issue.title}</h3>
      <p className="card-description">{markdownToText(issue.intro)}</p>
      <div className="card-footer">
        <span className="story-source">
          {story?.sourceName || issue.tags[0] || "The Gradient"}
        </span>
        <span className="card-arrow" aria-hidden="true">
          ↗
        </span>
        <span className="sr-only">Read edition</span>
      </div>
    </Link>
  );
}

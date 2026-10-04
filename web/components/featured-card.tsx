import Image from "next/image";
import Link from "next/link";
import type { NewsletterIssue } from "@/types";
import { markdownToText } from "@/lib/markdown";
import { articleAnchor } from "@/lib/article-links";
import { formatIssueDate, issueReadMinutes } from "@/lib/issue-presentation";

export default function FeaturedCard({ issue }: { issue: NewsletterIssue }) {
  const href = `/archive/${issue.date}`;
  return (
    <article
      className="latest-edition"
      aria-labelledby="latest-edition-heading"
    >
      <div className="edition-topline">
        <h2 id="latest-edition-heading" className="eyebrow accent-text">
          Latest edition
        </h2>
        <time dateTime={issue.date}>{formatIssueDate(issue.date, true)}</time>
      </div>
      {issue.featuredImageUrl && (
        <div className="edition-image">
          <Image
            src={issue.featuredImageUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 560px"
            className="object-cover"
            priority
          />
        </div>
      )}
      <p className="edition-intro">
        {markdownToText(issue.intro) || issue.title}
      </p>
      <ol className="edition-stories">
        {issue.articles.slice(0, 3).map((story, index) => (
          <li key={story.id}>
            <span className="story-number" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <p className="story-source">{story.sourceName}</p>
              <h3>
                <Link href={`${href}#${articleAnchor(story.title, story.url)}`}>
                  {story.title}
                </Link>
              </h3>
            </div>
          </li>
        ))}
      </ol>
      <div className="edition-bottomline">
        <span>
          {issue.articles.length} stories <span aria-hidden="true">·</span>{" "}
          {issueReadMinutes(issue)} min read
        </span>
        <Link className="text-link" href={href}>
          Full edition <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

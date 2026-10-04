import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getIssueByDate, getAllIssueDates } from "@/lib/posts";
import { markdownBlocksToHtml, markdownToText } from "@/lib/markdown";

import {
  articleAnchor,
  safeArchiveReturn,
  safeArticleUrl,
} from "@/lib/article-links";
import { issueReadMinutes } from "@/lib/issue-presentation";

type Props = {
  searchParams?: { returnTo?: string | string[] };
  params: { date: string };
};

function renderIntro(html: string): string {
  return markdownBlocksToHtml(html);
}

export async function generateMetadata({ params }: Props) {
  const { date } = await params;

  const issue = getIssueByDate(date);

  if (!issue) {
    return { title: "Issue Not Found" };
  }

  const title = `${issue.title} | The Gradient`;
  const description = markdownToText(issue.intro).slice(0, 160);
  const url = `/archive/${issue.date}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "article",
      publishedTime: issue.publishedAt
        ? new Date(issue.publishedAt).toISOString()
        : undefined,
      images: issue.featuredImageUrl
        ? [{ url: issue.featuredImageUrl }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ArticlePage({ params, searchParams }: Props) {
  const { date } = await params;

  const issue = getIssueByDate(date);

  if (!issue) {
    notFound();
  }

  const dates = getAllIssueDates();
  const dateIndex = dates.indexOf(date);
  const prevDate = dateIndex < dates.length - 1 ? dates[dateIndex + 1] : null;
  const nextDate = dateIndex > 0 ? dates[dateIndex - 1] : null;

  const readMinutes = issueReadMinutes(issue);

  const formattedDate = new Date(issue.date + "T00:00:00").toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  const returnTo = safeArchiveReturn(
    typeof searchParams?.returnTo === "string"
      ? searchParams.returnTo
      : undefined,
  );
  const stories = issue.articles.map((article) => ({
    ...article,
    anchor: articleAnchor(article.title, article.url),
  }));
  return (
    <article className="issue-page">
      <nav aria-label="Breadcrumb" className="mb-8 text-sm">
        <Link className="editorial-link" href={returnTo}>
          Back to archive
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <time dateTime={date}>{date}</time>
      </nav>
      <header className="mb-10">
        <p className="eyebrow">
          <time dateTime={date}>{formattedDate}</time> &middot; {readMinutes}{" "}
          min read
        </p>
        <h1 className="mt-4 text-3xl leading-tight sm:text-4xl lg:text-5xl text-balance">
          {issue.title}
        </h1>
        {issue.tags.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Topics">
            {issue.tags.map((tag) => (
              <li className="issue-source" key={tag}>
                {tag}
              </li>
            ))}
          </ul>
        )}
      </header>
      {issue.featuredImageUrl && (
        <Image
          src={issue.featuredImageUrl}
          alt={issue.title}
          width={1200}
          height={675}
          sizes="(max-width: 768px) 100vw, 720px"
          className="mb-10 w-full rounded-lg aspect-video object-cover"
        />
      )}
      <div
        className="prose-custom"
        dangerouslySetInnerHTML={{ __html: renderIntro(issue.intro) }}
      />
      {stories.length > 0 && (
        <nav aria-labelledby="contents-heading" className="issue-contents">
          <h2 id="contents-heading" className="text-2xl">
            In this issue
          </h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5">
            {stories.map((story) => (
              <li key={story.id}>
                <a className="editorial-link" href={"#" + story.anchor}>
                  {story.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="mt-10">
        {stories.map((story, index) => {
          const sourceUrl = safeArticleUrl(story.url);
          return (
            <section
              key={story.id}
              id={story.anchor}
              aria-labelledby={story.anchor + "-title"}
              className="issue-article"
            >
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="issue-source">{story.sourceName}</span>
                <span className="text-sm text-[var(--text-muted)]">
                  #{index + 1}
                </span>
              </div>
              <h2
                id={story.anchor + "-title"}
                className="mb-4 text-2xl leading-snug"
              >
                {story.title}
              </h2>
              {story.description && (
                <div
                  className="prose-custom issue-summary mb-5"
                  dangerouslySetInnerHTML={{
                    __html: markdownBlocksToHtml(story.description),
                  }}
                />
              )}
              <div className="flex flex-wrap gap-5 text-sm">
                {sourceUrl && (
                  <a
                    className="editorial-link font-semibold"
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Read original article{" "}
                    <span className="sr-only">(opens in a new tab)</span>
                    <span aria-hidden="true">&#8599;</span>
                  </a>
                )}
                <a
                  className="editorial-link"
                  href={
                    "/archive/" +
                    date +
                    "?returnTo=" +
                    encodeURIComponent(returnTo) +
                    "#" +
                    story.anchor
                  }
                  aria-label={"Permanent link to " + story.title}
                >
                  Link to story
                </a>
              </div>
            </section>
          );
        })}
      </div>
      <nav
        aria-label="Adjacent issues"
        className="mt-10 grid grid-cols-2 gap-4"
      >
        {prevDate ? (
          <Link
            className="issue-nav"
            href={
              "/archive/" +
              prevDate +
              "?returnTo=" +
              encodeURIComponent(returnTo)
            }
          >
            <span>Previous issue</span>
            <time dateTime={prevDate}>{prevDate}</time>
          </Link>
        ) : (
          <span />
        )}
        {nextDate ? (
          <Link
            className="issue-nav text-right"
            href={
              "/archive/" +
              nextDate +
              "?returnTo=" +
              encodeURIComponent(returnTo)
            }
          >
            <span>Next issue</span>
            <time dateTime={nextDate}>{nextDate}</time>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}

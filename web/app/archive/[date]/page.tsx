import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";

type Props = {
  params: Promise<{ date: string }>;
};

async function getAllIssueDates(): Promise<string[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/issues`, { next: { revalidate: 3600 } });
  const issues: Array<{ id: string }> = await res.json();
  return issues
    .map((issue) => issue.id)
    .sort((a, b) => b.localeCompare(a));
}

function getReadTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  const minutes = words / 200;
  return Math.max(1, Math.round(minutes));
}

function renderIntro(html: string): string {
  return html
    .replace(/^<p>/g, '<p class="text-xl leading-relaxed text-gray-700 dark:text-gray-300">')
    .replace(/^<p[^>]*>\s*<\/p>/, "");
}

export async function generateMetadata({ params }: Props) {
  const { date } = await params;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/issues/${date}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      return { title: "Issue Not Found" };
    }

    const issue = await res.json();

    const title = `${issue.title} | The Gradient`;
    const description = issue.intro
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);
    const url = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/archive/${issue.date}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        type: "article",
        publishedTime: issue.publishedAt ? new Date(issue.publishedAt).toISOString() : undefined,
        images: issue.featuredImageUrl ? [{ url: issue.featuredImageUrl }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  } catch {
    return { title: "The Gradient" };
  }
}

export default async function ArticlePage({ params }: Props) {
  const { date } = await params;

  const [issueRes, dates] = await Promise.all([
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/issues/${date}`,
      { next: { revalidate: 3600 } }
    ),
    getAllIssueDates(),
  ]);

  if (!issueRes.ok) {
    notFound();
  }

  const issue = await issueRes.json();

  const dateIndex = dates.indexOf(date);
  const prevDate = dateIndex < dates.length - 1 ? dates[dateIndex + 1] : null;
  const nextDate = dateIndex > 0 ? dates[dateIndex - 1] : null;

  const fullText = issue.intro + " " + issue.articles.map((a: { title: string; description?: string }) => `${a.title} ${a.description || ""}`).join(" ");
  const readMinutes = getReadTime(fullText);

  const formattedDate = new Date(issue.date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <nav className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/archive"
              className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              Archive
            </Link>
            <span className="text-gray-400 dark:text-gray-600">/</span>
            <span className="text-gray-900 dark:text-white">{issue.date}</span>
          </div>
        </div>
      </nav>

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-12">
          <Link
            href="/archive"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Archive
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <time
              dateTime={issue.date}
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400"
            >
              {formattedDate}
            </time>
            <span className="text-gray-300 dark:text-gray-700">•</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {readMinutes} min read
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl lg:text-5xl text-balance">
            {issue.title}
          </h1>

          {issue.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {issue.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

          {issue.featuredImageUrl && (
            <div className="mb-12 overflow-hidden rounded-2xl">
              <Image
                src={issue.featuredImageUrl}
                alt={issue.title}
                width={1200}
                height={675}
                className="w-full aspect-video object-cover"
              />
            </div>
          )}

        <div
          className="prose-custom text-xl leading-relaxed text-gray-700 dark:text-gray-300"
          dangerouslySetInnerHTML={{ __html: renderIntro(issue.intro) }}
        />

        <section className="mt-14">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
            In This Issue
          </h2>
          <div className="space-y-10">
            {issue.articles.map((article: { id: string; title: string; description?: string; url: string; sourceName: string; category?: string; publishedAt: string }) => (
              <article
                key={article.id}
                className="rounded-xl border border-gray-200 p-6 dark:border-gray-800 dark:bg-gray-900/60"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {article.sourceName}
                  </span>
                  {article.category && (
                    <>
                      <span className="text-gray-300 dark:text-gray-700">•</span>
                      <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                        {article.category}
                      </span>
                    </>
                  )}
                </div>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {article.title}
                </h3>

                {article.description && (
                  <div
                    className="text-indigo-600 dark:text-indigo-400 leading-relaxed mb-5"
                    dangerouslySetInnerHTML={{
                      __html: `<p>${article.description}</p>`,
                    }}
                  />
                )}

                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-500"
                >
                  Read Article
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </article>
            ))}
          </div>
        </section>
      </article>

      <nav className="border-t border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <div className="flex items-center justify-between">
            {prevDate ? (
              <Link
                href={`/archive/${prevDate}`}
                className="group flex flex-col gap-1 rounded-xl p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <span className="text-xs text-gray-500 dark:text-gray-400">Previous</span>
                <span className="font-medium text-gray-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 text-sm">
                  {prevDate}
                </span>
              </Link>
            ) : (
              <div />
            )}

            {nextDate ? (
              <Link
                href={`/archive/${nextDate}`}
                className="group flex flex-col gap-1 rounded-xl p-4 text-right transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <span className="text-xs text-gray-500 dark:text-gray-400">Next</span>
                <span className="font-medium text-gray-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400 text-sm">
                  {nextDate}
                </span>
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>
      </nav>
    </>
  );
}

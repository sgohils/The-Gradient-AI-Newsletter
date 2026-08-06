import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getIssueByDate, getAllIssueDates } from "@/lib/posts";
import { mdToHtml } from "@/lib/markdown";
import ShareButtons from "./components/share-buttons";

type Props = {
  params: Promise<{ date: string }>;
};

function extractHeadings(html: string): string[] {
  const headings: string[] = [];
  const regex = /<h[23][^>]*>(.*?)<\/h[23]>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]*>/g, "").trim();
    if (text) headings.push(text);
  }
  return headings;
}

function getReadTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  const minutes = words / 200;
  return Math.max(1, Math.round(minutes));
}

function renderIntro(html: string): string {
  return mdToHtml(html);
}

export async function generateMetadata({ params }: Props) {
  const { date } = await params;

  const issue = getIssueByDate(date);

  if (!issue) {
    return { title: "Issue Not Found" };
  }

  const title = `${issue.title} | The Gradient`;
  const description = issue.intro
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  const url = `/archive/${issue.date}`;

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
}

export default async function ArticlePage({ params }: Props) {
  const { date } = await params;

  const issue = getIssueByDate(date);

  if (!issue) {
    notFound();
  }

  const dates = getAllIssueDates();
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

  const headings = extractHeadings(issue.intro);

  return (
    <>
      <div className="reading-progress" id="reading-progress" />

      <nav className="border-b border-white/[0.06] bg-bg-primary/70 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <Breadcrumb date={date} />
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-24">
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                On This Page
              </h4>
              <nav className="space-y-1">
                {headings.map((heading, i) => (
                  <a
                    key={i}
                    href={`#heading-${i}`}
                    className="toc-link block py-1.5 px-3 text-sm text-gray-400 hover:text-accent-blue dark:hover:text-accent-cyan transition-colors duration-200 rounded-lg hover:bg-white/5"
                  >
                    {heading}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <article className="lg:col-span-9">
<header className="mb-12">
               <BackLink />

                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <Image
                    src="/images/gradient horizontal logo.png"
                    alt="The Gradient Logo"
                    width={48}
                    height={48}
                    className="rounded-xl"
                  />
                  <span className="rounded-full bg-accent-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-blue">
                    {formattedDate}
                  </span>
                  <span className="text-gray-600 dark:text-gray-600">•</span>
                  <span className="flex items-center gap-1.5 text-sm text-gray-400">
                    <ClockIcon />
                    {readMinutes} min read
                  </span>
                </div>

               <h1 className="text-4xl font-bold tracking-tight text-gray-100 sm:text-5xl lg:text-6xl text-balance">
                 {issue.title}
               </h1>

              {issue.tags.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {issue.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-300"
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
                  className="w-full aspect-video object-cover transition-transform duration-700 hover:scale-[1.02]"
                />
              </div>
            )}

            <div
              className="prose-custom text-xl leading-relaxed text-gray-300"
              dangerouslySetInnerHTML={{ __html: renderIntro(issue.intro) }}
            />

            <section className="mt-16">
              <div className="mb-12 flex items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight text-gray-100">In This Issue</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-accent-blue/30 via-accent-cyan/30 to-transparent" />
              </div>

              <div className="relative">
                <div className="absolute left-4 top-0 h-full w-px bg-gradient-to-b from-transparent via-accent-cyan/30 to-transparent" />

                <div className="space-y-10">
                  {issue.articles.map((article, idx) => (
                    <div key={article.id} className="relative">
                      <div className="absolute -left-[17px] top-2 h-2.5 w-2.5 rounded-full border-2 border-accent-cyan bg-bg-primary dark:border-accent-cyan dark:bg-accent-cyan/40" />

                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="rounded-md bg-accent-blue/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-accent-blue">
                          {article.sourceName}
                        </span>
                        <span className="text-sm font-semibold text-accent-cyan/60">
                          #{idx + 1}
                        </span>
                      </div>

                      <h3 className="mb-3 text-xl font-bold text-gray-100">
                        {article.title}
                      </h3>

                      {article.description && (
                        <div
                          className="text-base leading-[1.8] text-gray-400 mb-4 max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: `<p>${mdToHtml(article.description)}</p>`,
                          }}
                        />
                      )}

                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/link inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-cyan px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-accent-blue/20 transition-all duration-300 hover:shadow-xl hover:shadow-accent-blue/30"
                      >
                        Read Article
                        <svg className="h-3.5 w-3.5 transition-transform duration-300 group-hover/link:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </a>

                      {idx < issue.articles.length - 1 && (
                        <div className="mt-10 h-px bg-gradient-to-r from-accent-blue/20 via-accent-cyan/20 to-transparent" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <ShareButtons issue={issue} />

            <RelatedIssues dates={dates} currentDate={date} />
          </article>
        </div>
      </div>

      <nav className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <div className="grid grid-cols-2 gap-4">
            {prevDate ? (
              <IssueNavLink href={`/archive/${prevDate}`} label="Previous" date={prevDate} align="left" />
            ) : (
              <div />
            )}
            {nextDate ? (
              <IssueNavLink href={`/archive/${nextDate}`} label="Next" date={nextDate} align="right" />
            ) : (
              <div />
            )}
          </div>
        </div>
      </nav>
    </>
  );
}

function Breadcrumb({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Link
        href="/archive"
        className="text-gray-400 transition-colors duration-200 hover:text-accent-blue"
      >
        Archive
      </Link>
      <span className="text-gray-600">/</span>
      <span className="font-medium text-gray-200">{date}</span>
    </div>
  );
}

function BackLink() {
  return (
    <div>
      <Link
        href="/archive"
        className="group mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 transition-colors duration-200 hover:text-accent-blue"
      >
        <svg className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Archive
      </Link>
    </div>
  );
}

function IssueNavLink({ href, label, date, align }: { href: string; label: string; date: string; align: "left" | "right" }) {
  return (
    <Link
      href={href}
      className={`group relative flex flex-col gap-1 overflow-hidden rounded-2xl border border-white/[0.06] bg-bg-card/60 backdrop-blur-sm p-5 backdrop-blur-sm transition-all duration-300 hover:border-accent-blue/20 hover:shadow-[0_8px_30px_-12px_rgba(79,124,255,0.2)] ${align === "right" ? "items-end text-right" : ""}`}
    >
      <div className="absolute inset-x-0 top-0 h-[2px] -translate-y-full bg-gradient-to-r from-accent-blue via-accent-cyan to-accent-green transition-transform duration-500 ease-out group-hover:translate-y-0" />
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <span className="font-semibold text-gray-200 transition-colors duration-200 group-hover:text-accent-blue text-sm">
        {date}
      </span>
    </Link>
  );
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function RelatedIssues({ dates, currentDate }: { dates: string[]; currentDate: string }) {
  const related = dates
    .filter((d) => d !== currentDate)
    .slice(0, 3);

  if (related.length === 0) return null;

  return (
    <div className="mt-16">
      <h3 className="mb-6 text-lg font-semibold text-gray-100">Related Issues</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {related.map((date) => {
          const relatedIssue = getIssueByDate(date);
          if (!relatedIssue) return null;
          return (
            <Link
              key={date}
              href={`/archive/${date}`}
              className="group relative block overflow-hidden rounded-2xl border border-white/[0.06] bg-bg-card/40 backdrop-blur-sm p-5 transition-all duration-300 hover:border-accent-blue/20 hover:shadow-[0_8px_30px_-12px_rgba(79,124,255,0.15)]"
            >
              <div className="absolute inset-x-0 top-0 h-[2px] -translate-y-full bg-gradient-to-r from-accent-blue via-accent-cyan to-accent-green transition-transform duration-500 ease-out group-hover:translate-y-0" />
              <p className="text-xs font-medium text-gray-500">{date}</p>
              <p className="mt-1 text-sm font-semibold text-gray-200 transition-colors duration-200 group-hover:text-accent-blue">
                {relatedIssue.title}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

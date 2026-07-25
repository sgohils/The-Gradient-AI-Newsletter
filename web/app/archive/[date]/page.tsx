import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import usePrefersReducedMotion from "@/hooks/use-prefers-reduced-motion";

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
      <nav className="border-b border-gray-200/60 bg-white/70 backdrop-blur-md dark:border-gray-800/60 dark:bg-bento-surface/70">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <Breadcrumb date={date} />
        </div>
      </nav>

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-12">
          <BackLink date={date} />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-wrap items-center gap-3 mb-5"
          >
            <span className="rounded-full bg-gradient-to-r from-accent-blue/10 to-accent-cyan/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-blue dark:from-accent-cyan/10 dark:to-accent-emerald/10 dark:text-accent-cyan">
              {formattedDate}
            </span>
            <span className="text-gray-300 dark:text-gray-700">•</span>
            <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <ClockIcon />
              {readMinutes} min read
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl lg:text-5xl text-balance"
          >
            {issue.title}
          </motion.h1>

          {issue.tags.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-5 flex flex-wrap gap-2"
            >
              {issue.tags.map((tag: string, index: number) => (
                <motion.span
                  key={tag}
                  initial={{ opacity: 0, scale: 0.7, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.35 + index * 0.06, ease: [0.34, 1.56, 0.64, 1] }}
                  className="rounded-full border border-glass-border bg-glass-highlight px-3 py-1 text-xs font-medium text-accent-blue dark:bg-bento-surface-dark dark:text-accent-cyan"
                >
                  {tag}
                </motion.span>
              ))}
            </motion.div>
          )}
        </header>

        {issue.featuredImageUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mb-12 overflow-hidden rounded-2xl"
          >
            <Image
              src={issue.featuredImageUrl}
              alt={issue.title}
              width={1200}
              height={675}
              className="w-full aspect-video object-cover transition-transform duration-700 hover:scale-[1.02]"
            />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="prose-custom text-xl leading-relaxed text-gray-700 dark:text-gray-300"
          dangerouslySetInnerHTML={{ __html: renderIntro(issue.intro) }}
        />

        <section className="mt-16">
          <div className="flex items-center gap-3 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">In This Issue</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-accent-blue/40 via-accent-cyan/40 to-transparent dark:from-accent-cyan/30 dark:via-accent-emerald/30" />
          </div>
          <div className="space-y-6">
            {issue.articles.map((article: { id: string; title: string; description?: string; url: string; sourceName: string; category?: string; publishedAt: string }, index: number) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                whileHover={{ y: -4 }}
                className={`group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white/70 p-6 backdrop-blur-sm
                  dark:border-bento-surface-light/40 dark:bg-bento-surface/60 dark:backdrop-blur-md
                  hover:border-accent-blue/40 hover:shadow-[0_20px_50px_-12px_rgba(59,130,246,0.15)]
                  dark:hover:border-accent-cyan/30 dark:hover:shadow-[0_20px_50px_-12px_rgba(6,182,212,0.1)]
                  transition-all duration-300`}
              >
                <div className="absolute inset-x-0 top-0 h-[2px] -translate-y-full bg-gradient-to-r from-accent-blue via-accent-cyan to-accent-green transition-transform duration-500 ease-out group-hover:translate-y-0" />

                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {article.sourceName}
                  </span>
                  {article.category && (
                    <>
                      <span className="text-gray-300 dark:text-gray-700">•</span>
                      <span className="text-xs font-medium text-accent-blue dark:text-accent-cyan">
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
                    className="text-gray-600 dark:text-gray-300 leading-relaxed mb-5"
                    dangerouslySetInnerHTML={{
                      __html: `<p>${article.description}</p>`,
                    }}
                  />
                )}

                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/link inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-blue to-accent-cyan px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-accent-blue/20 transition-all duration-300 hover:shadow-xl hover:shadow-accent-blue/30 dark:shadow-accent-cyan/10 dark:hover:shadow-accent-cyan/20"
                >
                  Read Article
                  <svg className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </motion.article>
            ))}
          </div>
        </section>
      </article>

      <nav className="border-t border-gray-200/60 dark:border-gray-800/60">
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center gap-2 text-sm"
    >
      <Link
        href="/archive"
        className="text-gray-500 transition-colors duration-200 hover:text-accent-blue dark:text-gray-400 dark:hover:text-accent-cyan"
      >
        Archive
      </Link>
      <span className="text-gray-300 dark:text-gray-700">/</span>
      <span className="font-medium text-gray-900 dark:text-white">{date}</span>
    </motion.div>
  );
}

function BackLink({ date }: { date: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Link
        href="/archive"
        className="group mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors duration-200 hover:text-accent-blue dark:text-gray-400 dark:hover:text-accent-cyan"
      >
        <svg className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Archive
      </Link>
    </motion.div>
  );
}

function IssueNavLink({ href, label, date, align }: { href: string; label: string; date: string; align: "left" | "right" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <Link
        href={href}
        className={`group relative flex flex-col gap-1 overflow-hidden rounded-2xl border border-gray-200/60 bg-white/70 p-5 backdrop-blur-sm
          dark:border-bento-surface-light/40 dark:bg-bento-surface/60 dark:backdrop-blur-md
          hover:border-accent-blue/40 hover:shadow-[0_8px_30px_-12px_rgba(59,130,246,0.15)]
          dark:hover:border-accent-cyan/30 transition-all duration-300 ${align === "right" ? "items-end text-right" : ""}`}
      >
        <div className="absolute inset-x-0 top-0 h-[2px] -translate-y-full bg-gradient-to-r from-accent-blue via-accent-cyan to-accent-green transition-transform duration-500 ease-out group-hover:translate-y-0" />
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
        <span className="font-semibold text-gray-900 transition-colors duration-200 group-hover:text-accent-blue dark:text-white dark:group-hover:text-accent-emerald text-sm">
          {date}
        </span>
      </Link>
    </motion.div>
  );
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

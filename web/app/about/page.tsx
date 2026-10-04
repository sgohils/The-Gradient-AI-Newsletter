import Link from "next/link";
import { GITHUB_URL } from "@/lib/site";
import { readIssuesFromMarkdown } from "@/lib/posts";

export const metadata = {
  title: "About the project | The Gradient",
  description:
    "Inside The Gradient: a TypeScript pipeline for gathering, ranking, summarizing, and publishing AI news.",
};
export const dynamic = "force-dynamic";
const stages = [
  {
    title: "Gather",
    detail:
      "RSS feeds from research, company blogs, and industry publications are fetched concurrently. A failed feed does not stop the others.",
  },
  {
    title: "Deduplicate",
    detail:
      "Normalized URLs and similar titles remove repeated stories before they reach the reading list.",
  },
  {
    title: "Curate",
    detail:
      "A weighted score combines source priority, recency, relevance keywords, and engagement metadata when available. The highest-scoring stories make the edition.",
  },
  {
    title: "Summarize",
    detail:
      "Groq or OpenAI produces structured summaries. Without an API key, or after a provider failure, an extractive fallback uses the source text.",
  },
  {
    title: "Publish",
    detail:
      "The pipeline writes Markdown and HTML. GitHub Actions schedules the daily run and commits the generated editions.",
  },
  {
    title: "Read & deliver",
    detail:
      "Next.js serves the Markdown archive with search and story links. Resend optionally manages contacts and delivers newsletter emails.",
  },
];
const tradeoffs = [
  {
    title: "Files before a database",
    detail:
      "Markdown makes editions portable, inspectable, and versioned in Git. This suits a small publication; a larger archive would benefit from an indexed data store.",
  },
  {
    title: "Explicit ranking",
    detail:
      "Source, recency, and relevance weights make selection straightforward to inspect. They are editorial heuristics, rather than a personalized recommendation model.",
  },
  {
    title: "AI with a fallback",
    detail:
      "Provider summaries give the briefing structure, while extractive summaries keep publishing possible without credentials. Generated claims still require source verification.",
  },
];

export default function AboutPage() {
  const issues = readIssuesFromMarkdown();
  const stories = issues.reduce((sum, issue) => sum + issue.articles.length, 0);
  return (
    <div className="site-container about-page">
      <header className="about-header">
        <div>
          <p className="eyebrow accent-text">Behind the briefing</p>
          <h1 className="page-title mt-5">
            From scattered news
            <br />
            to a daily <em>signal.</em>
          </h1>
        </div>
        <div className="about-introduction">
          <p>
            AI news moves quickly. The Gradient turns a collection of feeds into
            one readable edition, then keeps that edition available long after
            the inbox moves on.
          </p>
          <p className="mt-4">
            An end-to-end TypeScript project connecting data ingestion,
            rule-based ranking, AI summarization, and a responsive publication.
          </p>
          <a
            className="text-link mt-6"
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Explore the source on GitHub <span aria-hidden="true">↗</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </header>
      <div className="project-facts">
        <div>
          <span className="eyebrow">The product</span>
          <p>
            {issues.length} editions · {stories.toLocaleString("en-US")}{" "}
            archived stories
          </p>
        </div>
        <div>
          <span className="eyebrow">The interface</span>
          <p>Next.js · React · Tailwind CSS</p>
        </div>
        <div>
          <span className="eyebrow">The pipeline</span>
          <p>Node.js · TypeScript · GitHub Actions</p>
        </div>
      </div>
      <section className="section-spacing" aria-labelledby="pipeline-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow mb-3">01 / The architecture</p>
            <h2 id="pipeline-heading">One pipeline. Six steps.</h2>
          </div>
          <p className="section-aside">
            From original source to published edition.
          </p>
        </div>
        <ol className="pipeline-grid">
          {stages.map((stage, index) => (
            <li key={stage.title}>
              <span className="pipeline-number">
                {String(index + 1).padStart(2, "0")}{" "}
                <span aria-hidden="true">→</span>
              </span>
              <h3>{stage.title}</h3>
              <p>{stage.detail}</p>
            </li>
          ))}
        </ol>
      </section>
      <section
        className="section-spacing border-t border-[var(--border)]"
        aria-labelledby="decisions-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow mb-3">02 / Engineering decisions</p>
            <h2 id="decisions-heading">Built with clear tradeoffs.</h2>
          </div>
        </div>
        <div className="tradeoff-grid">
          {tradeoffs.map((item) => (
            <article key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="about-closing">
        <div>
          <p className="eyebrow accent-text mb-3">
            03 / The reading experience
          </p>
          <h2>
            Follow the story.
            <br />
            <em>Keep the context.</em>
          </h2>
        </div>
        <div>
          <p>
            Search across headlines, summaries, topics, and sources. Jump to
            individual stories, follow original articles, and move between
            editions without losing your archive filters.
          </p>
          <Link className="primary-button mt-6" href="/archive">
            Explore the archive <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

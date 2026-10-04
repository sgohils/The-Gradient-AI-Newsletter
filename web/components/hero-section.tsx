import Link from "next/link";
import FeaturedCard from "@/components/featured-card";
import type { NewsletterIssue } from "@/types";

export default function HeroSection({ issue }: { issue?: NewsletterIssue }) {
  return (
    <section className="site-container hero-layout">
      <div className="hero-introduction">
        <p className="eyebrow accent-text">
          <span className="signal-dot" aria-hidden="true" /> An independent AI
          briefing
        </p>
        <h1 className="hero-title">
          A clearer
          <br />
          view of <em>AI.</em>
        </h1>
        <p className="hero-description">
          Research worth reading. Industry shifts worth understanding. The
          context to connect it all.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-6">
          <Link
            className="primary-button"
            href={issue ? `/archive/${issue.date}` : "/archive"}
          >
            {issue ? "Read latest issue" : "Explore the archive"}
            <span aria-hidden="true">↗</span>
          </Link>
          <Link className="text-link" href="/about">
            Behind the briefing <span aria-hidden="true">→</span>
          </Link>
        </div>
        <p className="hero-note">
          A daily publishing pipeline. A lasting, searchable archive.
        </p>
        <div className="hero-topics" aria-label="Publication coverage">
          <span>Research</span>
          <span>Industry</span>
          <span>Engineering</span>
        </div>
      </div>
      {issue ? (
        <FeaturedCard issue={issue} />
      ) : (
        <div className="latest-edition empty-edition">
          <p className="eyebrow accent-text">The first edition</p>
          <h2 className="mt-6 text-3xl">The next signal starts here.</h2>
          <p className="mt-4 text-[var(--text-secondary)]">
            No issues have been published yet. Once an edition is available,
            you’ll find its stories here.
          </p>
          <Link className="text-link mt-8" href="/about">
            See how the publication works <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </section>
  );
}

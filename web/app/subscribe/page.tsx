import Link from "next/link";
import SubscribeBox from "@/components/subscribe-box";
import { readIssuesFromMarkdown } from "@/lib/posts";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Subscribe | The Gradient",
  description: "Get The Gradient’s daily AI briefing in your inbox.",
};

export default function SubscribePage() {
  const latest = readIssuesFromMarkdown()[0];
  return (
    <div className="site-container subscribe-page">
      <div>
        <p className="eyebrow accent-text">The Gradient / Delivered</p>
        <h1 className="page-title mt-5">
          Make room for
          <br />
          <em>better signal.</em>
        </h1>
        <p className="mt-6 max-w-[45ch] text-[var(--text-secondary)]">
          A daily selection of AI research and industry updates, with a summary
          of what happened and links to the original work.
        </p>
        <ul className="subscription-benefits">
          <li>Research, releases, and the bigger picture.</li>
          <li>A short briefing with sources you can follow.</li>
          <li>Every edition saved in a searchable archive.</li>
        </ul>
        {latest && (
          <Link className="text-link" href={`/archive/${latest.date}`}>
            Read a recent edition first <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
      <section className="signup-panel" aria-labelledby="signup-heading">
        <p className="eyebrow mb-4">Your daily reading ritual</p>
        <h2 id="signup-heading" className="text-3xl mb-3">
          The next edition awaits.
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-7">
          Sign up for the daily briefing.
        </p>
        <SubscribeBox available={Boolean(process.env.RESEND_API_KEY)} />
        <p className="mt-5 text-xs text-[var(--text-muted)]">
          By subscribing, you agree to receive newsletter emails. You can
          unsubscribe at any time.
        </p>
      </section>
    </div>
  );
}

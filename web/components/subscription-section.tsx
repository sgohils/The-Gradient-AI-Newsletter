import SubscribeBox from "@/components/subscribe-box";

export default function SubscriptionSection() {
  return (
    <section
      className="site-container subscription-section"
      aria-labelledby="subscribe-heading"
    >
      <div>
        <p className="eyebrow accent-text mb-3">Stay in the loop</p>
        <h2 id="subscribe-heading">
          Less noise.
          <br />
          <em>More perspective.</em>
        </h2>
        <p className="mt-4 max-w-[40ch] text-[var(--text-secondary)]">
          The next briefing, straight to your inbox. Free to read. Easy to
          leave.
        </p>
      </div>
      <div>
        <SubscribeBox available={Boolean(process.env.RESEND_API_KEY)} />
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Daily editions. Original sources. Unsubscribe anytime.
        </p>
      </div>
    </section>
  );
}

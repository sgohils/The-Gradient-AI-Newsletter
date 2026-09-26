import Link from "next/link";
import SubscribeBox from "@/components/subscribe-box";

export default function HeroSection() {
  return <section className="mx-auto grid max-w-6xl gap-12 px-5 pb-12 pt-16 sm:px-8 md:grid-cols-[.78fr_1.22fr] md:gap-16 md:pb-20 md:pt-24">
    <div className="md:pt-3"><p className="mb-5 text-xs font-semibold uppercase tracking-[.16em] text-[var(--accent)]">Today&apos;s Edition <span className="px-2 text-[var(--text-muted)]">/</span> A daily briefing</p>
      <h1 className="max-w-[13ch] text-4xl leading-[1.08] sm:text-5xl">The Daily AI Signal That Keeps You Ahead</h1>
      <p className="mt-6 max-w-[48ch] text-base leading-7 text-[var(--text-secondary)]">Curated research, breaking industry updates, and architectural breakdowns delivered to your inbox every morning.</p>
      <div className="mt-8"><SubscribeBox /></div><p className="mt-3 text-xs text-[var(--text-muted)]">Join engineers, researchers, and AI builders. Free, unsubscribe anytime.</p>
    </div><div className="self-end border-y border-[var(--border)] py-7 md:mb-2 md:py-9"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--text-muted)]">Independent signal for people building with AI</p><div className="mt-6 flex items-center gap-4" aria-hidden="true"><span className="h-px w-12 bg-[var(--accent)]"/><span className="h-px flex-1 bg-[var(--border)]"/></div><p className="mt-6 max-w-[52ch] text-sm leading-7 text-[var(--text-secondary)]">Research, product shifts, and technical context, selected for substance and explained with the builder in mind.</p><Link href="/archive" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] hover:underline">Explore the archive <span aria-hidden="true">→</span></Link></div>
  </section>;
}

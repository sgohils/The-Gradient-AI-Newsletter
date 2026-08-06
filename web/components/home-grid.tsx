"use client";

import { useRef } from "react";
import ScrollReveal from "@/components/scroll-reveal";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import type { NewsletterIssue } from "@/types";

const ArticleCard = dynamic(() => import("@/components/article-card"));

interface HomeGridProps {
  issues: NewsletterIssue[];
}

export default function HomeGrid({ issues }: HomeGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  if (!issues || issues.length === 0) return null;

  return (
    <section className="relative z-10 w-full px-4 sm:px-6 py-20 md:py-28">
      <div ref={gridRef} className="mx-auto max-w-6xl">
        <ScrollReveal direction="up" className="mb-12">
          <div className="flex items-end justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/images/gradient icon.png"
                alt="The Gradient Logo"
                width={24}
                height={24}
                className="rounded"
              />
              <div>
                <h2 className="text-4xl font-bold text-gray-100">
                  Recent Issues
                </h2>
                <p className="mt-2 text-sm text-gray-400">
                  Catch up on the latest in AI and technology.
                </p>
              </div>
            </div>
            <Link
              href="/archive"
              className="hidden items-center gap-1.5 text-sm font-semibold text-accent-blue transition-colors duration-300 hover:text-accent-cyan md:flex"
            >
              View all
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.15} staggerChildren={[0.1, 0]}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {issues.slice(0, 6).map((issue) => (
              <ArticleCard key={issue.id} issue={issue} />
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
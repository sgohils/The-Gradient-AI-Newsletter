"use client";

import { motion } from "framer-motion";
import usePrefersReducedMotion from "@/hooks/use-prefers-reduced-motion";
import Image from "next/image";

const timeline = [
  {
    year: "2024",
    title: "The Gradient Launches",
    description: "We started as a passion project to make AI news accessible to everyone.",
  },
  {
    year: "2025",
    title: "10K+ Subscribers",
    description: "Our community grew to over 10,000 AI enthusiasts and professionals.",
  },
  {
    year: "2026",
    title: "AI-Powered Curation",
    description: "We introduced AI-powered summarization and personalized recommendations.",
  },
];

const values = [
  {
    title: "Curiosity",
    description: "We believe in the power of asking questions and exploring the unknown.",
  },
  {
    title: "Clarity",
    description: "We cut through the noise to deliver the most important AI stories clearly.",
  },
  {
    title: "Community",
    description: "We build bridges between AI researchers, engineers, and enthusiasts.",
  },
  {
    title: "Integrity",
    description: "We are transparent about our sources and never compromise on accuracy.",
  },
];

export default function AboutPage() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <Image
          src="/images/gradient horizontal logo.png"
          alt="The Gradient Logo"
          width={200}
          height={200}
          className="mx-auto rounded-2xl mb-6"
        />
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-gray-400">
          About
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-100 sm:text-5xl">
          Our Story
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-gray-400">
          The Gradient is a daily AI newsletter that delivers the most important stories in AI and technology, curated by a team of passionate researchers and engineers.
        </p>
      </motion.div>

      <div className="mt-20">
        <h2 className="text-3xl font-bold text-gray-100 text-center">Our Journey</h2>
        <div className="mt-12 space-y-8">
          {timeline.map((item, i) => (
            <motion.div
              key={item.year}
              initial={prefersReducedMotion ? false : { opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: i * 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={`flex flex-col ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"} items-center gap-8`}
            >
              <div className="flex-1 text-center md:text-left">
                <span className="text-sm font-semibold text-accent-blue">{item.year}</span>
                <h3 className="mt-2 text-xl font-semibold text-gray-100">{item.title}</h3>
                <p className="mt-2 text-gray-400">{item.description}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-bg-card text-accent-blue">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-20">
        <h2 className="text-3xl font-bold text-gray-100 text-center">Our Values</h2>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((value, i) => (
            <motion.div
              key={value.title}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl border border-white/[0.06] bg-bg-card/60 backdrop-blur-sm p-6 text-center"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent-blue/10 text-accent-blue">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  {i === 0 && <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />}
                  {i === 1 && <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />}
                  {i === 2 && <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />}
                  {i === 3 && <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />}
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-200">{value.title}</h3>
              <p className="mt-2 text-sm text-gray-400">{value.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-20 text-center">
        <h2 className="text-3xl font-bold text-gray-100">Join Our Community</h2>
        <p className="mt-4 text-gray-400">
          Subscribe to The Gradient and be part of a growing community of AI enthusiasts.
        </p>
        <div className="mt-8">
          <a
            href="/subscribe"
            className="btn-primary inline-flex"
          >
            Subscribe Now
          </a>
        </div>
      </div>
    </div>
  );
}
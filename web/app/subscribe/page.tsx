"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

export default function SubscribePage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage("You're subscribed! Check your inbox for confirmation.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <Image
            src="/images/gradient icon.png"
            alt="The Gradient Logo"
            width={24}
            height={24}
            className="mx-auto mb-4"
          />
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-gray-400">
            Newsletter
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-100 sm:text-5xl">
            Stay in the Loop
          </h1>
          <p className="mt-4 text-gray-400">
            Get the latest AI news delivered to your inbox every day.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="rounded-2xl border border-white/[0.06] bg-bg-card/60 backdrop-blur-sm p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-300">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="btn-primary w-full"
            >
              {status === "loading" ? "Subscribing..." : "Subscribe"}
            </button>

            {message && (
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-center text-sm ${
                  status === "success" ? "text-green-400" : "text-red-400"
                }`}
              >
                {message}
              </motion.p>
            )}
          </form>

          <p className="mt-6 text-center text-xs text-gray-500">
            By subscribing, you agree to receive email newsletters. You can unsubscribe at any time.
          </p>
        </motion.div>

        <div className="mt-8 text-center">
          <Link
            href="/archive"
            className="text-sm text-gray-400 transition-colors duration-200 hover:text-accent-blue"
          >
            ← Browse the archive
          </Link>
        </div>
      </div>
    </div>
  );
}
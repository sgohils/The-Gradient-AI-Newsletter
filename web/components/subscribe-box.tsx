"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export default function SubscribeBox() {
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
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mx-auto w-full max-w-xl"
    >
      <div className="flex flex-col gap-3 rounded-2xl bg-white/[0.03] p-2 backdrop-blur-2xl transition-all duration-300 focus-within:border-cyan-400/80 focus-within:ring-4 focus-within:ring-cyan-500/10 sm:flex-row sm:gap-0">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          className="flex-1 rounded-xl bg-transparent px-5 py-3.5 text-sm text-gray-100 placeholder-gray-500 outline-none sm:border-r sm:border-white/10 dark:text-white dark:placeholder-gray-400"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-xl bg-gradient-to-r from-[#00F2FE] to-[#0072FF] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#0072FF]/25 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,242,254,0.4)] disabled:opacity-50 dark:shadow-[#0072FF]/20"
        >
          {status === "loading" ? "Subscribing..." : "Get Daily Briefing →"}
        </button>
      </div>

      {message && (
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-3 text-center text-sm ${
            status === "success" ? "text-emerald-400 dark:text-emerald-300" : "text-red-400 dark:text-red-300"
          }`}
        >
          {message}
        </motion.p>
      )}

      <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
        Join engineers, researchers, and AI builders. 100% free, unsubscribe anytime.
      </p>
    </motion.form>
  );
}

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.7 }}
      className="mt-10 w-full max-w-md"
    >
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          className="flex-1 rounded-full border border-glass-border bg-glass-highlight px-5 py-3 text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20 dark:text-white dark:placeholder-gray-400"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-full bg-gradient-to-r from-accent-blue to-accent-cyan px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-blue/25 transition-all duration-300 hover:shadow-xl hover:shadow-accent-blue/40 disabled:opacity-50 dark:shadow-accent-blue/20"
        >
          {status === "loading" ? "Subscribing..." : "Subscribe"}
        </button>
      </div>

      {message && (
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-3 text-center text-sm ${
            status === "success" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          {message}
        </motion.p>
      )}

      <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
        Get the latest AI news delivered to your inbox every day.
      </p>
    </motion.form>
  );
}

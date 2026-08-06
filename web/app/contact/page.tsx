"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import usePrefersReducedMotion from "@/hooks/use-prefers-reduced-motion";
import Image from "next/image";

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const prefersReducedMotion = usePrefersReducedMotion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setStatus("success");
      setMessage("Thanks for reaching out! We'll get back to you soon.");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-4"
        >
          <Image
            src="/images/gradient icon.png"
            alt="The Gradient Logo"
            width={24}
            height={24}
            className="mb-4"
          />
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-gray-400">
            Contact
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-100 sm:text-5xl">
            Get in Touch
          </h1>
          <p className="mt-4 text-gray-400">
            Have a question, suggestion, or just want to say hello? We'd love to hear from you.
          </p>

          <div className="mt-8 space-y-6">
            {[
              { label: "Email", value: "hello@thegradient.ai", icon: "✉" },
              { label: "Twitter", value: "@thegradientai", icon: "𝕏" },
              { label: "GitHub", value: "thegradient-ai", icon: "GH" },
            ].map((contact) => (
              <div key={contact.label} className="flex items-center gap-3">
                <span className="text-lg">{contact.icon}</span>
                <div>
                  <p className="text-xs font-medium text-gray-500">{contact.label}</p>
                  <p className="text-sm text-gray-300">{contact.value}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="lg:col-span-8"
        >
          <div className="rounded-2xl border border-white/[0.06] bg-bg-card/60 backdrop-blur-sm p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-300">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  className="input-field"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-300">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  className="input-field"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="subject" className="mb-2 block text-sm font-medium text-gray-300">
                  Subject
                </label>
                <input
                  id="subject"
                  type="text"
                  required
                  className="input-field"
                  placeholder="What's this about?"
                />
              </div>
              <div>
                <label htmlFor="message" className="mb-2 block text-sm font-medium text-gray-300">
                  Message
                </label>
                <textarea
                  id="message"
                  required
                  rows={5}
                  className="input-field resize-none"
                  placeholder="Your message..."
                />
              </div>

              <motion.button
                type="submit"
                disabled={status === "loading"}
                className="btn-primary w-full"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {status === "loading" ? "Sending..." : "Send Message"}
              </motion.button>

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
          </div>
        </motion.div>
      </div>
    </div>
  );
}
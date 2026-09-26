"use client";
import { useState } from "react";
export default function SubscribeBox() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setStatus("loading"); setMessage("");
    try { const response = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }); const data = await response.json();
      if (response.ok) { setStatus("success"); setMessage("You're subscribed! Check your inbox for confirmation."); setEmail(""); }
      else { setStatus("error"); setMessage(data.error || "Something went wrong. Please try again."); }
    } catch { setStatus("error"); setMessage("Something went wrong. Please try again."); }
  };
  return <form onSubmit={handleSubmit} className="w-full max-w-xl"><div className="flex flex-col gap-2 sm:flex-row"><label className="sr-only" htmlFor="briefing-email">Email address</label><input id="briefing-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required className="min-w-0 flex-1 border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)]"/><button type="submit" disabled={status === "loading"} className="bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60">{status === "loading" ? "Subscribing…" : "Get Daily Briefing"}</button></div>{message && <p role="status" aria-live="polite" className={`mt-3 text-sm ${status === "success" ? "text-[var(--success)]" : "text-[var(--error)]"}`}>{message}</p>}</form>;
}

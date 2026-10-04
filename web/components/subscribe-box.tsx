"use client";
import { useId, useState } from "react";
import Link from "next/link";

export default function SubscribeBox({
  available = true,
}: {
  available?: boolean;
}) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (status === "loading" || !available) return;
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus("error");
        setMessage(
          data.error || "We couldn’t subscribe you. Please try again.",
        );
        return;
      }
      setStatus("success");
      setMessage("You’re subscribed. Thanks for reading The Gradient.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("We couldn’t connect. Please try again in a moment.");
    }
  }
  if (!available)
    return (
      <div className="subscription-unavailable">
        <p>
          Email signup is currently unavailable. You can read every edition in
          the archive.
        </p>
        <Link className="text-link mt-3" href="/archive">
          Explore the archive <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  return (
    <form
      onSubmit={handleSubmit}
      className="subscribe-form"
      aria-busy={status === "loading"}
    >
      <label htmlFor={id}>Email address</label>
      <div className="subscribe-controls">
        <input
          id={id}
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          disabled={status === "loading"}
          aria-describedby={message ? id + "-status" : undefined}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="primary-button"
        >
          {status === "loading" ? "Subscribing…" : "Get the briefing"}
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <p
        id={id + "-status"}
        role="status"
        aria-live="polite"
        className={`subscribe-status ${status === "error" ? "text-[var(--error)]" : "text-[var(--success)]"}`}
      >
        {message}
      </p>
    </form>
  );
}

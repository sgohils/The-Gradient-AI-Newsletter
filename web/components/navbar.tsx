"use client";
import { useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/theme-toggle";
export default function Navbar() {
  const [open, setOpen] = useState(false);
  return <header className="border-b border-[var(--border)] bg-[var(--background)]"><nav aria-label="Main navigation" className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
    <Link href="/" className="flex items-center gap-3" aria-label="The Gradient home"><span aria-hidden="true" className="h-7 w-[3px] bg-[var(--accent)]"/><span className="font-serif text-[22px] font-semibold tracking-[-.05em]">The Gradient</span><span className="hidden border-l border-[var(--border)] pl-3 text-[10px] uppercase tracking-[.14em] text-[var(--text-muted)] sm:block">AI, in focus</span></Link>
    <div className="hidden items-center gap-7 md:flex"><Link className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)]" href="/archive">Archive</Link><Link className="text-sm font-semibold text-[var(--accent)]" href="/subscribe">Subscribe</Link><ThemeToggle /></div>
    <div className="flex items-center gap-2 md:hidden"><ThemeToggle/><button type="button" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen(!open)} className="border border-[var(--border)] px-3 py-2 text-sm">{open ? "Close" : "Menu"}</button></div>
  </nav>{open && <div id="mobile-navigation" className="flex gap-6 border-t border-[var(--border)] px-5 py-4 md:hidden"><Link onClick={() => setOpen(false)} href="/archive">Archive</Link><Link onClick={() => setOpen(false)} href="/subscribe">Subscribe</Link></div>}</header>;
}

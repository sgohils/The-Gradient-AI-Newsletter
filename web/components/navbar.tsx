"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/theme-toggle";

const links = [
  { href: "/archive", label: "Archive" },
  { href: "/about", label: "About" },
  { href: "/subscribe", label: "Subscribe" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuButton = useRef<HTMLButtonElement>(null);
  return (
    <header
      className="masthead"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          menuButton.current?.focus();
        }
      }}
    >
      <nav
        className="site-container masthead-inner"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className="wordmark"
          aria-label="The Gradient home"
          onClick={() => setOpen(false)}
        >
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>
            The Gradient<span className="wordmark-tagline">AI, IN FOCUS</span>
          </span>
        </Link>
        <div className="desktop-navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={
                pathname === link.href ||
                (link.href === "/archive" && pathname.startsWith("/archive/"))
                  ? "page"
                  : undefined
              }
              className={
                link.href === "/subscribe" ? "nav-subscribe" : "nav-link"
              }
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="navigation-controls">
          <ThemeToggle />
          <button
            type="button"
            ref={menuButton}
            className="menu-button"
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </nav>
      <nav
        id="mobile-navigation"
        aria-label="Mobile navigation"
        className="mobile-navigation site-container"
        hidden={!open}
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={pathname === link.href ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            {link.label}
            <span aria-hidden="true">↗</span>
          </Link>
        ))}
      </nav>
    </header>
  );
}

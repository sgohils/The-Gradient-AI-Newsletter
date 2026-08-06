"use client";

import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    Product: [
      { href: "/", label: "Home" },
      { href: "/archive", label: "Archive" },
      { href: "/subscribe", label: "Subscribe" },
      { href: "/pricing", label: "Pricing" },
    ],
    Resources: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/archive", label: "Newsletter Archive" },
    ],
    Legal: [
      { href: "#", label: "Privacy Policy" },
      { href: "#", label: "Terms of Service" },
      { href: "#", label: "Unsubscribe" },
    ],
  };

  return (
    <footer className="relative bg-bg-secondary">
      <div className="absolute inset-x-0 top-0 h-px overflow-hidden">
        <div className="h-full w-full bg-gradient-to-r from-transparent via-accent-blue/30 via-accent-indigo/30 to-transparent" />
      </div>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-white"
            >
              <Image
                src="/images/gradient horizontal logo.png"
                alt="The Gradient Logo"
                width={36}
                height={36}
                className="rounded-lg"
              />
              The Gradient
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-gray-400">
              AI-powered daily newsletter delivering the most important stories in AI and technology.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {[
                { href: "#", label: "Twitter", icon: "𝕏" },
                { href: "#", label: "GitHub", icon: "GH" },
                { href: "#", label: "LinkedIn", icon: "in" },
              ].map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm font-medium text-gray-400 transition-all duration-300 hover:border-accent-blue/30 hover:bg-accent-blue/10 hover:text-accent-blue"
                  aria-label={social.label}
                >
                  {social.icon}
                </Link>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-300">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map(({ href, label }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-gray-400 transition-colors duration-200 hover:text-accent-blue dark:hover:text-accent-cyan"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row">
          <p className="text-sm text-gray-500">
            © {currentYear} The Gradient. All rights reserved.
          </p>
          <p className="text-sm text-gray-500">
            Crafted with care for AI enthusiasts.
          </p>
        </div>
      </div>
    </footer>
  );
}
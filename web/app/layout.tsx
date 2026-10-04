import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ThemeProvider from "@/components/theme-provider";
import ErrorBoundary from "@/components/error-boundary";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { siteUrl, SITE_DESCRIPTION } from "@/lib/site";
import "@/app/globals.css";
import "@/app/editorial.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: "The Gradient — AI, in focus",
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "The Gradient",
    description: SITE_DESCRIPTION,
    type: "website",
    siteName: "The Gradient",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Gradient",
    description: SITE_DESCRIPTION,
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} bg-background text-foreground antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <ErrorBoundary>
            <Navbar />
          </ErrorBoundary>
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <ErrorBoundary>
            <Footer />
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}

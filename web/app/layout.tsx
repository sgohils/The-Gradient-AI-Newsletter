import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ThemeProvider from "@/components/theme-provider";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "The Gradient",
  description: "AI newsletter with daily updates",
  icons: {
    icon: "/images/gradient icon.png",
    shortcut: "/images/gradient icon.png",
    apple: "/images/gradient icon.png",
  },
  openGraph: {
    title: "The Gradient",
    description: "AI newsletter with daily updates",
    images: ["/images/gradient horizontal logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Gradient",
    description: "AI newsletter with daily updates",
    images: ["/images/gradient horizontal logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground antialiased transition-colors duration-300`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}

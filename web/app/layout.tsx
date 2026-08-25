import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import ThemeProvider from "@/components/theme-provider";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export const metadata: Metadata = {
  title: "The Gradient",
  description: "AI newsletter with daily updates",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jakarta.variable} bg-background text-foreground antialiased transition-colors duration-300 font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
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

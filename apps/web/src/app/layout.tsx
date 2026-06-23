import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  metadataBase: new URL("https://agentwise.app"),
  title: "AgentWise — Non-Custodial Savings for Humans & AI Agents",
  description:
    "Automated goal-based micro-savings powered by Yellow state channels and XRPL. Built for Nigeria and Africa.",
  keywords: ["savings", "XRPL", "RLUSD", "DeFi", "Africa", "Nigeria", "AI agent"],
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "AgentWise — Non-Custodial Savings",
    description: "The Cowrywise for the agent economy. Save in RLUSD with AI-powered automation.",
    type: "website",
    images: [{ url: "/icon.svg", width: 1024, height: 1024, alt: "AgentWise" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/*
        suppressHydrationWarning is required here because next-themes
        injects the class/style attribute on <html> on the client side
        to avoid a flash of wrong theme.
      */}
      <body suppressHydrationWarning>
        <Providers>
          <div className="min-h-screen flex flex-col bg-surface-50 dark:bg-surface-900 transition-colors duration-200">
            <Navbar />
            <main className="flex-1 container mx-auto max-w-5xl px-4 py-8">
              {children}
            </main>
            <footer className="border-t border-slate-100 dark:border-slate-800 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
              AgentWise © 2026 · Built on XRPL + Yellow Nitrolite · Open Source
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}

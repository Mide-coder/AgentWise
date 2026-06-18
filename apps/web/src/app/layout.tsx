import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "AgentWise — Non-Custodial Savings for Humans & AI Agents",
  description:
    "Automated goal-based micro-savings powered by Yellow state channels and XRPL. Built for Nigeria and Africa.",
  keywords: ["savings", "XRPL", "RLUSD", "DeFi", "Africa", "Nigeria", "AI agent"],
  openGraph: {
    title: "AgentWise",
    description: "The Cowrywise for the agent economy",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 container mx-auto max-w-5xl px-4 py-8">
              {children}
            </main>
            <footer className="border-t border-slate-100 py-6 text-center text-sm text-slate-400">
              AgentWise © 2026 · Built on XRPL + Yellow Nitrolite · Open Source
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}

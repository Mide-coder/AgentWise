"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWalletButton } from "@/components/wallet/ConnectWalletButton";
import { clsx } from "clsx";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-100">
      <div className="container mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <span className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white text-sm font-bold">
            AW
          </span>
          <span className="text-surface-900">AgentWise</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "text-sm font-medium transition-colors",
                pathname === link.href
                  ? "text-brand-600"
                  : "text-slate-500 hover:text-surface-900"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Wallet */}
        <ConnectWalletButton />
      </div>
    </header>
  );
}

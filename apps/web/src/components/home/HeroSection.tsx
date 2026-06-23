import Link from "next/link";
import { ArrowRight, Bot, Zap } from "lucide-react";

export function HeroSection() {
  return (
    <section className="text-center py-12 md:py-20">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 bg-brand-50 dark:bg-brand-900 border border-brand-100 dark:border-brand-700 text-brand-700 dark:text-brand-100 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
        <Zap className="w-3 h-3" />
        Built on XRPL + Yellow Nitrolite State Channels
      </div>

      <h1 className="text-4xl md:text-6xl font-bold text-surface-900 dark:text-slate-100 leading-tight mb-6">
        Save smarter.{" "}
        <span className="text-brand-600">Non-custodially.</span>
        <br />
        For humans{" "}
        <span className="inline-flex items-center gap-1 text-accent-500">
          <Bot className="w-8 h-8 md:w-12 md:h-12" />
        </span>{" "}
        and AI agents.
      </h1>

      <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
        AgentWise brings automated goal-based savings to Nigeria and Africa — without trusting a
        centralized company with your money. Set goals, automate micro-deposits via state channels,
        and store value safely in RLUSD.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/dashboard" className="btn-primary text-base px-8 py-4">
          Start Saving
          <ArrowRight className="w-5 h-5" />
        </Link>
        <a
          href="https://github.com/agentwise"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary text-base px-8 py-4"
        >
          View on GitHub
        </a>
      </div>

      {/* Trust badges */}
      <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-slate-500 dark:text-slate-400">
        <span>✅ Non-custodial</span>
        <span>✅ RLUSD stable value</span>
        <span>✅ Near-zero fees</span>
        <span>✅ AI agent ready</span>
        <span>✅ Open source</span>
      </div>
    </section>
  );
}

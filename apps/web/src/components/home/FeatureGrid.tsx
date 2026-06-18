import { Target, Zap, Shield, Bot, TrendingUp, Globe } from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Goal-Based Saving",
    description:
      "Create up to 20 savings goals — emergency fund, travel, education, business capital — each with its own XRPL account.",
    color: "text-brand-600 bg-brand-50",
  },
  {
    icon: Zap,
    title: "Instant Micro-Deposits",
    description:
      "Recurring deposits run off-chain through Yellow Nitrolite state channels. Near-instant, near-zero fees.",
    color: "text-accent-500 bg-orange-50",
  },
  {
    icon: Shield,
    title: "Programmable Rules",
    description:
      "XRPL Hooks enforce your rules on-chain: auto-save 10% of income, daily spending limits, goal-release conditions.",
    color: "text-blue-600 bg-blue-50",
  },
  {
    icon: Bot,
    title: "AI Agent Ready",
    description:
      "Your AI agent can monitor income and trigger auto-top-ups autonomously — no human action required.",
    color: "text-purple-600 bg-purple-50",
  },
  {
    icon: TrendingUp,
    title: "RLUSD Stable Value",
    description:
      "All savings held in RLUSD — a regulated USD stablecoin on XRPL. No currency volatility eroding your goals.",
    color: "text-emerald-600 bg-emerald-50",
  },
  {
    icon: Globe,
    title: "Built for Africa",
    description:
      "Optimized for freelancers, gig workers, and diaspora remittances. Mobile-first, low-data friendly.",
    color: "text-rose-600 bg-rose-50",
  },
];

export function FeatureGrid() {
  return (
    <section>
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-surface-900 mb-3">
          Everything Cowrywise has, without the custodial risk
        </h2>
        <p className="text-slate-500 max-w-xl mx-auto">
          The familiar savings experience you know, rebuilt on trustless infrastructure for the AI
          agent era.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="card hover:shadow-md transition-shadow">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-surface-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

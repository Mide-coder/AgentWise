const steps = [
  {
    step: "01",
    title: "Connect your XRPL wallet",
    description: "Use GEM Wallet, Crossmark, or any XRPL-compatible wallet. We never hold your keys.",
  },
  {
    step: "02",
    title: "Create a savings goal",
    description:
      "Name your goal, set a target amount in RLUSD, and pick a deadline. A dedicated XRPL account is generated.",
  },
  {
    step: "03",
    title: "Set up auto-save rules",
    description:
      "Configure a recurring deposit (e.g., ₦100 daily). Yellow state channels handle this off-chain — no gas, no delays.",
  },
  {
    step: "04",
    title: "Hooks enforce your rules",
    description:
      "XRPL Hooks on your goal account automatically enforce savings rules, spending guards, and release conditions.",
  },
  {
    step: "05",
    title: "Net balance settles on-chain",
    description:
      "When you're ready, the channel closes and your RLUSD settles directly to your XRPL goal account in < 5 seconds.",
  },
];

export function HowItWorks() {
  return (
    <section>
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-surface-900 mb-3">How it works</h2>
        <p className="text-slate-500 max-w-xl mx-auto">
          Five steps from wallet connect to on-chain settlement.
        </p>
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-7 top-0 bottom-0 w-px bg-slate-100 hidden sm:block" aria-hidden="true" />

        <div className="space-y-8">
          {steps.map((item, idx) => (
            <div key={idx} className="flex gap-6">
              {/* Step number */}
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-bold text-lg relative z-10">
                {item.step}
              </div>
              {/* Content */}
              <div className="flex-1 pt-2">
                <h3 className="font-semibold text-surface-900 mb-1">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

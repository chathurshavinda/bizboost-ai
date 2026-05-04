"use client";

import Link from "next/link";
import Reveal from "./Reveal";

type Plan = {
  name: string;
  price: string;
  note: string;
  features: string[];
  highlight?: boolean;
};

const plans: Plan[] = [
  {
    name: "Starter",
    price: "Free",
    note: "Get started fast",
    features: ["Basic strategy", "Weekly content ideas", "Single business profile"],
  },
  {
    name: "Growth",
    price: "LKR 6,900/mo",
    note: "Most popular for SMEs",
    features: ["Advanced strategy", "Content calendar", "Insight summaries"],
    highlight: true,
  },
  {
    name: "Pro",
    price: "LKR 14,900/mo",
    note: "For scaling teams",
    features: ["Multi-brand workflow", "Priority support", "Deeper AI insights"],
  },
];

export default function PricingPreview() {
  return (
    <Reveal className="max-w-[1160px] mx-auto mt-10" delayMs={120}>
      <section id="pricing" className="rounded-3xl border border-black/15 bg-white/60 backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.10)] p-6 md:p-8">
        <p className="text-[11px] tracking-[0.12em] uppercase text-black/60 font-semibold">Pricing</p>
        <h2 className="text-2xl md:text-3xl font-extrabold text-black mt-1">Simple Pricing Preview</h2>
        <p className="text-black/60 mt-2">Choose a plan that matches your stage.</p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-2xl border p-5 shadow-[0_10px_28px_rgba(15,23,42,0.07)] transition-all duration-300 hover:-translate-y-1 ${
                plan.highlight
                  ? "border-black/20 bg-gradient-to-b from-neutral-100/95 to-white hover:shadow-[0_18px_45px_rgba(0,0,0,0.14)]"
                  : "border-black/10 bg-gradient-to-b from-white/90 to-neutral-100/80 hover:shadow-[0_18px_45px_rgba(0,0,0,0.12)]"
              }`}
            >
              <h3 className="text-lg font-semibold text-black">{plan.name}</h3>
              <p className="mt-1 text-2xl font-extrabold text-black">{plan.price}</p>
              <p className="text-sm text-black/60 mt-1">{plan.note}</p>

              <ul className="mt-4 space-y-2 text-sm text-black/70">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>

              <Link className="btn primary mt-5" href="/signup">
                Choose {plan.name}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </Reveal>
  );
}

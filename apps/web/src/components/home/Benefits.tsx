"use client";

import Reveal from "./Reveal";

const benefits = [
  "Save hours every week",
  "Post consistently",
  "AI-backed decisions",
  "Fresh content ideas",
  "Built for Sri Lankan SMEs",
  "Track progress clearly",
];

export default function Benefits() {
  return (
    <Reveal className="max-w-[1160px] mx-auto mt-10" delayMs={60}>
      <section className="rounded-3xl border border-black/15 bg-white/60 backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.10)] p-6 md:p-8">
        <p className="text-[11px] tracking-[0.12em] uppercase text-black/60 font-semibold">Benefits</p>
        <h2 className="text-2xl md:text-3xl font-extrabold text-black mt-1">Why BizBoost AI</h2>
        <p className="text-black/60 mt-2">Clear value for founders and small teams.</p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {benefits.map((benefit) => (
            <div
              key={benefit}
              className="rounded-2xl border border-black/10 bg-gradient-to-b from-white/90 to-neutral-100/80 p-5 text-black/75 shadow-[0_10px_28px_rgba(0,0,0,0.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(0,0,0,0.12)] hover:border-black/20"
            >
              <p className="text-sm md:text-base leading-6">{benefit}</p>
            </div>
          ))}
        </div>
      </section>
    </Reveal>
  );
}

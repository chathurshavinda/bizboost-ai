"use client";

import Link from "next/link";
import Reveal from "./Reveal";

export default function FinalCTA() {
  return (
    <Reveal className="max-w-[1160px] mx-auto mt-10 mb-2" delayMs={180}>
      <section className="rounded-3xl border border-black/15 bg-gradient-to-r from-neutral-100/90 via-white to-neutral-100/90 backdrop-blur-2xl p-6 md:p-10 shadow-[0_24px_70px_rgba(0,0,0,0.10)]">
        <h2 className="text-2xl md:text-4xl font-extrabold text-black leading-tight">
          Start planning your next 30 days in minutes
        </h2>
        <p className="mt-3 text-black/65 max-w-2xl text-sm md:text-base">
          Set up once, then generate clear weekly direction your team can execute immediately.
        </p>

        <div className="mt-5">
          <Link className="btn primary" href="/business-details">
            Go to Business Details
          </Link>
        </div>
      </section>
    </Reveal>
  );
}

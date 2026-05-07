"use client";
import Reveal from "./Reveal";
const steps = [
    {
        title: "Plan",
        description: "Add your business goals and audience in minutes.",
    },
    {
        title: "Create",
        description: "Generate campaign ideas and ready-to-use content.",
    },
    {
        title: "Schedule",
        description: "Turn ideas into a clean weekly posting plan.",
    },
    {
        title: "Track",
        description: "See results and improve your next cycle fast.",
    },
];
export default function HowItWorks() {
    return (<Reveal className="max-w-[1160px] mx-auto mt-10" delayMs={30}>
      <section id="how-it-works" className="rounded-3xl border border-black/15 bg-white/60 backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.10)] p-6 md:p-8">
        <div className="mb-6 md:mb-7">
          <p className="text-[11px] tracking-[0.12em] uppercase text-black/60 font-semibold">Workflow</p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-black mt-1">How It Works</h2>
          <p className="text-black/60 mt-2">Simple steps. Clear output. Quick execution.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {steps.map((step, index) => (<article key={step.title} className="rounded-2xl border border-black/10 bg-gradient-to-b from-white/90 to-neutral-100/80 p-5 shadow-[0_10px_28px_rgba(0,0,0,0.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(0,0,0,0.12)] hover:border-black/20">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-black to-neutral-700 text-white text-sm font-bold flex items-center justify-center mb-3 shadow-[0_10px_25px_rgba(0,0,0,0.28)]">
                {index + 1}
              </div>
              <h3 className="text-lg font-semibold text-black">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-black/65">{step.description}</p>
            </article>))}
        </div>
      </section>
    </Reveal>);
}

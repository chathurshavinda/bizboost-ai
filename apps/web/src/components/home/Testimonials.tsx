"use client";
import Reveal from "./Reveal";
const testimonials = [
    {
        name: "Nadeesha Perera",
        role: "Boutique Owner, Colombo",
        quote: "We moved from random posting to a clear weekly plan.",
    },
    {
        name: "Tharindu Silva",
        role: "Cafe Founder, Galle",
        quote: "Campaign prep now takes minutes, not hours.",
    },
    {
        name: "Sasini Fernando",
        role: "Beauty Studio, Kandy",
        quote: "We market more consistently and improve every month.",
    },
];
export default function Testimonials() {
    return (<Reveal className="max-w-[1160px] mx-auto mt-10" delayMs={90}>
      <section className="rounded-3xl border border-white/70 bg-white/65 backdrop-blur-2xl shadow-[0_24px_70px_rgba(15,23,42,0.10)] p-6 md:p-8">
        <p className="text-[11px] tracking-[0.12em] uppercase text-violet-500 font-semibold">Social Proof</p>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">What SMEs Say</h2>
        <p className="text-slate-500 mt-2">Trusted by local businesses across Sri Lanka.</p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((item) => (<article key={item.name} className="rounded-2xl border border-white/85 bg-gradient-to-b from-white/95 to-slate-50/85 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(124,58,237,0.14)] hover:border-violet-200">
              <p className="text-slate-700 leading-6 text-sm font-medium">“{item.quote}”</p>
              <div className="mt-4">
                <p className="font-semibold text-slate-900 text-sm">{item.name}</p>
                <p className="text-xs text-slate-500">{item.role}</p>
              </div>
            </article>))}
        </div>
      </section>
    </Reveal>);
}

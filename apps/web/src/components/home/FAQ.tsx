"use client";

import { useState } from "react";
import Reveal from "./Reveal";

type FaqItem = {
  question: string;
  answer: string;
};

const faqs: FaqItem[] = [
  {
    question: "How does BizBoost AI create plans?",
    answer: "It uses your business details and goals to suggest practical campaigns, content themes, and weekly actions.",
  },
  {
    question: "Can Sri Lankan SMEs use this easily?",
    answer: "Yes. The workflow is built for small teams and founders who need quick, local-market friendly planning.",
  },
  {
    question: "How long does setup take?",
    answer: "Most businesses can set up their profile and generate their first plan in under 10 minutes.",
  },
  {
    question: "Is my business data private?",
    answer: "Your profile data is stored securely and used only to personalize your planning and recommendations.",
  },
  {
    question: "Do I need technical skills?",
    answer: "No. BizBoost AI is designed for non-technical users with simple guided steps.",
  },
  {
    question: "Can I start free and upgrade later?",
    answer: "Yes. You can begin with Starter and move to Growth or Pro as your needs expand.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Reveal className="max-w-[1160px] mx-auto mt-10" delayMs={150}>
      <section id="faq" className="rounded-3xl border border-black/15 bg-white/60 backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.10)] p-6 md:p-8">
        <p className="text-[11px] tracking-[0.12em] uppercase text-black/60 font-semibold">FAQ</p>
        <h2 className="text-2xl md:text-3xl font-extrabold text-black mt-1">Frequently Asked Questions</h2>
        <p className="text-black/60 mt-2">Everything important at a glance.</p>

        <div className="mt-6 space-y-3">
          {faqs.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <article
                key={item.question}
                className="rounded-2xl border border-black/10 bg-gradient-to-b from-white/90 to-neutral-100/80 shadow-[0_10px_28px_rgba(0,0,0,0.07)]"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold text-black">{item.question}</span>
                  <span className="text-black/55">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && <p className="px-5 pb-5 text-sm leading-6 text-black/70">{item.answer}</p>}
              </article>
            );
          })}
        </div>
      </section>
    </Reveal>
  );
}

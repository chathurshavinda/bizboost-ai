"use client";
import type { ReactNode } from "react";
import { useInView } from "../../lib/useInView";
type RevealProps = {
    children: ReactNode;
    className?: string;
    delayMs?: number;
    triggerOnce?: boolean;
};
export default function Reveal({ children, className, delayMs = 0, triggerOnce = true, }: RevealProps) {
    const { ref, inView, prefersReducedMotion } = useInView<HTMLDivElement>({
        triggerOnce,
        threshold: 0.18,
        rootMargin: "0px 0px -8% 0px",
    });
    const style = prefersReducedMotion
        ? undefined
        : {
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0px)" : "translateY(26px)",
            transitionProperty: "opacity, transform",
            transitionDuration: "680ms",
            transitionTimingFunction: "cubic-bezier(0.2, 0.65, 0.2, 1)",
            transitionDelay: `${delayMs}ms`,
            willChange: "opacity, transform",
        };
    return (<div ref={ref} className={className} style={style}>
      {children}
    </div>);
}

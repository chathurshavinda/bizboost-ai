"use client";
import { useEffect, useRef, useState } from "react";
type UseInViewOptions = {
    rootMargin?: string;
    threshold?: number;
    triggerOnce?: boolean;
};
export function useInView<T extends HTMLElement = HTMLDivElement>(options: UseInViewOptions = {}) {
    const { rootMargin = "0px 0px -10% 0px", threshold = 0.2, triggerOnce = true } = options;
    const ref = useRef<T | null>(null);
    const [inView, setInView] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) {
            return;
        }
        const media = window.matchMedia("(prefers-reduced-motion: reduce)");
        const onChange = () => {
            const reduced = media.matches;
            setPrefersReducedMotion(reduced);
            if (reduced) {
                setInView(true);
            }
        };
        onChange();
        media.addEventListener("change", onChange);
        return () => media.removeEventListener("change", onChange);
    }, []);
    useEffect(() => {
        if (prefersReducedMotion) {
            setInView(true);
            return;
        }
        const element = ref.current;
        if (!element || typeof IntersectionObserver === "undefined") {
            setInView(true);
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    if (triggerOnce) {
                        observer.unobserve(entry.target);
                    }
                }
                else if (!triggerOnce) {
                    setInView(false);
                }
            });
        }, { rootMargin, threshold });
        observer.observe(element);
        return () => observer.disconnect();
    }, [prefersReducedMotion, rootMargin, threshold, triggerOnce]);
    return { ref, inView, prefersReducedMotion };
}

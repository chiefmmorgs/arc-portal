'use client';

import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Custom hook to set up Lenis smooth scrolling + GSAP ScrollTrigger.
 * Call this once in your root layout component.
 */
export function useSmoothScroll() {
    const lenisRef = useRef<Lenis | null>(null);

    useEffect(() => {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            // @ts-ignore — Lenis smoothWheel option
            smoothWheel: true,
        });

        lenisRef.current = lenis;

        // Connect Lenis to GSAP ScrollTrigger
        lenis.on('scroll', ScrollTrigger.update);

        gsap.ticker.add((time: number) => {
            lenis.raf(time * 1000);
        });

        gsap.ticker.lagSmoothing(0);

        return () => {
            lenis.destroy();
            gsap.ticker.remove(lenis.raf as any);
        };
    }, []);

    return lenisRef;
}

/**
 * Hook to animate elements on mount with GSAP.
 * Pass a ref and it will fade-in + slide up on mount.
 */
export function usePageTransition(containerRef: React.RefObject<HTMLElement | null>) {
    useEffect(() => {
        if (!containerRef.current) return;

        const el = containerRef.current;

        // Animate the page content in
        gsap.fromTo(el,
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
        );

        // Animate individual cards / sections with stagger
        const cards = el.querySelectorAll('[data-animate]');
        if (cards.length > 0) {
            gsap.fromTo(cards,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out', delay: 0.15 }
            );
        }

        // Setup ScrollTrigger for elements further down the page
        const scrollElements = el.querySelectorAll('[data-scroll-animate]');
        scrollElements.forEach((elem) => {
            gsap.fromTo(elem,
                { opacity: 0, y: 30 },
                {
                    opacity: 1, y: 0, duration: 0.6, ease: 'power2.out',
                    scrollTrigger: {
                        trigger: elem,
                        start: 'top 85%',
                        toggleActions: 'play none none none',
                    }
                }
            );
        });

    }, [containerRef]);
}

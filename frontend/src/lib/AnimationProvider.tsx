'use client';

import { useRef, useEffect } from 'react';
import { useSmoothScroll, usePageTransition } from '@/lib/use-animations';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';

/**
 * Wrap page content with this component to get:
 * 1. Lenis smooth scrolling
 * 2. GSAP page enter animations (fade + slide)
 * 3. Automatic re-animation on route change
 *
 * Usage in layout.tsx:
 *   import { AnimationProvider } from '@/lib/AnimationProvider';
 *   <AnimationProvider>{children}</AnimationProvider>
 *
 * Note: Barba.js is not compatible with Next.js App Router,
 * so we use GSAP-based transitions that achieve the same effect.
 */
export function AnimationProvider({ children }: { children: React.ReactNode }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    // Initialize Lenis smooth scroll
    useSmoothScroll();

    // Animate page content on route change
    useEffect(() => {
        if (!containerRef.current) return;

        // Quick fade-in on route change
        gsap.fromTo(containerRef.current,
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
        );

        // Stagger animate any data-animate elements
        const animateEls = containerRef.current.querySelectorAll('[data-animate]');
        if (animateEls.length > 0) {
            gsap.fromTo(animateEls,
                { opacity: 0, y: 16 },
                { opacity: 1, y: 0, duration: 0.35, stagger: 0.06, ease: 'power2.out', delay: 0.1 }
            );
        }
    }, [pathname]);

    return (
        <div ref={containerRef} style={{ minHeight: '100%' }}>
            {children}
        </div>
    );
}

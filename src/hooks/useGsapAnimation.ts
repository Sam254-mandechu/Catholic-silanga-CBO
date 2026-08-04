import { useEffect } from 'react';
import { gsap } from 'gsap';

export function useGsapAnimation(
  animation: gsap.core.Timeline | gsap.core.Tween | undefined,
  dependency: any[] = []
) {
  useEffect(() => {
    if (!animation) return;
    return () => {
      animation.kill();
    };
  }, dependency);
}

export function useScrollAnimation(selector: string, options?: any) {
  useEffect(() => {
    const elements = document.querySelectorAll(selector);
    if (elements.length === 0) return;

    gsap.fromTo(
      elements,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: elements[0],
          start: 'top 80%',
          end: 'bottom 20%',
          toggleActions: 'play none none reverse',
        },
        ...options,
      }
    );
  }, [selector]);
}

import { useEffect, useRef, useState } from "react";

/**
 * Returns a ref + boolean — once the ref'd element scrolls into view,
 * `isVisible` flips to true and stays true (one-shot).
 */
export function useScrollAnimation(threshold = 0.12) {
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}
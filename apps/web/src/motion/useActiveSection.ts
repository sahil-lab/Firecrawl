import { useEffect, useState } from 'react';

/**
 * Reports which of the given element ids currently crosses a reading line 40% down the
 * viewport, or null when none does. `ids` must be a stable reference.
 */
export function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window.IntersectionObserver !== 'function') return;
    const crossing = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) crossing.add(entry.target.id);
          else crossing.delete(entry.target.id);
        }
        setActive(ids.findLast((id) => crossing.has(id)) ?? null);
      },
      { rootMargin: '-40% 0px -60% 0px' },
    );
    for (const id of ids) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

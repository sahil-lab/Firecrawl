import { useEffect, useRef, useState } from 'react';
import { getReadiness } from './api';
import { BrandMark } from './components/icons';
import { Marquee } from './components/Marquee';
import { Scene } from './components/Scene';
import { setSceneMood } from './motion/sceneSignals';
import { useActiveSection } from './motion/useActiveSection';
import { usePointerEffects } from './motion/usePointerEffects';
import { useReveal } from './motion/useReveal';
import { useScrollEffects } from './motion/useScrollEffects';
import { useSplitOrder } from './motion/useSplitOrder';
import { Hero } from './sections/Hero';
import { ReadinessSection } from './sections/ReadinessSection';
import { ScopeSection } from './sections/ScopeSection';
import { SECTION_IDS } from './sections/sections';
import { SiteFooter } from './sections/SiteFooter';
import { SiteHeader } from './sections/SiteHeader';
import { ValidateSection } from './sections/ValidateSection';
import { errorMessage, type Health } from './status';

function App() {
  const [health, setHealth] = useState<Health>({ kind: 'checking' });
  const [healthAttempt, setHealthAttempt] = useState(0);
  const siteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    getReadiness()
      .then(() => {
        if (active) setHealth({ kind: 'ready' });
      })
      .catch((error: unknown) => {
        if (active) setHealth({ kind: 'unavailable', message: errorMessage(error) });
      });
    return () => {
      active = false;
    };
  }, [healthAttempt]);

  // The scene behind the page takes its colour from the same readiness answer as everything else.
  useEffect(() => {
    setSceneMood(health.kind);
  }, [health.kind]);

  useSplitOrder(siteRef);
  useReveal(siteRef);
  usePointerEffects(siteRef);
  useScrollEffects(siteRef);
  const activeSection = useActiveSection(SECTION_IDS);

  function handleRecheck() {
    setHealth({ kind: 'checking' });
    setHealthAttempt((attempt) => attempt + 1);
  }

  return (
    <div className="site" id="top" ref={siteRef}>
      <a className="skip-link" href="#validate">
        Skip to request validation
      </a>
      <Scene />
      <div className="scroll-progress" data-scroll-progress aria-hidden="true" />
      <SiteHeader health={health} activeSection={activeSection} />
      <main>
        <Hero />
        <Marquee />
        <ValidateSection />
        <ReadinessSection health={health} onRecheck={handleRecheck} />
        <ScopeSection />
      </main>
      <SiteFooter />
      <div className="grain" aria-hidden="true" />
      <div className="follower" data-follower aria-hidden="true" />
      <div className="curtain" aria-hidden="true">
        <BrandMark />
      </div>
    </div>
  );
}

export default App;

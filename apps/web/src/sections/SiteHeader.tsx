import { BrandMark } from '../components/icons';
import type { Health } from '../status';
import { SECTIONS } from './sections';

const STATUS_LABEL: Record<Health['kind'], string> = {
  checking: 'Checking',
  ready: 'Ready',
  unavailable: 'Unavailable',
};

export function SiteHeader({
  health,
  activeSection,
}: {
  health: Health;
  activeSection: string | null;
}) {
  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="Adaptive Crawl Lab home">
        <BrandMark />
        <span>Adaptive Crawl Lab</span>
      </a>
      <nav className="site-nav" aria-label="Sections">
        {SECTIONS.map((section, index) => (
          <a
            href={`#${section.id}`}
            aria-current={activeSection === section.id ? 'location' : undefined}
            key={section.id}
          >
            <span className="site-nav-index" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            {section.label}
          </a>
        ))}
      </nav>
      <a className="status-pill" href="#readiness" data-state={health.kind}>
        <span className="status-pill-dot" aria-hidden="true" />
        <span className="sr-only">Stack status: </span>
        <span>{STATUS_LABEL[health.kind]}</span>
      </a>
    </header>
  );
}

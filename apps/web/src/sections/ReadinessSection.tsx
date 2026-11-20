import type { Health } from '../status';

const STATUS_TEXT: Record<Health['kind'], string> = {
  checking: 'Checking readiness...',
  ready: 'API + database ready',
  unavailable: 'Stack unavailable',
};

const REQUEST_PATH = ['Browser', 'nginx proxy', 'Spring Boot API', 'PostgreSQL + schema V1'];

export function ReadinessSection({ health, onRecheck }: { health: Health; onRecheck: () => void }) {
  return (
    <section
      className="section"
      id="readiness"
      aria-labelledby="health-title"
      data-scene-pose="readiness"
    >
      <div className="section-head" data-reveal>
        <span className="section-index" aria-hidden="true">
          02
        </span>
        <h2 className="section-title" id="health-title" data-scene-clear>
          Stack readiness
        </h2>
        <p className="section-note eyebrow">LIVE LOCAL CHECK</p>
      </div>

      <div className="status-card" data-state={health.kind} data-reveal data-spot data-tilt>
        <div className="status-radar" aria-hidden="true" />
        <div className="status-body">
          <div className="health" role="status">
            <span className="status-dot" aria-hidden="true" />
            <span className="status-text" key={health.kind}>
              {STATUS_TEXT[health.kind]}
            </span>
          </div>
          <p className="hint">
            {health.kind === 'unavailable'
              ? health.message
              : 'Readiness requires PostgreSQL and the applied schema migration.'}
          </p>
          <button
            className="btn"
            type="button"
            disabled={health.kind === 'checking'}
            onClick={onRecheck}
            data-magnetic
          >
            <span className="btn-label">Check again</span>
          </button>
        </div>
        {/* One readiness answer covers the whole path, so the hops never show separate states. */}
        <ol className="status-path" role="list" aria-label="Path a readiness check travels">
          {REQUEST_PATH.map((hop) => (
            <li key={hop}>{hop}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}

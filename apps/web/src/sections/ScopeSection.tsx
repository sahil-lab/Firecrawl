const FACTS = [
  { figure: '0', label: 'Websites fetched' },
  { figure: '0', label: 'Crawl jobs created' },
  { figure: '100', label: 'Page budget ceiling' },
  { figure: '01', label: 'Current phase' },
];

const INCLUDED = [
  'Typed input and explicit errors',
  'Schema-aware health checks',
  'Local, isolated infrastructure',
];

const FUTURE = ['Robots rules', 'Permission enforcement', 'Fetching', 'Extraction', 'Benchmarks'];

export function ScopeSection() {
  return (
    <section className="section" id="scope" aria-labelledby="scope-title" data-scene-pose="scope">
      <div className="section-head" data-reveal>
        <span className="section-index" aria-hidden="true">
          03
        </span>
        <h2 className="section-title" id="scope-title" data-scene-clear>
          Foundation, <em>not execution.</em>
        </h2>
        <p className="section-note eyebrow">PURPOSEFULLY LIMITED</p>
      </div>

      <div className="sheet" data-reveal>
        <dl className="facts" data-reveal>
          {FACTS.map((fact) => (
            <div className="fact" key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.figure}</dd>
            </div>
          ))}
        </dl>
        <p className="facts-note">Fixed properties of this build, not live counters.</p>

        <div className="ledger">
          {/* role="list" restores list semantics that Safari drops when list-style is none. */}
          <div className="ledger-column" data-reveal>
            <h3 className="ledger-title">In this build</h3>
            <ul role="list">
              {INCLUDED.map((item, index) => (
                <li className="ledger-row" key={item}>
                  <span className="ledger-index" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="ledger-column ledger-future" data-reveal>
            <h3 className="ledger-title">Future phases — not implemented</h3>
            <ul role="list">
              {FUTURE.map((item) => (
                <li className="ledger-row" key={item}>
                  <span className="ledger-index" aria-hidden="true">
                    —
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

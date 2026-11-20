import { ArrowIcon } from '../components/icons';
import { SplitText } from '../components/SplitText';

const TITLE_LINES = [
  { text: 'Good crawling', accent: false },
  { text: 'starts with', accent: false },
  { text: 'clear boundaries.', accent: true },
];
const TITLE = TITLE_LINES.map((line) => line.text).join(' ');

export function Hero() {
  return (
    <section className="hero" aria-labelledby="page-title" data-scene-pose="hero">
      <div className="hero-frame" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="hero-scrim" aria-hidden="true" />

      {/*
        data-hero-layer marks what drifts with the pointer and as the hero scrolls away;
        data-hero-exit marks what changes only as it scrolls away.
      */}
      <div className="hero-top" data-intro-item data-hero-layer>
        <p className="eyebrow">A SAFER STARTING POINT</p>
        <span className="badge">LOCAL PROTOTYPE / PHASE 1</span>
      </div>

      {/*
        Assistive technology reads the sentence; the per-character copy is for the eye only.
        Each line's text is marked so the scene stays dim behind it.
      */}
      <h1 className="hero-title" id="page-title" data-hero-layer>
        <span className="sr-only">{TITLE}</span>
        <span className="hero-title-art" aria-hidden="true" data-split data-hero-exit>
          {TITLE_LINES.map((line) => (
            <span className="hero-line" key={line.text}>
              <span className="hero-line-text" data-scene-clear data-hero-exit>
                {line.accent ? (
                  <em>
                    <SplitText text={line.text} />
                  </em>
                ) : (
                  <SplitText text={line.text} />
                )}
              </span>
            </span>
          ))}
        </span>
      </h1>

      <div className="hero-bottom" data-intro-item data-hero-layer>
        <p className="lede">
          Check the local stack and validate a candidate request. No websites are fetched. No crawl
          jobs are created.
        </p>
        <div className="hero-actions">
          <a className="btn btn-primary" href="#validate" data-magnetic>
            <span className="btn-label">Validate a request</span>
            <span className="btn-icon">
              <ArrowIcon direction="down" />
            </span>
          </a>
          <a className="btn" href="#readiness" data-magnetic>
            <span className="btn-label">Check readiness</span>
          </a>
        </div>
      </div>

      <p className="hero-caption" data-intro-item data-hero-layer aria-hidden="true">
        <span>Fig. 01</span>
        <span>Boundary field — generative, not live data</span>
        <span className="hero-caption-hint">Move, press or scroll to fly it</span>
      </p>
    </section>
  );
}

import { SparkIcon } from './icons';

const STATEMENTS = [
  'No websites fetched',
  'No crawl jobs created',
  'Synthetic input only',
  'Execution disabled',
  'Local prototype',
  'Phase 1',
];

/**
 * Two rows that run in opposite directions. In each, the second track repeats the first so the
 * loop is seamless. Only the first track of the first row is exposed to assistive technology.
 */
export function Marquee() {
  return (
    <div className="marquee" data-marquee>
      {[false, true].map((reversed) => (
        <div
          className="marquee-row"
          data-marquee-row
          data-reversed={reversed || undefined}
          aria-hidden={reversed || undefined}
          key={String(reversed)}
        >
          {[false, true].map((duplicate) => (
            <ul
              className="marquee-track"
              role="list"
              data-marquee-track
              aria-hidden={duplicate || undefined}
              key={String(duplicate)}
            >
              {STATEMENTS.map((statement) => (
                <li className="marquee-item" key={statement}>
                  <span>{statement}</span>
                  <SparkIcon />
                </li>
              ))}
            </ul>
          ))}
        </div>
      ))}
    </div>
  );
}

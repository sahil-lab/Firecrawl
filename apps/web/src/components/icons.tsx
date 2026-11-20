type ArrowDirection = 'right' | 'down' | 'up';

export function ArrowIcon({ direction = 'right' }: { direction?: ArrowDirection }) {
  return (
    <svg
      className="icon icon-arrow"
      data-direction={direction}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
    </svg>
  );
}

export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      {/* pathLength makes each of the four corners a quarter of the path, so they can draw together. */}
      <path
        className="brand-mark-frame"
        d="M2 9V2h7M19 2h7v7M26 19v7h-7M9 26H2v-7"
        pathLength={1}
      />
      <circle className="brand-mark-core" cx="14" cy="14" r="4.25" />
    </svg>
  );
}

export function SparkIcon() {
  return (
    <svg className="icon icon-spark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07" />
    </svg>
  );
}

export function StepIcon({ kind }: { kind: 'minus' | 'plus' }) {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d={kind === 'plus' ? 'M3 8h10M8 3v10' : 'M3 8h10'} />
    </svg>
  );
}

export function VerdictIcon({ kind }: { kind: 'valid' | 'invalid' }) {
  return (
    <svg className="icon icon-verdict" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10.25" pathLength={1} />
      <path
        d={kind === 'valid' ? 'm7.5 12.4 3.1 3.1 5.9-6.6' : 'M12 7v6.2M12 16.6v.4'}
        pathLength={1}
      />
    </svg>
  );
}

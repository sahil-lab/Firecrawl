import { Fragment } from 'react';

/**
 * Renders text as one element per character, grouped by word so words still wrap whole. The
 * stylesheet animates the characters one after another; `useSplitOrder()` numbers them.
 *
 * A screen reader may read split text letter by letter, so use this only inside an element
 * that is hidden from assistive technology and has a readable equivalent next to it.
 */
export function SplitText({ text }: { text: string }) {
  return text.split(' ').map((word, index) => (
    // The words of a fixed string never reorder, so their position is a stable key.
    <Fragment key={index}>
      {index > 0 && ' '}
      <span className="word">
        {Array.from(word, (character, position) => (
          <span className="char" data-char key={position}>
            {character}
          </span>
        ))}
      </span>
    </Fragment>
  ));
}

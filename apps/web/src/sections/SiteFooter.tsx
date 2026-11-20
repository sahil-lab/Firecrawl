import { ArrowIcon } from '../components/icons';
import { SplitText } from '../components/SplitText';

export function SiteFooter() {
  return (
    <footer className="site-footer" data-scene-pose="footer">
      <div className="footer-row" data-reveal>
        <p className="footer-note">
          Independent engineering prototype inspired by the public product area of Firecrawl. Not
          affiliated with Firecrawl. Not production-ready.
        </p>
        <a className="footer-top" href="#top">
          <span>Back to top</span>
          <ArrowIcon direction="up" />
        </a>
      </div>
      <p className="wordmark" data-reveal data-split aria-hidden="true">
        <SplitText text="Adaptive Crawl Lab" />
      </p>
    </footer>
  );
}

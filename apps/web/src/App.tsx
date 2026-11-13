import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, getReadiness, validateCrawlRequest, type FieldErrors } from './api';

type Health = { kind: 'checking' } | { kind: 'ready' } | { kind: 'unavailable'; message: string };

type Validation =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'valid' }
  | { kind: 'invalid'; message: string; errors: FieldErrors };

function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Could not reach the local API. Check that the Firecrawl stack is running, then retry.';
}

function App() {
  const [health, setHealth] = useState<Health>({ kind: 'checking' });
  const [healthAttempt, setHealthAttempt] = useState(0);
  const [url, setUrl] = useState('https://example.test/articles');
  const [maxPages, setMaxPages] = useState('10');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [validation, setValidation] = useState<Validation>({ kind: 'idle' });

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidation({ kind: 'pending' });
    try {
      await validateCrawlRequest({ url, maxPages: Number(maxPages), termsAccepted });
      setValidation({ kind: 'valid' });
    } catch (error) {
      setValidation({
        kind: 'invalid',
        message: errorMessage(error),
        errors: error instanceof ApiError ? error.fieldErrors : {},
      });
    }
  }

  const errors = validation.kind === 'invalid' ? validation.errors : {};
  const pending = validation.kind === 'pending';

  return (
    <main className="workspace">
      <header className="masthead">
        <a className="brand" href="/" aria-label="Adaptive Crawl Lab home">
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span>Adaptive Crawl Lab</span>
        </a>
        <span className="badge">LOCAL PROTOTYPE / PHASE 1</span>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">A SAFER STARTING POINT</p>
        <h1 id="page-title">
          Good crawling starts
          <br />
          with clear boundaries.
        </h1>
        <p className="lede">
          Check the local stack and validate a candidate request. No websites are fetched. No crawl
          jobs are created.
        </p>
      </section>

      <div className="layout">
        <section className="panel" aria-labelledby="request-title">
          <div className="panel-heading">
            <span className="step">01</span>
            <div>
              <h2 id="request-title">Validate a request</h2>
              <p>A contract check, not a crawl.</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} onChange={() => setValidation({ kind: 'idle' })} noValidate>
            <fieldset disabled={pending}>
              <label htmlFor="url">Target URL</label>
              <input
                id="url"
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                aria-describedby="url-hint url-error"
                aria-invalid={Boolean(errors.url)}
                autoComplete="off"
                spellCheck={false}
              />
              <p className="hint" id="url-hint">
                Use synthetic input. HTTP(S) only; no credentials or fragments.
              </p>
              <p className="field-error" id="url-error">
                {errors.url?.join(' ')}
              </p>

              <label htmlFor="maxPages">Page budget</label>
              <input
                id="maxPages"
                type="number"
                min="1"
                max="100"
                step="1"
                value={maxPages}
                onChange={(event) => setMaxPages(event.target.value)}
                aria-describedby="budget-hint budget-error"
                aria-invalid={Boolean(errors.maxPages)}
              />
              <p className="hint" id="budget-hint">
                1-100 pages. A proposed limit for future execution.
              </p>
              <p className="field-error" id="budget-error">
                {errors.maxPages?.join(' ')}
              </p>

              <label className="checkbox-label" htmlFor="termsAccepted">
                <input
                  id="termsAccepted"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                  aria-describedby="terms-error"
                  aria-invalid={Boolean(errors.termsAccepted)}
                />
                <span>
                  I acknowledge that site permission and access rules must be checked before
                  crawling.
                </span>
              </label>
              <p className="field-error" id="terms-error">
                {errors.termsAccepted?.join(' ')}
              </p>
              <button className="primary" type="submit">
                {pending ? 'Validating...' : 'Validate request'}
              </button>
            </fieldset>
          </form>
          {validation.kind === 'valid' && (
            <div className="notice success" role="status">
              <strong>Request is valid.</strong>
              <p>Execution is disabled. No URL was fetched and no job was created.</p>
            </div>
          )}
          {validation.kind === 'invalid' && (
            <div className="notice error" role="alert">
              <strong>Request could not be validated.</strong>
              <p>{validation.message}</p>
            </div>
          )}
        </section>

        <aside className="sidebar">
          <section className="panel" aria-labelledby="health-title">
            <p className="eyebrow">LIVE LOCAL CHECK</p>
            <h2 id="health-title">Stack readiness</h2>
            <div className={`health ${health.kind}`} role="status">
              <span className="status-dot" aria-hidden="true" />
              {health.kind === 'ready'
                ? 'API + database ready'
                : health.kind === 'checking'
                  ? 'Checking readiness...'
                  : 'Stack unavailable'}
            </div>
            <p className="hint">
              {health.kind === 'unavailable'
                ? health.message
                : 'Readiness requires PostgreSQL and the applied schema migration.'}
            </p>
            <button
              className="secondary"
              type="button"
              disabled={health.kind === 'checking'}
              onClick={() => {
                setHealth({ kind: 'checking' });
                setHealthAttempt((attempt) => attempt + 1);
              }}
            >
              Check again
            </button>
          </section>
          <section className="scope" aria-labelledby="scope-title">
            <p className="eyebrow">PURPOSEFULLY LIMITED</p>
            <h2 id="scope-title">Foundation, not execution.</h2>
            <ul>
              <li>Typed input and explicit errors</li>
              <li>Schema-aware health checks</li>
              <li>Local, isolated infrastructure</li>
            </ul>
            <p>
              Robots rules, permission enforcement, fetching, extraction, and benchmarks are future
              phases.
            </p>
          </section>
        </aside>
      </div>
      <footer>
        Independent engineering prototype inspired by the public product area of Firecrawl. Not
        affiliated with Firecrawl. Not production-ready.
      </footer>
    </main>
  );
}

export default App;

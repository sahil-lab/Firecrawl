import { useState, type FormEvent } from 'react';
import { ApiError, validateCrawlRequest, type CrawlRequest, type FieldErrors } from '../api';
import { ArrowIcon, StepIcon, VerdictIcon } from '../components/icons';
import { pulseScene } from '../motion/sceneSignals';
import { errorMessage } from '../status';

type Validation =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'valid' }
  | { kind: 'invalid'; message: string; errors: FieldErrors };

const BUDGET_MIN = 1;
const BUDGET_MAX = 100;
const GAUGE_TICKS = Array.from({ length: BUDGET_MAX }, (_, index) => index + 1);

/** Steps like a native number input: an empty or unusable value snaps to the minimum. */
function stepBudget(current: string, delta: 1 | -1): string {
  const value = current.trim() === '' ? Number.NaN : Number(current);
  if (!Number.isFinite(value)) return String(BUDGET_MIN);
  const stepped = (delta > 0 ? Math.floor(value) : Math.ceil(value)) + delta;
  return String(Math.min(BUDGET_MAX, Math.max(BUDGET_MIN, stepped)));
}

export function ValidateSection() {
  const [url, setUrl] = useState('https://example.test/articles');
  const [maxPages, setMaxPages] = useState('10');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [validation, setValidation] = useState<Validation>({ kind: 'idle' });

  // One object feeds both the preview and the submission, so they cannot drift apart.
  const request: CrawlRequest = { url, maxPages: Number(maxPages), termsAccepted };
  const errors = validation.kind === 'invalid' ? validation.errors : {};
  const pending = validation.kind === 'pending';
  const verdict =
    validation.kind === 'valid' || validation.kind === 'invalid' ? validation.kind : undefined;
  const budget = request.maxPages;
  const budgetRange = !(budget >= BUDGET_MIN) ? 'under' : budget > BUDGET_MAX ? 'over' : 'within';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidation({ kind: 'pending' });
    try {
      await validateCrawlRequest(request);
      setValidation({ kind: 'valid' });
      pulseScene('valid');
    } catch (error) {
      setValidation({
        kind: 'invalid',
        message: errorMessage(error),
        errors: error instanceof ApiError ? error.fieldErrors : {},
      });
      pulseScene('invalid');
    }
  }

  function handleStep(delta: 1 | -1) {
    // A step button at its limit is aria-disabled, not disabled, so its clicks still arrive.
    if (delta > 0 ? budget >= BUDGET_MAX : budget <= BUDGET_MIN) return;
    setMaxPages(stepBudget(maxPages, delta));
    setValidation({ kind: 'idle' });
  }

  return (
    <section
      className="section"
      id="validate"
      aria-labelledby="request-title"
      data-scene-pose="validate"
    >
      <div className="section-head" data-reveal>
        <span className="section-index" aria-hidden="true">
          01
        </span>
        <h2 className="section-title" id="request-title" data-scene-clear>
          Validate a request
        </h2>
        <p className="section-note">A contract check, not a crawl.</p>
      </div>

      {/* The sheet shows the standing answer in its border; the notice inside states it in words. */}
      <div className="validate-grid sheet" data-reveal data-verdict={verdict}>
        <div className="validate-form">
          <form onSubmit={handleSubmit} onChange={() => setValidation({ kind: 'idle' })} noValidate>
            <fieldset disabled={pending}>
              <div className="field">
                <label htmlFor="url">Target URL</label>
                <input
                  id="url"
                  className="field-input"
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
              </div>

              <div className="field">
                <label htmlFor="maxPages">Page budget</label>
                <div className="budget">
                  <input
                    id="maxPages"
                    className="field-input budget-input"
                    type="number"
                    min={BUDGET_MIN}
                    max={BUDGET_MAX}
                    step="1"
                    value={maxPages}
                    onChange={(event) => setMaxPages(event.target.value)}
                    aria-describedby="budget-hint budget-error"
                    aria-invalid={Boolean(errors.maxPages)}
                  />
                  {/* aria-disabled keeps keyboard focus on a step button when it reaches a limit. */}
                  <div className="budget-steps">
                    <button
                      className="step-button"
                      type="button"
                      aria-label="Decrease page budget"
                      aria-disabled={budget <= BUDGET_MIN}
                      onClick={() => handleStep(-1)}
                    >
                      <StepIcon kind="minus" />
                    </button>
                    <button
                      className="step-button"
                      type="button"
                      aria-label="Increase page budget"
                      aria-disabled={budget >= BUDGET_MAX}
                      onClick={() => handleStep(1)}
                    >
                      <StepIcon kind="plus" />
                    </button>
                  </div>
                </div>
                <div className="gauge" data-range={budgetRange} aria-hidden="true">
                  <div className="gauge-ticks">
                    {GAUGE_TICKS.map((tick) => (
                      <i key={tick} data-lit={tick <= budget || undefined} />
                    ))}
                  </div>
                  <div className="gauge-scale">
                    <span>1</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                </div>
                <p className="hint" id="budget-hint">
                  1-100 pages. A proposed limit for future execution.
                </p>
                <p className="field-error" id="budget-error">
                  {errors.maxPages?.join(' ')}
                </p>
              </div>

              <div className="field">
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
              </div>

              <button className="btn btn-primary btn-submit" type="submit" data-magnetic>
                <span className="btn-label">{pending ? 'Validating...' : 'Validate request'}</span>
                <span className="btn-icon">
                  <ArrowIcon />
                </span>
              </button>
            </fieldset>
          </form>

          {validation.kind === 'valid' && (
            <div className="notice success" role="status">
              <VerdictIcon kind="valid" />
              <strong>Request is valid.</strong>
              <p>Execution is disabled. No URL was fetched and no job was created.</p>
            </div>
          )}
          {validation.kind === 'invalid' && (
            <div className="notice error" role="alert">
              <VerdictIcon kind="invalid" />
              <strong>Request could not be validated.</strong>
              <p>{validation.message}</p>
            </div>
          )}
        </div>

        <figure className="preview" aria-labelledby="preview-title" data-spot data-tilt>
          <figcaption className="preview-bar" id="preview-title">
            <span className="sr-only">Request preview: </span>
            <span className="preview-method">POST</span>{' '}
            <span className="preview-path">/api/crawl-jobs/validate</span>
          </figcaption>
          {/* Each JSON line is its own block so a long value wraps with a hanging indent. */}
          <pre className="preview-code">
            <code>
              <span className="code-line">{'{\n'}</span>
              <span className="code-line">
                {'  '}
                <span className="token-key">&quot;url&quot;</span>
                {': '}
                <span className="token-string">{JSON.stringify(request.url)}</span>
                {',\n'}
              </span>
              <span className="code-line">
                {'  '}
                <span className="token-key">&quot;maxPages&quot;</span>
                {': '}
                <span className="token-literal">{JSON.stringify(request.maxPages)}</span>
                {',\n'}
              </span>
              <span className="code-line">
                {'  '}
                <span className="token-key">&quot;termsAccepted&quot;</span>
                {': '}
                <span className="token-literal">{JSON.stringify(request.termsAccepted)}</span>
                {'\n'}
              </span>
              <span className="code-line">{'}'}</span>
            </code>
          </pre>
          <p className="preview-note">
            This is the body sent when you validate, indented for reading. The URL is checked for
            syntax only and is never requested.
          </p>
        </figure>
      </div>
    </section>
  );
}

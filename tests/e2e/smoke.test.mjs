import assert from 'node:assert/strict';
import { test } from 'node:test';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:18101';
const endpoint = '/api/crawl-jobs/validate';
const validRequest = {
  url: 'https://example.test/articles',
  maxPages: 10,
  termsAccepted: true,
};

function request(path, options = {}) {
  return fetch(new URL(path, baseUrl), { ...options, signal: AbortSignal.timeout(15_000) });
}

function post(body, contentType = 'application/json') {
  return request(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

test('web serves the actual production application and browser safety headers', async () => {
  const response = await request('/');
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Adaptive Crawl Lab<\/title>/);
  assert.match(response.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');

  const asset = html.match(/src="([^"]+\.js)"/)?.[1];
  assert.ok(asset, 'Production JavaScript asset is referenced.');
  const assetResponse = await request(asset);
  assert.equal(assetResponse.status, 200);
  assert.match(assetResponse.headers.get('content-type') ?? '', /javascript/);
});

test('liveness and database/schema readiness pass through the real proxy', async () => {
  for (const name of ['liveness', 'readiness']) {
    const response = await request(`/api/actuator/health/${name}`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.status, 'UP');
    assert.equal(body.components, undefined, 'Health does not expose internal details.');
  }
});

test('validates synthetic requests at both page-budget boundaries without execution', async () => {
  for (const maxPages of [1, 100]) {
    const response = await post({ ...validRequest, maxPages });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { valid: true, executionEnabled: false });
  }
});

test('rejects invalid fields and does not reflect credential-bearing URLs', async () => {
  for (const [change, field] of [
    [{ url: 'file:///synthetic.txt' }, 'url'],
    [{ url: 'https://synthetic:do-not-echo@example.test/' }, 'url'],
    [{ maxPages: 0 }, 'maxPages'],
    [{ maxPages: 101 }, 'maxPages'],
    [{ termsAccepted: false }, 'termsAccepted'],
  ]) {
    const response = await post({ ...validRequest, ...change });
    assert.equal(response.status, 400);
    assert.match(response.headers.get('content-type') ?? '', /application\/problem\+json/);
    const body = await response.json();
    assert.equal(body.status, 400);
    assert.ok(Array.isArray(body.errors[field]));
    assert.doesNotMatch(JSON.stringify(body), /do-not-echo/);
  }
});

test('rejects missing fields, unknown properties, malformed JSON and coercion', async () => {
  for (const body of [
    {},
    '{',
    { ...validRequest, unknown: 'synthetic' },
    { ...validRequest, maxPages: 1.5 },
    { ...validRequest, maxPages: '10' },
    { ...validRequest, termsAccepted: 'true' },
    { ...validRequest, url: 123 },
  ]) {
    const response = await post(body);
    assert.equal(response.status, 400);
    const problem = await response.json();
    assert.equal(problem.status, 400);
    assert.ok(problem.detail);
  }
});

test('rejects wrong media types and oversized bodies', async () => {
  assert.equal((await post('synthetic', 'text/plain')).status, 415);
  assert.equal(
    (await post({ ...validRequest, url: `https://example.test/${'a'.repeat(9_000)}` })).status,
    413,
  );
});

test('later-phase crawl-job routes and sensitive actuator endpoints do not succeed', async () => {
  for (const path of ['/api/crawl-jobs', '/api/crawl-jobs/synthetic', '/api/actuator/env']) {
    assert.equal((await request(path)).status, 404);
  }
  assert.equal(
    (
      await request('/api/crawl-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validRequest),
      })
    ).status,
    404,
  );
});

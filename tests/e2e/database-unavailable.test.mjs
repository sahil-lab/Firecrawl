import assert from 'node:assert/strict';
import { test } from 'node:test';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:18101';

test('database unavailability fails readiness but not API liveness', async () => {
  const readiness = await fetch(new URL('/api/actuator/health/readiness', baseUrl), {
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(readiness.status, 503);
  const body = await readiness.json();
  assert.equal(body.status, 'DOWN');
  assert.equal(body.components, undefined);

  const liveness = await fetch(new URL('/api/actuator/health/liveness', baseUrl), {
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(liveness.status, 200);
  assert.equal((await liveness.json()).status, 'UP');
});

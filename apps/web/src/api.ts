export interface CrawlRequest {
  url: string;
  maxPages: number;
  termsAccepted: boolean;
}

export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly fieldErrors: FieldErrors = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ApiError(`The API returned an unreadable response (HTTP ${response.status}).`);
    }
    throw error;
  }
}

export async function getReadiness(): Promise<void> {
  const response = await fetch('/api/actuator/health/readiness', {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new ApiError(`Readiness check failed (HTTP ${response.status}).`);
  }
  const body = await readJson(response);
  if (!isObject(body) || body.status !== 'UP') {
    throw new ApiError('The API did not report a ready database and schema.');
  }
}

export async function validateCrawlRequest(request: CrawlRequest): Promise<void> {
  const response = await fetch('/api/crawl-jobs/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await readJson(response);
  if (!response.ok) {
    const fieldErrors: FieldErrors = {};
    if (isObject(body) && isObject(body.errors)) {
      for (const [field, messages] of Object.entries(body.errors)) {
        if (Array.isArray(messages) && messages.every((message) => typeof message === 'string')) {
          fieldErrors[field] = messages;
        }
      }
    }
    const detail =
      isObject(body) && typeof body.detail === 'string'
        ? body.detail
        : `Request validation failed (HTTP ${response.status}).`;
    throw new ApiError(detail, fieldErrors);
  }
  if (!isObject(body) || body.valid !== true || body.executionEnabled !== false) {
    throw new ApiError('The API returned an unexpected validation result. No crawl was requested.');
  }
}

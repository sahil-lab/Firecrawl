import { ApiError } from './api';

export type Health =
  | { kind: 'checking' }
  | { kind: 'ready' }
  | { kind: 'unavailable'; message: string };

export function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Could not reach the local API. Check that the Firecrawl stack is running, then retry.';
}

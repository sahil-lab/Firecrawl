import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Phase 1 dashboard', () => {
  it('shows real readiness and validates synthetic input without implying execution', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({ status: 'UP' }))
      .mockResolvedValueOnce(json({ valid: true, executionEnabled: false }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText('API + database ready')).toBeVisible();
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Validate request' }));

    expect(await screen.findByText('Request is valid.')).toBeVisible();
    expect(
      screen.getByText('Execution is disabled. No URL was fetched and no job was created.'),
    ).toBeVisible();
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/crawl-jobs/validate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          url: 'https://example.test/articles',
          maxPages: 10,
          termsAccepted: true,
        }),
      }),
    );
    await user.clear(screen.getByLabelText('Target URL'));
    expect(screen.queryByText('Request is valid.')).not.toBeInTheDocument();
  });

  it('displays API field errors and allows correction', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(json({ status: 'UP' }))
        .mockResolvedValueOnce(
          json(
            {
              detail: 'Correct the indicated fields.',
              errors: {
                termsAccepted: ['Permission acknowledgment is required.'],
                maxPages: ['Page budget must be at most 100.'],
              },
            },
            400,
          ),
        ),
    );
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('API + database ready');
    await user.clear(screen.getByLabelText('Page budget'));
    await user.type(screen.getByLabelText('Page budget'), '101');
    await user.click(screen.getByRole('button', { name: 'Validate request' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Correct the indicated fields.');
    expect(screen.getByLabelText('Page budget')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Page budget must be at most 100.')).toBeVisible();
    expect(screen.getByText('Permission acknowledgment is required.')).toBeVisible();
    expect(screen.queryByText('Request is valid.')).not.toBeInTheDocument();
  });

  it('surfaces unavailable readiness and can retry successfully', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockRejectedValueOnce(new TypeError('Synthetic network failure'))
        .mockResolvedValueOnce(json({ status: 'UP' })),
    );
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText('Stack unavailable')).toBeVisible();
    expect(screen.getByText(/Could not reach the local API/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Check again' }));
    expect(await screen.findByText('API + database ready')).toBeVisible();
  });

  it.each([
    { kind: 'network', result: () => Promise.reject(new TypeError('Synthetic network failure')) },
    {
      kind: 'unexpected JSON',
      result: () => Promise.resolve(json({ valid: true, executionEnabled: true })),
    },
    {
      kind: 'non-JSON proxy failure',
      result: () => Promise.resolve(new Response('Bad Gateway', { status: 502 })),
    },
  ])('does not report validation success on $kind', async ({ result }) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(json({ status: 'UP' }))
        .mockImplementationOnce(result),
    );
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('API + database ready');
    await user.click(screen.getByRole('button', { name: 'Validate request' }));

    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.queryByText('Request is valid.')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Validate request' })).toBeEnabled(),
    );
  });
});

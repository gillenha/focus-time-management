import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import SessionHistory from './SessionHistory';

// Mock toast
jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockSessions = [
  {
    _id: '1',
    date: '2026-02-10',
    time: '10:00',
    duration: '01:00:00',
    text: 'oldest session',
    project: null,
  },
  {
    _id: '2',
    date: '2026-02-11T18:02:44.829Z',
    time: '2:02 pm',
    duration: '00:13',
    text: 'middle session',
    project: null,
  },
  {
    _id: '3',
    date: '2026-02-12',
    time: '14:01',
    duration: '1:27:22',
    text: 'newest session',
    project: null,
  },
];

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockSessions),
    })
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('sessions are sorted in descending order (most recent first)', async () => {
  render(
    <SessionHistory onClose={() => {}} onSessionsUpdate={() => {}} isExiting={false} />
  );

  await waitFor(() => {
    expect(screen.getByText(/newest session/)).toBeInTheDocument();
  });

  const items = screen.getAllByRole('listitem');
  // The first session listed should be the newest
  expect(items[0].textContent).toContain('newest session');
  // The last should be the oldest
  expect(items[items.length - 1].textContent).toContain('oldest session');
});

test('sessions are NOT sorted in ascending order', async () => {
  render(
    <SessionHistory onClose={() => {}} onSessionsUpdate={() => {}} isExiting={false} />
  );

  await waitFor(() => {
    expect(screen.getByText(/oldest session/)).toBeInTheDocument();
  });

  const items = screen.getAllByRole('listitem');
  // First item should NOT be the oldest
  expect(items[0].textContent).not.toContain('oldest session');
});

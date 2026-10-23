// The server only stores: plan settings (title, dates, cover), encrypted responses, and hashes of secrets.
import type { TimeSpec, TripSpec } from './scheduling';

export interface PollMeta {
  v: 1;
  mode: 'trip' | 'time';
  title: string;
  cover: string;
  tz: string;
  trip?: TripSpec;
  time?: TimeSpec;
}
export interface Decision {
  /** trip: first and last day. time: the same day twice, plus minutes. */
  start: string;
  end: string;
  startMin?: number;
  endMin?: number;
}
export interface PollData {
  id: string;
  meta: PollMeta;
  createdAt: number;
  expiresAt: number;
  decided?: Decision;
  responses: { rid: string; box: string }[];
}

export class ApiError extends Error {
  constructor(public status: number) { super(`api ${status}`); }
}

async function call<T>(path: string, init: RequestInit & { secret?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (init.secret) headers.authorization = `Bearer ${init.secret}`;
  const r = await fetch(path, { ...init, headers, credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!r.ok) throw new ApiError(r.status);
  return (r.status === 204 ? undefined : await r.json()) as T;
}

export const createPoll = (meta: PollMeta, adminSecret: string) =>
  call<{ id: string; expiresAt: number }>('/api/polls', { method: 'POST', body: JSON.stringify({ meta, adminSecret }) });

export const getPoll = (id: string) => call<PollData>(`/api/polls/${encodeURIComponent(id)}`);

export const putResponse = (id: string, rid: string, box: string, editSecret: string) =>
  call<void>(`/api/polls/${encodeURIComponent(id)}/responses/${encodeURIComponent(rid)}`, { method: 'PUT', body: JSON.stringify({ box }), secret: editSecret });

export const decidePoll = (id: string, decision: Decision, adminSecret: string) =>
  call<{ expiresAt: number }>(`/api/polls/${encodeURIComponent(id)}/decide`, { method: 'POST', body: JSON.stringify({ decision }), secret: adminSecret });

export const deletePoll = (id: string, adminSecret: string) =>
  call<void>(`/api/polls/${encodeURIComponent(id)}`, { method: 'DELETE', secret: adminSecret });

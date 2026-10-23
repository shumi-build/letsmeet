// Small per-device memory (localStorage). Holds only secrets that let this device edit its own
// answer or manage a plan it created — never calendar data. Every access is guarded.

function get<T>(k: string): T | null {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
function set(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: fine, just not remembered */ }
}
function del(k: string) {
  try { localStorage.removeItem(k); } catch { /* ignore */ }
}

export const store = {
  lang: () => get<'en' | 'ja'>('lm:lang'),
  setLang: (l: 'en' | 'ja') => set('lm:lang', l),
  name: () => get<string>('lm:name') || '',
  setName: (n: string) => set('lm:name', n),
  admin: (id: string) => get<string>(`lm:admin:${id}`),
  setAdmin: (id: string, secret: string) => set(`lm:admin:${id}`, secret),
  mine: (id: string) => get<{ rid: string; secret: string }>(`lm:resp:${id}`),
  setMine: (id: string, v: { rid: string; secret: string }) => set(`lm:resp:${id}`, v),
  forget: (id: string) => { del(`lm:admin:${id}`); del(`lm:resp:${id}`); },
};

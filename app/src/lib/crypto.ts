// End-to-end encryption for responses. The key lives only in the link's #fragment, which
// browsers never send to the server, so the server only ever stores locked boxes.
// Standard WebCrypto AES-GCM (256-bit); nothing custom.

const enc = new TextEncoder(), dec = new TextDecoder();

export function b64u(bytes: Uint8Array): string {
  let s = '';
  for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function unb64u(s: string): Uint8Array<ArrayBuffer> {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

/** Random URL-safe secret (default 256 bits). */
export const randomToken = (bytes = 32) => b64u(crypto.getRandomValues(new Uint8Array(bytes)));

/** A new plan key, as it appears after the # in the link. */
export const newPlanKey = () => randomToken(32);
export const isPlanKey = (k: string) => /^[A-Za-z0-9_-]{43}$/.test(k);

const keyCache = new Map<string, Promise<CryptoKey>>();
function importKey(k: string): Promise<CryptoKey> {
  let p = keyCache.get(k);
  if (!p) {
    p = crypto.subtle.importKey('raw', unb64u(k), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    keyCache.set(k, p);
  }
  return p;
}

/** `context` (plan id + response id) is bound into the ciphertext, so a box can't be moved to another slot. */
export async function encryptJson(key: string, value: unknown, context: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(context) }, await importKey(key), enc.encode(JSON.stringify(value)));
  return `${b64u(iv)}.${b64u(new Uint8Array(ct))}`;
}

export async function decryptJson<T>(key: string, box: string, context: string): Promise<T> {
  const [iv, ct] = box.split('.');
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64u(iv), additionalData: enc.encode(context) }, await importKey(key), unb64u(ct));
  return JSON.parse(dec.decode(pt)) as T;
}

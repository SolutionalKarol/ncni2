/*
 * NCNI Krok – wspólne funkcje serwera (Vercel Functions, Node).
 * Dane: prywatny magazyn Vercel Blob (region Frankfurt), dostępny tylko z kodu serwera.
 */
import { put, get, list, del } from '@vercel/blob';
import crypto from 'node:crypto';

export const ADMIN_EMAIL = 'kontakt@ncni.pl';
export const ADMIN_NAME = 'Sebastian Kraszewski';
const SESSION_HOURS = 10;
const COOKIE = 'nk_sesja';

/* ---------- magazyn ---------- */
export async function czytaj(path) {
  const r = await get(path, { access: 'private', useCache: false });
  if (!r || r.statusCode !== 200 || !r.stream) return null;
  return JSON.parse(await new Response(r.stream).text());
}

export async function zapisz(path, obj) {
  await put(path, JSON.stringify(obj), {
    access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json'
  });
}

export async function lista(prefix) {
  const out = [];
  let cursor;
  do {
    const r = await list({ prefix, cursor, limit: 1000 });
    out.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return out;
}

export async function usun(paths) {
  if (paths.length) await del(paths);
}

/* ---------- konfiguracja (hasło admina, klucz sesji) ---------- */
let cfgCache = null;
export async function konfiguracja() {
  if (cfgCache && cfgCache.adminHash) return cfgCache;
  let cfg = await czytaj('system/konfiguracja.json');
  if (!cfg) {
    cfg = { secret: crypto.randomBytes(32).toString('hex'), adminHash: null };
    await zapisz('system/konfiguracja.json', cfg);
  }
  cfgCache = cfg;
  return cfg;
}
export async function ustawAdmina(password) {
  const cfg = await konfiguracja();
  cfg.adminHash = hashPassword(password);
  await zapisz('system/konfiguracja.json', cfg);
  cfgCache = cfg;
}

/* ---------- hasła ---------- */
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(pw), salt, 32, { N: 16384, r: 8, p: 1 });
  return 'scrypt$' + salt.toString('hex') + '$' + key.toString('hex');
}
export function checkPassword(pw, stored) {
  if (!stored || !stored.startsWith('scrypt$')) return false;
  const [, s, k] = stored.split('$');
  const key = crypto.scryptSync(String(pw), Buffer.from(s, 'hex'), 32, { N: 16384, r: 8, p: 1 });
  const ref = Buffer.from(k, 'hex');
  return ref.length === key.length && crypto.timingSafeEqual(ref, key);
}
export function randomPassword(len = 8) {
  const a = 'abcdefghjkmnpqrstuvwxyz23456789';
  let o = '';
  for (let i = 0; i < len; i++) o += a[crypto.randomInt(a.length)];
  return o;
}
export const safeEq = (a, b) => {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
};
export const norm = (s) => String(s || '').trim().toLowerCase()
  .replace(/[ąćęłńóśźż]/g, (c) => ({ ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' }[c]))
  .replace(/[^a-z0-9-]/g, '');

/* ---------- sesja w podpisanym ciasteczku ---------- */
const b64u = (b) => Buffer.from(b).toString('base64url');
async function sign(data) {
  const { secret } = await konfiguracja();
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}
export async function sessionCookie(user) {
  const payload = b64u(JSON.stringify({ ...user, exp: Date.now() + SESSION_HOURS * 3600e3 }));
  return `${COOKIE}=${payload}.${await sign(payload)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`;
}
export const clearCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export async function readSession(req) {
  const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|; )' + COOKIE + '=([^;]*)'));
  if (!m) return null;
  const [payload, sig] = m[1].split('.');
  if (!payload || !sig) return null;
  const good = await sign(payload);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return s.exp > Date.now() ? s : null;
  } catch { return null; }
}

/* ---------- ochrona przed zgadywaniem haseł (na instancję) ---------- */
const fails = new Map();
const ipOf = (req) => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'x';
export function blocked(req) {
  const f = fails.get(ipOf(req));
  return !!(f && f.n >= 8 && Date.now() - f.t < 15 * 60e3);
}
export async function failed(req) {
  const ip = ipOf(req);
  const f = fails.get(ip);
  fails.set(ip, f && Date.now() - f.t < 15 * 60e3 ? { n: f.n + 1, t: f.t } : { n: 1, t: Date.now() });
  await new Promise((r) => setTimeout(r, 900));
}

export const SEC = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer'
};
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

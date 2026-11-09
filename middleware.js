/*
 * NCNI Krok – ochrona aplikacji /krok logowaniem po stronie serwera (Vercel Routing Middleware).
 * Bez ważnej sesji żaden plik z /krok nie jest wydawany; zamiast niego serwer zwraca ekran logowania.
 *
 * Zmienne środowiskowe w projekcie Vercel (nie w repozytorium):
 *   KROK_ADMIN_EMAIL    – e-mail konta administratora (kontakt@ncni.pl)
 *   KROK_ADMIN_NAME     – nazwa wyświetlana (Sebastian Kraszewski)
 *   KROK_ADMIN_PASSWORD – hasło administratora (typ "Sensitive"; ustawia właściciel, nikt inny go nie widzi)
 *   KROK_SECRET         – opcjonalnie osobny klucz sesji; domyślnie wyprowadzany z hasła,
 *                         więc zmiana hasła wylogowuje wszystkie urządzenia
 *
 * Plik dotyczy tylko podglądu na Vercelu; hosting OVH go ignoruje.
 */
export const config = { matcher: ['/krok', '/krok/:path*'] };

const COOKIE = 'nk_sesja';
const SESSION_HOURS = 10;
const enc = new TextEncoder();

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const b64u = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const configured = () => Boolean(process.env.KROK_ADMIN_EMAIL && process.env.KROK_ADMIN_PASSWORD);
const secret = () => process.env.KROK_SECRET || ('ncni-krok-sesja:' + (process.env.KROK_ADMIN_PASSWORD || ''));

async function hmac(data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

async function sameText(a, b) {
  // porównanie skrótów o stałej długości, bez wycieku informacji przez czas odpowiedzi
  const d = async (x) => hex(await crypto.subtle.digest('SHA-256', enc.encode(String(x))));
  return safeEqual(await d(a), await d(b));
}

function getCookie(req, name) {
  const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? m[1] : null;
}

async function readSession(req) {
  const raw = getCookie(req, COOKIE);
  if (!raw || !configured()) return null;
  const [payload, sig] = raw.split('.');
  if (!payload || !sig || !safeEqual(sig, await hmac(payload))) return null;
  try {
    const s = JSON.parse(unb64u(payload));
    if (!s.exp || s.exp < Date.now()) return null;
    return s;
  } catch { return null; }
}

const secHeaders = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff'
};

function loginPage(error = '', email = '') {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>NCNI Krok – logowanie</title><meta name="theme-color" content="#0f766e">
<link rel="icon" href="/assets/icon-192.png">
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;600&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--teal:#0f766e;--ink:#1e293b;--muted:#64748b;--line:#e2e8f0;--bg:#f8fafc;--err:#b91c1c}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:linear-gradient(160deg,#f8fafc,#e6f4f1);font-family:Inter,system-ui,sans-serif;color:var(--ink);padding:16px}
.card{width:100%;max-width:440px;background:#fff;border:1px solid var(--line);border-radius:20px;padding:36px 32px;box-shadow:0 20px 50px -25px rgba(15,118,110,.35)}
.brand{display:flex;align-items:center;gap:14px;margin-bottom:6px}.brand img{width:64px;height:64px;object-fit:contain}
.brand b{font-family:Lexend,sans-serif;font-size:15px;line-height:1.3}
h1{font-family:Lexend,sans-serif;font-size:28px;margin:22px 0 4px;color:var(--teal)}p.sub{margin:0 0 22px;color:var(--muted)}
label{display:block;font-weight:500;margin:14px 0 6px}input{width:100%;font:inherit;font-size:18px;padding:14px 16px;border:1.5px solid var(--line);border-radius:12px}
input:focus{outline:none;border-color:var(--teal);box-shadow:0 0 0 3px rgba(15,118,110,.15)}
button{margin-top:22px;width:100%;font:600 18px Lexend,sans-serif;color:#fff;background:var(--teal);border:0;border-radius:12px;padding:16px;cursor:pointer}
.err{background:#fef2f2;color:var(--err);border-radius:10px;padding:10px 14px;margin-top:14px}
.data{margin-top:26px;padding-top:18px;border-top:1px solid var(--line);font-size:13px;color:var(--muted);line-height:1.6}
</style></head><body><main class="card">
<div class="brand"><img src="/logo.webp" alt="Logo NCNI"><b>Naukowe Centrum<br>Neuroinnowacji sp. z o.o.</b></div>
<h1>NCNI Krok</h1><p class="sub">Edukacja pacjentów w placówce. Dostęp tylko dla personelu.</p>
<form method="post" action="/krok/login" autocomplete="on">
<label for="e">E-mail</label><input id="e" name="email" type="email" required autocomplete="username" value="${esc(email)}">
<label for="p">Hasło</label><input id="p" name="password" type="password" required autocomplete="current-password">
${error ? `<div class="err" role="alert">${esc(error)}</div>` : ''}
<button type="submit">Zaloguj się</button></form>
<div class="data">Naukowe Centrum Neuroinnowacji sp. z o.o.<br>ul. Stefana Żeromskiego 60/5A, 50-312 Wrocław<br>tel. 600 608 333 · kontakt@ncni.pl</div>
</main></body></html>`;
  return new Response(html, { status: error ? 401 : 200, headers: { 'Content-Type': 'text/html; charset=utf-8', ...secHeaders } });
}

export default async function middleware(req) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (path === '/krok/login' && req.method === 'POST') {
    const form = await req.formData();
    const email = String(form.get('email') || '').trim().toLowerCase();
    const password = String(form.get('password') || '');
    const ok = configured()
      & (await sameText(email, String(process.env.KROK_ADMIN_EMAIL).trim().toLowerCase()))
      & (await sameText(password, process.env.KROK_ADMIN_PASSWORD));
    const user = { email: process.env.KROK_ADMIN_EMAIL, name: process.env.KROK_ADMIN_NAME || 'Administrator', role: 'admin' };
    if (!ok) {
      await new Promise((r) => setTimeout(r, 1200)); // spowolnienie zgadywania haseł
      return loginPage('Nieprawidłowy e-mail lub hasło.', email);
    }
    const payload = b64u(JSON.stringify({ email: user.email, name: user.name, role: user.role, exp: Date.now() + SESSION_HOURS * 3600e3 }));
    const cookie = `${COOKIE}=${payload}.${await hmac(payload)}; Path=/krok; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`;
    return new Response(null, { status: 303, headers: { Location: '/krok/', 'Set-Cookie': cookie, ...secHeaders } });
  }

  if (path === '/krok/logout') {
    return new Response(null, { status: 303, headers: { Location: '/krok/', 'Set-Cookie': `${COOKIE}=; Path=/krok; HttpOnly; Secure; SameSite=Strict; Max-Age=0`, ...secHeaders } });
  }

  if (!configured()) {
    return new Response('NCNI Krok: logowanie nie jest jeszcze skonfigurowane.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...secHeaders } });
  }
  const session = await readSession(req);
  if (!session) {
    if (path === '/krok/ja') return new Response('{"zalogowany":false}', { status: 401, headers: { 'Content-Type': 'application/json', ...secHeaders } });
    return loginPage();
  }

  if (path === '/krok/ja') {
    return new Response(JSON.stringify({ zalogowany: true, imie: session.name, rola: session.role, email: session.email, wygasa: session.exp }), { headers: { 'Content-Type': 'application/json', ...secHeaders } });
  }
  // zalogowany: brak odpowiedzi = Vercel wydaje właściwy plik z /krok
}

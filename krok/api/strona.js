/*
 * NCNI Krok – strona główna: ekran logowania albo (po zalogowaniu) aplikacja.
 */
import {
  ADMIN_EMAIL, ADMIN_NAME, konfiguracja, ustawAdmina, checkPassword, safeEq, norm, lista, czytaj,
  sessionCookie, clearCookie, readSession, blocked, failed, SEC, esc
} from '../lib/serwer.js';
import { APP_HTML } from '../lib/szablon.js';

const html = (body, status = 200, extra = {}) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', ...SEC, ...extra } });
const redirect = (cookie) => new Response(null, { status: 303, headers: { Location: '/', ...SEC, ...(cookie ? { 'Set-Cookie': cookie } : {}) } });

function loginPage({ tab = 'pacjent', err = '', adminReady = true }) {
  const e = (t) => (err && tab === t ? `<div class="msg err" role="alert">${esc(err)}</div>` : '');
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title>NCNI Krok – logowanie</title><meta name="theme-color" content="#0f766e">
<link rel="manifest" href="/manifest.json"><link rel="icon" href="/icon-192.png"><link rel="apple-touch-icon" href="/icon-180.png">
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{--teal:#0f766e;--teal-l:#e6f4f1;--ink:#1e293b;--muted:#64748b;--line:#e2e8f0;--err:#b91c1c}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:linear-gradient(160deg,#f8fafc,#e6f4f1);font-family:Inter,system-ui,sans-serif;color:var(--ink);padding:16px;font-size:18px}
.card{width:100%;max-width:460px;background:#fff;border:1px solid var(--line);border-radius:20px;padding:32px 30px;box-shadow:0 20px 50px -25px rgba(15,118,110,.35)}
.brand{display:flex;align-items:center;gap:14px}.brand img{width:64px;height:64px;object-fit:contain}
.brand b{font-family:Lexend,sans-serif;font-size:15px;line-height:1.3}
h1{font-family:Lexend,sans-serif;font-size:28px;margin:20px 0 4px;color:var(--teal)}p.sub{margin:0 0 18px;color:var(--muted);font-size:16px}
.tabs{display:grid;grid-template-columns:1fr 1fr;background:#f1f5f9;border-radius:12px;padding:4px;margin-bottom:6px}
.tabs button{font:600 16px Lexend,sans-serif;border:0;background:none;padding:12px;border-radius:9px;color:var(--muted);cursor:pointer}
.tabs button.on{background:#fff;color:var(--teal);box-shadow:0 1px 3px rgba(0,0,0,.08)}
[hidden]{display:none!important}
label{display:block;font-weight:500;margin:14px 0 6px}input{width:100%;font:inherit;padding:14px 16px;border:1.5px solid var(--line);border-radius:12px}
input:focus{outline:none;border-color:var(--teal);box-shadow:0 0 0 3px rgba(15,118,110,.15)}
.btn{margin-top:20px;width:100%;font:600 18px Lexend,sans-serif;color:#fff;background:var(--teal);border:0;border-radius:12px;padding:16px;cursor:pointer}
.msg{border-radius:10px;padding:10px 14px;margin-top:14px;font-size:16px}.err{background:#fef2f2;color:var(--err)}.info{background:var(--teal-l);color:#0a5a54}
.hint{font-size:14px;color:var(--muted);margin-top:12px}
.data{margin-top:24px;padding-top:16px;border-top:1px solid var(--line);font-size:13px;color:var(--muted);line-height:1.6}
</style></head><body><main class="card">
<div class="brand"><img src="/logo.webp" alt="Logo NCNI"><b>Naukowe Centrum<br>Neuroinnowacji sp. z o.o.</b></div>
<h1>NCNI Krok</h1><p class="sub">Edukacja zdrowotna NCNI. Zaloguj się, aby kontynuować.</p>
<div class="tabs"><button type="button" data-t="pacjent" class="${tab === 'pacjent' ? 'on' : ''}">Pacjent</button><button type="button" data-t="personel" class="${tab === 'personel' ? 'on' : ''}">Personel</button></div>
<form method="post" action="/" data-f="pacjent" ${tab === 'pacjent' ? '' : 'hidden'} autocomplete="off">
<input type="hidden" name="akcja" value="pacjent">
<label for="pn">Nazwisko</label><input id="pn" name="nazwisko" type="text" required autocapitalize="words">
<label for="pp">Hasło</label><input id="pp" name="haslo" type="password" required>
${e('pacjent')}<button class="btn" type="submit">Zaloguj się</button></form>
<div data-f="personel" ${tab === 'personel' ? '' : 'hidden'}>
${adminReady ? `<form method="post" action="/">
<input type="hidden" name="akcja" value="personel">
<label for="e">E-mail</label><input id="e" name="email" type="email" required autocomplete="username">
<label for="p">Hasło</label><input id="p" name="haslo" type="password" required autocomplete="current-password">
${e('personel')}<button class="btn" type="submit">Zaloguj się</button></form>
<p class="hint">Nie pamiętasz hasła? Skontaktuj się z opiekunem technicznym aplikacji.</p>`
  : `<div class="msg info">Pierwsze uruchomienie: ustaw hasło administratora dla konta <b>${esc(ADMIN_EMAIL)}</b>.</div>
<form method="post" action="/" autocomplete="off">
<input type="hidden" name="akcja" value="ustaw">
<label for="h1">Nowe hasło (min. 10 znaków)</label><input id="h1" name="haslo1" type="password" required minlength="10" autocomplete="new-password">
<label for="h2">Powtórz hasło</label><input id="h2" name="haslo2" type="password" required minlength="10" autocomplete="new-password">
${e('personel')}<button class="btn" type="submit">Zapisz hasło i wejdź</button></form>`}
</div>
<div class="data">Naukowe Centrum Neuroinnowacji sp. z o.o.<br>ul. Stefana Żeromskiego 60/5A, 50-312 Wrocław<br>tel. 600 608 333 · kontakt@ncni.pl</div>
</main><script>
document.querySelectorAll('.tabs button').forEach(function(b){b.addEventListener('click',function(){
document.querySelectorAll('.tabs button').forEach(function(x){x.classList.toggle('on',x===b)});
document.querySelectorAll('[data-f]').forEach(function(f){f.hidden=f.getAttribute('data-f')!==b.getAttribute('data-t')});});});
</script></body></html>`;
}

export async function GET(req) {
  const url = new URL(req.url);
  if (url.searchParams.has('wyloguj')) return redirect(clearCookie);
  const user = await readSession(req);
  if (user) {
    const boot = `<script>window.NK_USER = ${JSON.stringify({ typ: user.typ, rola: user.rola, imie: user.imie, id: user.id }).replace(/</g, '\\u003c')};</script>`;
    return html(APP_HTML.replace('<!--NK_USER-->', boot));
  }
  const cfg = await konfiguracja();
  return html(loginPage({ adminReady: !!cfg.adminHash }));
}

export async function POST(req) {
  const f = await req.formData();
  const akcja = String(f.get('akcja') || '');
  const cfg = await konfiguracja();
  const adminReady = !!cfg.adminHash;

  if (blocked(req)) {
    return html(loginPage({ tab: akcja === 'pacjent' ? 'pacjent' : 'personel', err: 'Zbyt wiele nieudanych prób. Spróbuj ponownie za 15 minut.', adminReady }), 429);
  }

  if (akcja === 'personel') {
    const email = String(f.get('email') || '').trim().toLowerCase();
    const pw = String(f.get('haslo') || '');
    const ok = adminReady & safeEq(email, ADMIN_EMAIL) & checkPassword(pw, cfg.adminHash);
    if (ok) return redirect(await sessionCookie({ typ: 'personel', rola: 'admin', imie: ADMIN_NAME, email: ADMIN_EMAIL }));
    await failed(req);
    return html(loginPage({ tab: 'personel', err: 'Nieprawidłowy e-mail lub hasło.', adminReady }), 401);
  }

  if (akcja === 'ustaw') {
    if (adminReady) return redirect();
    const p1 = String(f.get('haslo1') || ''), p2 = String(f.get('haslo2') || '');
    let err = '';
    if (p1.length < 10) err = 'Hasło musi mieć co najmniej 10 znaków.';
    else if (p1 !== p2) err = 'Hasła różnią się. Wpisz je jeszcze raz.';
    if (err) return html(loginPage({ tab: 'personel', err, adminReady }), 400);
    await ustawAdmina(p1);
    return redirect(await sessionCookie({ typ: 'personel', rola: 'admin', imie: ADMIN_NAME, email: ADMIN_EMAIL }));
  }

  if (akcja === 'pacjent') {
    const n = norm(f.get('nazwisko'));
    const pw = String(f.get('haslo') || '');
    if (n) {
      for (const b of await lista(`pacjenci/${n}/`)) {
        const p = await czytaj(b.pathname);
        if (p && checkPassword(pw, p.hash)) {
          return redirect(await sessionCookie({ typ: 'pacjent', rola: 'pacjent', id: p.id, sciezkaPliku: b.pathname, imie: `${p.imie} ${p.nazwisko}` }));
        }
      }
    }
    await failed(req);
    return html(loginPage({ tab: 'pacjent', err: 'Nie znaleziono takiego nazwiska i hasła. Sprawdź pisownię albo zapytaj w przychodni.', adminReady }), 401);
  }

  return redirect();
}

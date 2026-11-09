/*
 * NCNI Krok – API (JSON). Każde wywołanie wymaga zalogowanej sesji.
 * Admin: pacjenci, wyniki, dane przykładowe. Pacjent: tylko własne dane.
 */
import crypto from 'node:crypto';
import { readSession, czytaj, zapisz, lista, usun, hashPassword, randomPassword, norm, SEC } from '../lib/serwer.js';

const out = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...SEC } });

const publiczne = (p) => ({
  id: p.id, imie: p.imie, nazwisko: p.nazwisko, sciezka: p.sciezka, utworzono: p.utworzono,
  demo: !!p.demo, start: p.start || null, kontrola: p.kontrola || null
});

async function wszyscy() {
  const blobs = await lista('pacjenci/');
  const rows = await Promise.all(blobs.map(async (b) => ({ path: b.pathname, url: b.url, p: await czytaj(b.pathname) })));
  return rows.filter((r) => r.p).sort((a, b) => b.p.utworzono - a.p.utworzono);
}

function limited(v, max = 20000) {
  if (v == null) return null;
  const s = JSON.stringify(v);
  if (s.length > max) throw new Error('za duże');
  return JSON.parse(s);
}

export async function POST(req) {
  const user = await readSession(req);
  if (!user) return out({ blad: 'Sesja wygasła. Zaloguj się ponownie.' }, 401);
  if (req.headers.get('x-nk') !== '1') return out({ blad: 'Niedozwolone żądanie.' }, 400);
  let body = {};
  try { body = await req.json(); } catch { /* puste */ }
  const a = String(body.akcja || '');
  const admin = user.rola === 'admin';

  try {
    if (a === 'ja') {
      if (user.typ !== 'pacjent') return out({ user });
      const p = await czytaj(user.sciezkaPliku);
      if (!p) return out({ blad: 'Konto nie istnieje.' }, 401);
      return out({ user, pacjent: publiczne(p) });
    }

    if (a === 'zapisz') {
      if (user.typ !== 'pacjent') return out({ blad: 'Tylko dla pacjenta.' }, 403);
      const p = await czytaj(user.sciezkaPliku);
      if (!p) return out({ blad: 'Konto nie istnieje.' }, 401);
      p.start = limited(body.start);
      p.kontrola = limited(body.kontrola);
      await zapisz(user.sciezkaPliku, p);
      return out({ ok: true });
    }

    if (!admin) return out({ blad: 'Brak uprawnień.' }, 403);

    if (a === 'pacjenci') return out({ pacjenci: (await wszyscy()).map((r) => publiczne(r.p)) });

    if (a === 'dodaj') {
      const imie = String(body.imie || '').trim().slice(0, 40);
      const nazwisko = String(body.nazwisko || '').trim().slice(0, 60);
      const n = norm(nazwisko);
      if (!imie || !n) return out({ blad: 'Podaj imię i nazwisko.' }, 400);
      const haslo = randomPassword();
      const id = 'p' + crypto.randomBytes(6).toString('hex');
      const sciezka = String(body.sciezka || 'nadcisnienie').replace(/[^a-z0-9_-]/g, '');
      await zapisz(`pacjenci/${n}/${id}.json`, { id, imie, nazwisko, hash: hashPassword(haslo), sciezka, utworzono: Date.now(), start: null, kontrola: null });
      return out({ ok: true, haslo, nazwisko });
    }

    if (a === 'nowe_haslo' || a === 'usun') {
      const r = (await wszyscy()).find((x) => x.p.id === String(body.id || ''));
      if (!r) return out({ blad: 'Nie znaleziono pacjenta.' }, 404);
      if (a === 'usun') { await usun([r.url]); return out({ ok: true }); }
      const haslo = randomPassword();
      r.p.hash = hashPassword(haslo);
      await zapisz(r.path, r.p);
      return out({ ok: true, haslo });
    }

    if (a === 'demo' || a === 'usun_demo') {
      const stare = (await wszyscy()).filter((x) => x.p.demo).map((x) => x.url);
      await usun(stare);
      if (a === 'usun_demo') return out({ ok: true });
      const day = 86400e3, now = Date.now();
      const demo = [
        ['Anna', 'Przykładowa', 1, 3, 'Przez 7 dni przed następną wizytą zmierzę ciśnienie rano i wieczorem i zapiszę wyniki', 8, 'tak', 3],
        ['Jan', 'Testowy', 0, 1, 'Przez 2 tygodnie nie będę dosalać potraw przy stole', 7, 'czesciowo', 2],
        ['Maria', 'Demo', 2, 2, 'Codziennie przed snem zrobię 3 minuty spokojnego oddechu', 9, 'tak', 3],
        ['Piotr', 'Wzorcowy', 1, 0, 'Będę chodzić na 15-minutowy spacer 5 dni w tygodniu przez najbliższe 2 tygodnie', 6, 'nie', 2],
        ['Ewa', 'Pokazowa', 2, 2, 'Przez 2 tygodnie będę brać leki o stałej porze, z przypomnieniem w telefonie', 8, null, null]
      ];
      const hash = hashPassword(randomPassword(24)); // kont przykładowych nie da się użyć do logowania
      await Promise.all(demo.map(([imie, nazwisko, wp, etap, cel, pewnosc, cs, wpo], i) => {
        const t = now - (20 - i * 2) * day;
        return zapisz(`pacjenci/${norm(nazwisko)}/demo${i}.json`, {
          id: 'demo' + i, demo: true, imie, nazwisko, hash, sciezka: 'nadcisnienie', utworzono: t,
          start: { data: t, wiedzaPrzed: { odp: {}, wynik: wp, max: 3 }, etap, bariery: ['pomiar', 'stres'], pomiary: 'czasem', moduly: ['podstawy', 'pomiar', 'stres'], ukonczoneModuly: ['podstawy', 'pomiar', 'stres'], powody: [], cel, pewnosc, ukonczono: t + 900e3 },
          kontrola: cs ? { data: t + 14 * day, cel: cs, wiedzaPo: { odp: {}, wynik: wpo, max: 3 } } : null
        });
      }));
      return out({ ok: true });
    }

    return out({ blad: 'Nieznana akcja.' }, 400);
  } catch (e) {
    console.error('NCNI Krok API', a, e && e.message);
    return out({ blad: 'Błąd serwera. Spróbuj ponownie.' }, 500);
  }
}

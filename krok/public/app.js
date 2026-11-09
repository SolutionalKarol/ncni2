/*
 * NCNI Krok – aplikacja edukacyjna dla placówek POZ (hosting OVH, PHP).
 * Logowanie i dane są po stronie serwera (api/strona.js, api/dane.js). Ten plik to tylko interfejs.
 */
(function () {
  'use strict';

  const SCIEZKI = window.NK_SCIEZKI || {};
  const PATIENT_IDLE_MS = 10 * 60 * 1000;
  const app = document.getElementById('app');

  /* ---------- narzędzia ---------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const h = (html) => { app.innerHTML = html; app.focus({ preventScroll: true }); window.scrollTo(0, 0); };
  const $ = (sel) => app.querySelector(sel);
  const $$ = (sel) => [...app.querySelectorAll(sel)];
  const fmtDate = (ts) => ts ? new Date(ts).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–';
  const pct = (a, b) => b ? Math.round((a / b) * 100) : 0;
  const logout = () => { location.href = '/?wyloguj=1'; };

  let db = { pacjenci: [] };

  async function api(akcja, dane) {
    let r;
    try {
      r = await fetch('/api/dane', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'X-NK': '1' },
        body: JSON.stringify(Object.assign({ akcja }, dane || {}))
      });
    } catch {
      alertBox('Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.');
      throw new Error('siec');
    }
    if (r.status === 401) { logout(); throw new Error('sesja'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { alertBox(j.blad || 'Coś poszło nie tak.'); throw new Error(j.blad || 'blad'); }
    return j;
  }

  async function loadPatients() { db.pacjenci = (await api('pacjenci')).pacjenci; }

  // zapis postępu zalogowanego pacjenta na serwerze
  function save() {
    if (!current) return;
    api('zapisz', { start: current.start, kontrola: current.kontrola }).catch(() => {});
  }

  function alertBox(t) { const m = document.createElement('div'); m.className = 'msg err'; m.textContent = t; app.prepend(m); }

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'pl-PL'; u.rate = 0.95;
    speechSynthesis.speak(u);
  }

  /* ---------- sesja ---------- */
  const staff = window.NK_USER || null;
  const isAdmin = () => staff && staff.rola === 'admin';

  let current = null; // zalogowany pacjent
  let idleTimer = null;
  function touchIdle() {
    if (!current) return;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(logout, PATIENT_IDLE_MS);
  }
  ['pointerdown', 'keydown'].forEach((e) => document.addEventListener(e, touchIdle, { passive: true }));

  function setHeader() {
    document.getElementById('who').innerHTML = current
      ? `Pacjent: <b>${esc(current.imie)} ${esc(current.nazwisko)}</b>`
      : staff ? `<b>${esc(staff.imie)}</b>${isAdmin() ? '<span class="badge">admin</span>' : ''}` : '';
  }

  /* ---------- ekran główny personelu ---------- */
  function orgCard() {
    return `<div class="card org">
      <img src="/logo.webp" alt="Logo NCNI">
      <div><b>Naukowe Centrum Neuroinnowacji sp. z o.o.</b><br>
      ul. Stefana Żeromskiego 60/5A, 50-312 Wrocław<br>
      tel. 600 608 333 · kontakt@ncni.pl · ncni.pl</div></div>`;
  }

  async function home(info) {
    await loadPatients().catch(() => {});
    const n = db.pacjenci.filter((p) => !p.demo).length;
    h(`
      ${info ? `<div class="msg info">${esc(info)}</div>` : ''}
      <h1>Dzień dobry${staff ? ', ' + esc(staff.imie.split(' ')[0]) : ''}</h1>
      <p class="muted">Wybierz, co chcesz zrobić. Pacjent loguje się swoim nazwiskiem i hasłem, na tablecie w przychodni albo w domu.</p>
      <div class="spacer"></div>
      <div class="grid three">
        <button class="tile" data-go="plogin"><span class="ico">👤</span><strong>Zaloguj pacjenta</strong><span>Wylogowuje personel i otwiera logowanie pacjenta na tym urządzeniu</span></button>
        ${isAdmin() ? `<button class="tile" data-go="pacjenci"><span class="ico">🗂</span><strong>Pacjenci</strong><span>${n} ${n === 1 ? 'konto' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? 'konta' : 'kont'} · dodaj nowe</span></button>` : ''}
        <button class="tile" data-go="panel"><span class="ico">📊</span><strong>Wyniki placówki</strong><span>Ukończenia, wiedza, cele</span></button>
      </div>
      <div class="spacer"></div>
      ${orgCard()}
    `);
    $$('[data-go]').forEach((b) => b.addEventListener('click', () => ({ plogin: logout, pacjenci: patientsAdmin, panel })[b.dataset.go]()));
  }

  /* ---------- konta pacjentów (admin) ---------- */
  async function patientsAdmin(msg) {
    if (!isAdmin()) return home();
    await loadPatients();
    const list = db.pacjenci.filter((p) => !p.demo);
    const rows = list.map((p) => `<tr>
        <td><b>${esc(p.nazwisko)}</b> ${esc(p.imie)}</td>
        <td>${esc(SCIEZKI[p.sciezka]?.nazwa || p.sciezka)}</td>
        <td>${fmtDate(p.utworzono)}</td>
        <td>${statusPill(p)}</td>
        <td><button class="btn-ghost small" data-reset="${esc(p.id)}">Nowe hasło</button>
            <button class="btn-ghost small" data-del="${esc(p.id)}">Usuń</button></td></tr>`).join('');
    h(`
      <div class="row between"><h1>Pacjenci</h1><button class="btn-ghost" id="back">← Wróć</button></div>
      ${msg ? `<div class="msg ok">${msg}</div>` : ''}
      <div class="card">
        <h2>Nowe konto pacjenta</h2>
        <p class="muted">Hasło nada system. Pokażemy je tylko raz, więc zapisz je pacjentowi na kartce.</p>
        <form id="f-new" autocomplete="off">
          <div class="grid three">
            <div><label for="n-im">Imię</label><input id="n-im" type="text" required maxlength="40"></div>
            <div><label for="n-na">Nazwisko (login)</label><input id="n-na" type="text" required maxlength="60"></div>
            <div><label for="n-sc">Ścieżka</label><select id="n-sc">${Object.values(SCIEZKI).map((s) => `<option value="${s.id}">${esc(s.nazwa)}</option>`).join('')}</select></div>
          </div>
          <div class="row end" style="margin-top:18px"><button class="btn" type="submit">Załóż konto</button></div>
        </form>
      </div>
      <div class="spacer"></div>
      ${list.length ? `<div class="table-wrap"><table><thead><tr><th>Pacjent</th><th>Ścieżka</th><th>Założono</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="muted">Nie ma jeszcze żadnych kont.</p>'}
    `);
    $('#back').onclick = () => home();
    $('#f-new').onsubmit = async (e) => {
      e.preventDefault();
      const r = await api('dodaj', { imie: $('#n-im').value.trim(), nazwisko: $('#n-na').value.trim(), sciezka: $('#n-sc').value });
      patientsAdmin(`Konto założone. Login: <b>${esc(r.nazwisko)}</b>, hasło: <b>${esc(r.haslo)}</b>. Zapisz je pacjentowi na kartce. Adres: <b>${esc(location.host)}</b>`);
    };
    $$('[data-del]').forEach((b) => b.onclick = async () => {
      const p = db.pacjenci.find((x) => x.id === b.dataset.del);
      if (p && confirm(`Usunąć konto i wyniki: ${p.imie} ${p.nazwisko}?`)) { await api('usun', { id: p.id }); patientsAdmin('Konto usunięte.'); }
    });
    $$('[data-reset]').forEach((b) => b.onclick = async () => {
      const p = db.pacjenci.find((x) => x.id === b.dataset.reset);
      const r = await api('nowe_haslo', { id: p.id });
      patientsAdmin(`Nowe hasło dla ${esc(p.nazwisko)}: <b>${esc(r.haslo)}</b>`);
    });
  }

  /* ---------- ekran pacjenta ---------- */
  function patientHome() {
    const p = current, s = SCIEZKI[p.sciezka];
    const done = p.start && p.start.ukonczono;
    const ctrl = p.kontrola;
    h(`
      <div class="patient">
        <h1>Witaj, ${esc(p.imie)}!</h1>
        <p class="muted">Twoja ścieżka: <b>${esc(s.nazwa)}</b></p>
        <div class="spacer"></div>
        <div class="grid two">
          ${!done ? `<button class="tile" id="go-start"><span class="ico">${s.ikona}</span><strong>${p.start ? 'Dokończ sesję' : 'Zaczynamy'}</strong><span>Około 10–15 minut. Kilka pytań, krótkie lekcje i jeden mały cel.</span></button>` : ''}
          ${done && !ctrl ? `<button class="tile" id="go-ctrl"><span class="ico">✔</span><strong>Wizyta kontrolna</strong><span>Jak poszło z celem? Krótki quiz na koniec.</span></button>` : ''}
          ${done ? `<button class="tile" id="go-goal"><span class="ico">🎯</span><strong>Mój cel</strong><span>${esc(p.start.cel)}</span></button>` : ''}
          ${done && ctrl ? `<button class="tile" id="go-res"><span class="ico">📈</span><strong>Moje wyniki</strong><span>Porównanie wiedzy przed i po</span></button>` : ''}
          <button class="tile" id="go-breath"><span class="ico">🌬</span><strong>Spokojny oddech</strong><span>Minuta ćwiczenia oddechowego</span></button>
        </div>
        <div class="spacer"></div>
        <div class="row end"><button class="btn secondary" id="out">Zakończ i wyloguj</button></div>
      </div>`);
    $('#out').onclick = logout;
    $('#go-start') && ($('#go-start').onclick = startFlow);
    $('#go-ctrl') && ($('#go-ctrl').onclick = controlFlow);
    $('#go-goal') && ($('#go-goal').onclick = () => goalSummary(true));
    $('#go-res') && ($('#go-res').onclick = results);
    $('#go-breath').onclick = () => breathing(60, 4, 6, patientHome);
  }

  /* ---------- przebieg pierwszej sesji ---------- */
  let flow = null;

  function startFlow() {
    const s = SCIEZKI[current.sciezka];
    flow = { s, kroki: [], i: 0, odp: { wiedza: {}, etap: null, bariery: [], pomiary: null, powody: [] }, moduly: [], m: 0, k: 0 };
    flow.kroki = [
      ...s.wiedza.map((q) => ({ typ: 'wiedza', q })),
      { typ: 'gotowosc' }, { typ: 'bariery' }, { typ: 'pomiary' }
    ];
    intro();
  }

  function intro() {
    h(`<div class="patient"><div class="card slide">
        <div class="step-label">Na początek</div>
        <h2>Kilka pytań, żeby dopasować lekcje do Ciebie</h2>
        <p>Nie ma złych odpowiedzi. Jeśli czegoś nie wiesz, po prostu wybierz to, co wydaje Ci się najbliższe.</p>
        <div class="row end"><button class="btn" id="n">Zaczynam</button></div>
      </div></div>`);
    $('#n').onclick = () => question();
  }

  const totalSteps = () => flow.kroki.length + 1 + flow.moduly.reduce((a, m) => a + m.karty.length, 0) + 1;
  const progress = (done) => `<div class="progress"><i style="width:${Math.min(100, pct(done, totalSteps() || 1))}%"></i></div>`;

  function question() {
    const st = flow.kroki[flow.i], s = flow.s, o = flow.odp;
    if (!st) return buildPlan();
    let title, opts, multi = false, sel;
    if (st.typ === 'wiedza') { title = st.q.pytanie; opts = st.q.odpowiedzi.map((t, i) => ({ v: i, t })); sel = o.wiedza[st.q.id]; }
    if (st.typ === 'gotowosc') { title = s.gotowosc.pytanie; opts = s.gotowosc.odpowiedzi.map((a) => ({ v: a.etap, t: a.tekst })); sel = o.etap; }
    if (st.typ === 'bariery') { title = s.bariery.pytanie; opts = s.bariery.odpowiedzi.map((a) => ({ v: a.id, t: a.tekst })); multi = true; sel = o.bariery; }
    if (st.typ === 'pomiary') { title = s.pomiaryDom.pytanie; opts = s.pomiaryDom.odpowiedzi.map((a) => ({ v: a.id, t: a.tekst })); sel = o.pomiary; }
    const isOn = (v) => multi ? sel.includes(v) : sel === v;
    h(`<div class="patient">${progress(flow.i)}
      <div class="card">
        <div class="step-label">Pytanie ${flow.i + 1} z ${flow.kroki.length}</div>
        <h2>${esc(title)}</h2>
        <button class="speak" id="sp">🔊 Przeczytaj</button>
        <div class="choices">${opts.map((op) => `<button class="choice ${multi ? 'multi' : ''} ${isOn(op.v) ? 'on' : ''}" data-v="${esc(op.v)}"><span class="mark">✓</span>${esc(op.t)}</button>`).join('')}</div>
        <div class="row between">
          <button class="btn-ghost" id="prev">← Wstecz</button>
          <button class="btn" id="next" ${!multi && sel == null ? 'disabled' : ''}>Dalej</button>
        </div>
      </div></div>`);
    $('#sp').onclick = () => speak(title + '. ' + opts.map((x) => x.t).join('. '));
    $$('.choice').forEach((b) => b.onclick = () => {
      const raw = b.dataset.v, v = opts.find((x) => String(x.v) === raw).v;
      if (multi) {
        o.bariery = o.bariery.includes(v) ? o.bariery.filter((x) => x !== v) : [...o.bariery, v];
        b.classList.toggle('on');
      } else {
        if (st.typ === 'wiedza') o.wiedza[st.q.id] = v;
        if (st.typ === 'gotowosc') o.etap = v;
        if (st.typ === 'pomiary') o.pomiary = v;
        $$('.choice').forEach((x) => x.classList.remove('on')); b.classList.add('on');
        $('#next').disabled = false;
      }
    });
    $('#prev').onclick = () => { if (flow.i === 0) return intro(); flow.i--; question(); };
    $('#next').onclick = () => { flow.i++; question(); };
  }

  function choosePlan() {
    const s = flow.s, o = flow.odp;
    const p = {
      wiedzaBledne: s.wiedza.filter((q) => o.wiedza[q.id] !== q.poprawna).map((q) => q.id),
      etap: o.etap ?? 2, bariery: o.bariery, pomiary: o.pomiary
    };
    const sorted = [...s.moduly].sort((a, b) => a.priorytet - b.priorytet);
    let wybrane = sorted.filter((m) => m.kiedy(p));
    if (wybrane.length > 5) wybrane = wybrane.slice(0, 5);
    // moduł NCNI o stresie i oddechu dokładany, jeśli jest miejsce
    sorted.filter((m) => m.zawsze && !wybrane.includes(m)).forEach((m) => { if (wybrane.length < 5) wybrane.push(m); });
    // minimum 3 moduły
    for (const m of sorted) { if (wybrane.length >= 3) break; if (!wybrane.includes(m)) wybrane.push(m); }
    wybrane.sort((a, b) => a.priorytet - b.priorytet);
    return { profil: p, moduly: wybrane };
  }

  function buildPlan() {
    const { profil, moduly } = choosePlan();
    flow.profil = profil; flow.moduly = moduly;
    const o = flow.odp, s = flow.s;
    const score = s.wiedza.length - profil.wiedzaBledne.length;
    current.start = {
      data: Date.now(), wiedzaPrzed: { odp: { ...o.wiedza }, wynik: score, max: s.wiedza.length },
      etap: o.etap, bariery: [...o.bariery], pomiary: o.pomiary, moduly: moduly.map((m) => m.id), ukonczoneModuly: [], powody: [], cel: null, pewnosc: null, ukonczono: null
    };
    save();
    h(`<div class="patient">${progress(flow.kroki.length)}
      <div class="card">
        <div class="step-label">Twój plan</div>
        <h2>Przygotowaliśmy dla Ciebie ${moduly.length} ${moduly.length >= 5 ? 'krótkich lekcji' : 'krótkie lekcje'}</h2>
        <p class="muted">Dobraliśmy je do Twoich odpowiedzi. Każda trwa 2–3 minuty.</p>
        <ol class="plan">${moduly.map((m, i) => `<li><span class="n">${i + 1}</span>${esc(m.tytul)}<small>${esc(m.czas)}</small></li>`).join('')}</ol>
        <div class="row end"><button class="btn" id="go">Zaczynamy</button></div>
      </div></div>`);
    $('#go').onclick = () => { flow.m = 0; flow.k = 0; card(); };
  }

  function stepsDone() {
    let n = flow.kroki.length + 1;
    for (let i = 0; i < flow.m; i++) n += flow.moduly[i].karty.length;
    return n + flow.k;
  }

  function card() {
    const mod = flow.moduly[flow.m];
    if (!mod) return chooseGoal();
    const c = mod.karty[flow.k];
    if (!c) {
      if (!current.start.ukonczoneModuly.includes(mod.id)) current.start.ukonczoneModuly.push(mod.id);
      save(); flow.m++; flow.k = 0; return card();
    }
    const head = `<div class="step-label">Lekcja ${flow.m + 1} z ${flow.moduly.length} · ${esc(mod.tytul)}</div>`;
    const nav = (dis) => `<div class="row between" style="margin-top:20px">
        <button class="btn-ghost" id="prev">← Wstecz</button>
        <button class="btn" id="next" ${dis ? 'disabled' : ''}>Dalej</button></div>`;
    const prev = () => { if (flow.k > 0) flow.k--; else if (flow.m > 0) { flow.m--; flow.k = flow.moduly[flow.m].karty.length - 1; } card(); };
    const next = () => { flow.k++; card(); };

    if (c.oddech) {
      return breathing(c.oddech.sekundy, c.oddech.wdech, c.oddech.wydech, next, `${progress(stepsDone())}<div class="card">${head}`, prev);
    }
    if (c.sprawdz) {
      const q = c.sprawdz;
      h(`<div class="patient">${progress(stepsDone())}<div class="card">${head}
        <h2>Sprawdź się: ${esc(q.pytanie)}</h2>
        <div class="choices">${q.odpowiedzi.map((t, i) => `<button class="choice" data-i="${i}"><span class="mark">✓</span>${esc(t)}</button>`).join('')}</div>
        <div id="fb"></div>${nav(true)}</div></div>`);
      $$('.choice').forEach((b) => b.onclick = () => {
        const i = +b.dataset.i, ok = i === q.poprawna;
        $$('.choice').forEach((x) => { x.disabled = true; if (+x.dataset.i === q.poprawna) x.classList.add('right'); });
        if (!ok) b.classList.add('wrong');
        $('#fb').innerHTML = `<div class="feedback ${ok ? 'good' : 'bad'}"><b>${ok ? 'Dobrze!' : 'Prawie.'}</b> ${esc(q.wyjasnienie)}</div>`;
        $('#next').disabled = false;
      });
      $('#prev').onclick = prev; $('#next').onclick = next;
      return;
    }
    const w = c.wybor;
    h(`<div class="patient">${progress(stepsDone())}<div class="card slide">${head}
      <h2>${esc(c.naglowek)}</h2><p>${esc(c.tekst)}</p>
      ${w ? `<div class="choices">${w.opcje.map((t) => `<button class="choice multi ${current.start.powody.includes(t) ? 'on' : ''}" data-t="${esc(t)}"><span class="mark">✓</span>${esc(t)}</button>`).join('')}</div>` : ''}
      <div><button class="speak" id="sp">🔊 Przeczytaj</button></div>
      ${nav(false)}</div></div>`);
    $('#sp').onclick = () => speak(c.naglowek + '. ' + c.tekst);
    if (w) $$('.choice').forEach((b) => b.onclick = () => {
      const t = b.dataset.t, pw = current.start.powody;
      current.start.powody = pw.includes(t) ? pw.filter((x) => x !== t) : [...pw, t];
      b.classList.toggle('on'); save();
    });
    $('#prev').onclick = prev; $('#next').onclick = next;
  }

  /* ---------- ćwiczenie oddechowe ---------- */
  function breathing(seconds, inh, exh, onDone, wrapHead, onPrev) {
    const standalone = !wrapHead;
    h(`<div class="patient">${wrapHead || '<div class="card">'}
      <h2>Spokojny oddech</h2>
      <p class="muted">Wdech nosem, gdy koło rośnie. Powolny wydech ustami, gdy maleje.</p>
      <div class="breath"><div class="ring" id="ring">Gotowy?</div><div class="time" id="t">${seconds} s</div></div>
      <div class="row between">
        <button class="btn-ghost" id="prev">${standalone ? '← Wróć' : '← Wstecz'}</button>
        <div class="row"><button class="btn secondary" id="start">Start</button><button class="btn" id="next" ${standalone ? 'style="display:none"' : ''}>Dalej</button></div>
      </div></div></div>`);
    const ring = $('#ring'), t = $('#t');
    let timers = [], left = seconds, running = false;
    const stop = () => { timers.forEach(clearTimeout); timers.forEach(clearInterval); timers = []; running = false; };
    function cycle() {
      if (!running) return;
      ring.textContent = 'Wdech'; ring.style.transition = `transform ${inh}s ease-in-out`; ring.style.transform = 'scale(1)';
      timers.push(setTimeout(() => {
        if (!running) return;
        ring.textContent = 'Wydech'; ring.style.transition = `transform ${exh}s ease-in-out`; ring.style.transform = 'scale(.6)';
        timers.push(setTimeout(cycle, exh * 1000));
      }, inh * 1000));
    }
    $('#start').onclick = () => {
      if (running) return;
      running = true; left = seconds; $('#start').textContent = 'Trwa…'; cycle();
      const iv = setInterval(() => {
        left--; t.textContent = left + ' s';
        if (left <= 0) {
          stop(); ring.textContent = 'Brawo!'; ring.style.transform = 'scale(.8)'; $('#start').textContent = 'Jeszcze raz';
          if (standalone) { $('#next').style.display = ''; $('#next').textContent = 'Gotowe'; }
        }
      }, 1000);
      timers.push(iv);
    };
    $('#prev').onclick = () => { stop(); (onPrev || onDone)(); };
    $('#next').onclick = () => { stop(); onDone(); };
  }

  /* ---------- wybór małego celu ---------- */
  function chooseGoal() {
    const goals = [...new Set(flow.moduly.flatMap((m) => m.cele))];
    let sel = current.start.cel, conf = current.start.pewnosc;
    const render = () => {
      h(`<div class="patient">${progress(totalSteps() - 1)}<div class="card">
        <div class="step-label">Twój mały cel</div>
        <h2>Wybierz jedną rzecz, którą zrobisz do następnej wizyty</h2>
        <p class="muted">Lepiej mały cel, który się uda, niż duży, który zniechęci.</p>
        <div class="choices">${goals.map((g, i) => `<button class="choice ${sel === g ? 'on' : ''}" data-i="${i}"><span class="mark">✓</span>${esc(g)}</button>`).join('')}</div>
        ${sel ? `<h3>Na ile jesteś pewny, że Ci się uda? (1 = wcale, 10 = na pewno)</h3>
          <div class="scale">${Array.from({ length: 10 }, (_, i) => `<button class="${conf === i + 1 ? 'on' : ''}" data-c="${i + 1}">${i + 1}</button>`).join('')}</div>
          ${conf && conf < 7 ? '<div class="msg warn">Może wybierz coś łatwiejszego albo zmniejsz cel, np. 3 dni zamiast 7. Cel ma być realny.</div>' : ''}` : ''}
        <div class="row between" style="margin-top:20px">
          <button class="btn-ghost" id="prev">← Wstecz</button>
          <button class="btn" id="next" ${sel && conf ? '' : 'disabled'}>Zapisuję cel</button>
        </div></div></div>`);
      $$('.choice').forEach((b) => b.onclick = () => { sel = goals[+b.dataset.i]; render(); });
      $$('.scale button').forEach((b) => b.onclick = () => { conf = +b.dataset.c; render(); });
      $('#prev').onclick = () => { flow.m = flow.moduly.length - 1; flow.k = flow.moduly[flow.m].karty.length - 1; card(); };
      $('#next').onclick = () => {
        Object.assign(current.start, { cel: sel, pewnosc: conf, ukonczono: Date.now() });
        save(); goalSummary(false);
      };
    };
    render();
  }

  function goalSummary(fromHome) {
    const p = current, st = p.start;
    h(`<div class="patient">
      ${fromHome ? '' : '<div class="msg ok">Gotowe! Sesja ukończona. Dziękujemy.</div>'}
      <div class="goal-card">
        <div class="step-label">Mój cel do następnej wizyty</div>
        <div class="goal">${esc(st.cel)}</div>
        <div class="grid two" style="align-items:center">
          <div>
            <p><b>${esc(p.imie)} ${esc(p.nazwisko)}</b> · ${fmtDate(st.ukonczono)}</p>
            ${st.powody.length ? `<p class="muted">Moje powody: ${esc(st.powody.join(', '))}</p>` : ''}
            <p class="muted" style="font-size:.85em">Naukowe Centrum Neuroinnowacji · tel. 600 608 333 · kontakt@ncni.pl</p>
          </div>
          <div style="text-align:center"><div id="qr"></div><div class="muted" style="font-size:.75em">Zeskanuj telefonem, żeby zapisać cel</div></div>
        </div>
      </div>
      <div class="spacer"></div>
      <div class="row between no-print">
        <button class="btn-ghost" id="print">🖨 Drukuj</button>
        <button class="btn" id="ok">${fromHome ? '← Wróć' : 'Dalej'}</button>
      </div></div>`);
    try {
      if (window.QRCode) new QRCode($('#qr'), { text: `Mój cel (NCNI Krok, ${fmtDate(st.ukonczono)}): ${st.cel}`, width: 140, height: 140, correctLevel: QRCode.CorrectLevel.M });
    } catch { /* QR opcjonalny */ }
    $('#print').onclick = () => window.print();
    $('#ok').onclick = patientHome;
  }

  /* ---------- wizyta kontrolna ---------- */
  function controlFlow() {
    const s = SCIEZKI[current.sciezka];
    const ctl = { cel: null, odp: {}, i: -1 };
    const statuses = [['tak', 'Tak, udało się'], ['czesciowo', 'Częściowo'], ['nie', 'Nie udało się']];
    const step = () => {
      if (ctl.i === -1) {
        h(`<div class="patient"><div class="card">
          <div class="step-label">Wizyta kontrolna</div>
          <h2>Twój cel: „${esc(current.start.cel)}”</h2><p>Czy udało się go zrealizować?</p>
          <div class="choices">${statuses.map(([v, t]) => `<button class="choice ${ctl.cel === v ? 'on' : ''}" data-v="${v}"><span class="mark">✓</span>${t}</button>`).join('')}</div>
          <div class="row between"><button class="btn-ghost" id="prev">← Wróć</button><button class="btn" id="next" ${ctl.cel ? '' : 'disabled'}>Dalej</button></div>
        </div></div>`);
        $$('.choice').forEach((b) => b.onclick = () => { ctl.cel = b.dataset.v; step(); });
        $('#prev').onclick = patientHome; $('#next').onclick = () => { ctl.i = 0; step(); };
        return;
      }
      const q = s.wiedza[ctl.i];
      if (!q) {
        const wynik = s.wiedza.filter((x) => ctl.odp[x.id] === x.poprawna).length;
        current.kontrola = { data: Date.now(), cel: ctl.cel, wiedzaPo: { odp: ctl.odp, wynik, max: s.wiedza.length } };
        save(); return results();
      }
      const sel = ctl.odp[q.id];
      h(`<div class="patient"><div class="card">
        <div class="step-label">Krótki quiz · ${ctl.i + 1} z ${s.wiedza.length}</div>
        <h2>${esc(q.pytanie)}</h2>
        <div class="choices">${q.odpowiedzi.map((t, i) => `<button class="choice ${sel === i ? 'on' : ''}" data-i="${i}"><span class="mark">✓</span>${esc(t)}</button>`).join('')}</div>
        <div class="row between"><button class="btn-ghost" id="prev">← Wstecz</button><button class="btn" id="next" ${sel == null ? 'disabled' : ''}>Dalej</button></div>
      </div></div>`);
      $$('.choice').forEach((b) => b.onclick = () => { ctl.odp[q.id] = +b.dataset.i; step(); });
      $('#prev').onclick = () => { ctl.i--; step(); };
      $('#next').onclick = () => { ctl.i++; step(); };
    };
    step();
  }

  function results() {
    const p = current, s = SCIEZKI[p.sciezka], a = p.start.wiedzaPrzed, b = p.kontrola.wiedzaPo;
    const label = { tak: 'Cel zrealizowany', czesciowo: 'Cel zrealizowany częściowo', nie: 'Cel niezrealizowany' }[p.kontrola.cel];
    h(`<div class="patient"><div class="card">
      <div class="step-label">Twoje wyniki</div>
      <h2>${b.wynik > a.wynik ? 'Twoja wiedza wzrosła!' : b.wynik === b.max ? 'Świetnie, wszystko wiesz!' : 'Dziękujemy za udział'}</h2>
      <div class="stats">
        <div class="stat"><div class="v">${a.wynik}/${a.max}</div><div class="l">Wiedza na początku</div></div>
        <div class="stat"><div class="v">${b.wynik}/${b.max}</div><div class="l">Wiedza teraz</div></div>
        <div class="stat"><div class="v" style="font-size:1.1em">${label}</div><div class="l">${esc(p.start.cel)}</div></div>
      </div>
      <h3>Poprawne odpowiedzi</h3>
      ${s.wiedza.map((q) => `<p><b>${esc(q.pytanie)}</b><br>${esc(q.odpowiedzi[q.poprawna])}. <span class="muted">${esc(q.wyjasnienie)}</span></p>`).join('')}
      <div class="row end"><button class="btn" id="ok">Gotowe</button></div>
    </div></div>`);
    $('#ok').onclick = patientHome;
  }

  /* ---------- panel placówki ---------- */
  function statusPill(p) {
    if (p.kontrola) return { tak: '<span class="pill ok">cel: tak</span>', czesciowo: '<span class="pill part">cel: częściowo</span>', nie: '<span class="pill no">cel: nie</span>' }[p.kontrola.cel];
    if (p.start && p.start.ukonczono) return '<span class="pill wait">czeka na kontrolę</span>';
    if (p.start) return '<span class="pill part">w trakcie</span>';
    return '<span class="pill wait">nie zaczęto</span>';
  }

  async function panel() {
    await loadPatients();
    const P = db.pacjenci;
    const started = P.filter((p) => p.start), done = P.filter((p) => p.start && p.start.ukonczono), ctl = P.filter((p) => p.kontrola);
    const avg = (arr, f) => arr.length ? (arr.reduce((a, x) => a + f(x), 0) / arr.length) : 0;
    const before = avg(ctl, (p) => p.start.wiedzaPrzed.wynik / p.start.wiedzaPrzed.max * 100);
    const after = avg(ctl, (p) => p.kontrola.wiedzaPo.wynik / p.kontrola.wiedzaPo.max * 100);
    const c = { tak: 0, czesciowo: 0, nie: 0 }; ctl.forEach((p) => c[p.kontrola.cel]++);
    const modCount = {}; done.forEach((p) => p.start.moduly.forEach((m) => modCount[m] = (modCount[m] || 0) + 1));
    const allMods = Object.values(SCIEZKI).flatMap((s) => s.moduly);
    const modName = (id) => allMods.find((m) => m.id === id)?.tytul || id;
    const rows = P.map((p) => `<tr>
      <td><b>${esc(p.nazwisko)}</b> ${esc(p.imie)}</td>
      <td>${p.start ? fmtDate(p.start.data) : '–'}</td>
      <td>${p.start ? p.start.wiedzaPrzed.wynik + '/' + p.start.wiedzaPrzed.max : '–'}</td>
      <td>${p.kontrola ? p.kontrola.wiedzaPo.wynik + '/' + p.kontrola.wiedzaPo.max : '–'}</td>
      <td style="white-space:normal;min-width:220px">${p.start?.cel ? esc(p.start.cel) : '–'}</td>
      <td>${p.start?.pewnosc ?? '–'}</td>
      <td>${statusPill(p)}</td></tr>`).join('');
    h(`
      <div class="row between"><h1>Wyniki placówki</h1><button class="btn-ghost" id="back">← Wróć</button></div>
      <p class="muted">Wszyscy pacjenci placówki, ze wszystkich urządzeń.</p>
      <div class="stats">
        <div class="stat"><div class="v">${P.length}</div><div class="l">Konta pacjentów</div></div>
        <div class="stat"><div class="v">${done.length}<small style="font-size:.45em;color:var(--muted)"> / ${started.length}</small></div><div class="l">Ukończone sesje / rozpoczęte</div></div>
        <div class="stat"><div class="v">${ctl.length}</div><div class="l">Wizyty kontrolne</div></div>
        <div class="stat"><div class="v">${ctl.length ? Math.round(before) + '% → ' + Math.round(after) + '%' : '–'}</div><div class="l">Wiedza przed → po (śr., po kontroli)</div></div>
      </div>
      <div class="grid two">
        <div class="card"><h3>Realizacja celów</h3>
          ${ctl.length ? `<div class="bar"><i style="width:${pct(c.tak, ctl.length)}%;background:#15803d"></i><i style="width:${pct(c.czesciowo, ctl.length)}%;background:#f59e0b"></i><i style="width:${pct(c.nie, ctl.length)}%;background:#ef4444"></i></div>
          <div class="legend"><span style="--c:#15803d">tak ${c.tak}</span><span style="--c:#f59e0b">częściowo ${c.czesciowo}</span><span style="--c:#ef4444">nie ${c.nie}</span></div>` : '<p class="muted">Brak wizyt kontrolnych.</p>'}
        </div>
        <div class="card"><h3>Najczęściej dobierane lekcje</h3>
          ${Object.keys(modCount).length ? Object.entries(modCount).sort((a, b) => b[1] - a[1]).map(([id, n]) => `<div class="row between"><span>${esc(modName(id))}</span><b>${n}</b></div>`).join('') : '<p class="muted">Brak ukończonych sesji.</p>'}
        </div>
      </div>
      <div class="spacer"></div>
      ${P.length ? `<div class="table-wrap"><table><thead><tr><th>Pacjent</th><th>Start</th><th>Wiedza przed</th><th>Wiedza po</th><th>Cel</th><th>Pewność</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>` : ''}
      <div class="spacer"></div>
      <div class="row">
        <button class="btn secondary" id="csv">Pobierz CSV</button>
        ${isAdmin() ? '<button class="btn-ghost" id="demo">Wczytaj przykładowe dane</button><button class="btn-ghost" id="clear">Usuń dane przykładowe</button>' : ''}
      </div>`);
    $('#back').onclick = () => home();
    $('#csv').onclick = exportCsv;
    $('#demo') && ($('#demo').onclick = async () => { await api('demo'); panel(); });
    $('#clear') && ($('#clear').onclick = async () => { await api('usun_demo'); panel(); });
  }

  function exportCsv() {
    const head = ['nazwisko', 'imie', 'sciezka', 'start', 'wiedza_przed', 'etap_gotowosci', 'bariery', 'moduly', 'cel', 'pewnosc', 'ukonczono', 'kontrola', 'cel_status', 'wiedza_po'];
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = db.pacjenci.map((p) => [
      p.nazwisko, p.imie, p.sciezka, p.start && new Date(p.start.data).toISOString(), p.start?.wiedzaPrzed.wynik, p.start?.etap,
      p.start?.bariery.join('|'), p.start?.moduly.join('|'), p.start?.cel, p.start?.pewnosc, p.start?.ukonczono && new Date(p.start.ukonczono).toISOString(),
      p.kontrola && new Date(p.kontrola.data).toISOString(), p.kontrola?.cel, p.kontrola?.wiedzaPo.wynik
    ].map(q).join(';'));
    const blob = new Blob(['﻿' + [head.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `ncni_krok_wyniki_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------- start ---------- */
  document.getElementById('btn-font').onclick = () => document.documentElement.classList.toggle('big');

  (async function init() {
    if (!staff) { logout(); return; }
    if (staff.typ === 'pacjent') {
      const r = await api('ja');
      current = r.pacjent;
      setHeader(); touchIdle(); patientHome();
      return;
    }
    setHeader();
    home();
  })();
})();

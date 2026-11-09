/*
 * Ścieżka edukacyjna: Nadciśnienie tętnicze + stres
 * WERSJA DEMONSTRACYJNA – treści do weryfikacji przez lekarza przed użyciem z pacjentami.
 * Format: zwykły obiekt JS, żeby NCNI mogło poprawiać teksty bez programisty.
 */
window.NK_SCIEZKI = window.NK_SCIEZKI || {};
window.NK_SCIEZKI.nadcisnienie = {
  id: "nadcisnienie",
  nazwa: "Nadciśnienie i stres",
  opis: "Ciśnienie, pomiary w domu, leki, sól, ruch i spokojny oddech.",
  ikona: "❤",
  wersja: "0.1 demo – do weryfikacji medycznej",

  // Pytania wiedzy: zadawane na początku i na wizycie kontrolnej (pomiar zmiany wiedzy)
  wiedza: [
    {
      id: "w_objawy",
      pytanie: "Czy podwyższone ciśnienie zwykle daje wyraźne objawy?",
      odpowiedzi: ["Tak, zawsze boli głowa", "Często nie daje żadnych objawów", "Tak, zawsze widać zaczerwienienie twarzy"],
      poprawna: 1,
      wyjasnienie: "Nadciśnienie często przez lata nie daje objawów. Dlatego tak ważne są regularne pomiary."
    },
    {
      id: "w_dom",
      pytanie: "Od jakiej wartości ciśnienie mierzone w domu uznaje się zwykle za podwyższone?",
      odpowiedzi: ["Od 120/70 mmHg", "Od 135/85 mmHg", "Od 170/110 mmHg"],
      poprawna: 1,
      wyjasnienie: "W pomiarach domowych za podwyższone uznaje się zwykle wartości od 135/85 mmHg. Swój cel ustala lekarz."
    },
    {
      id: "w_sol",
      pytanie: "Ile soli dziennie zaleca się maksymalnie dorosłej osobie?",
      odpowiedzi: ["Mniej niż 5 g, czyli około łyżeczki", "Około 15 g", "Ilość soli nie ma znaczenia"],
      poprawna: 0,
      wyjasnienie: "Zalecenie to mniej niż 5 g soli dziennie, licząc też sól ukrytą w pieczywie, wędlinach i gotowych daniach."
    }
  ],

  // Gotowość do zmiany (uproszczone etapy zmiany)
  gotowosc: {
    pytanie: "Jak teraz myślisz o zmianie swoich nawyków związanych z ciśnieniem?",
    odpowiedzi: [
      { tekst: "Nie myślę o tym", etap: 0 },
      { tekst: "Myślę, ale jeszcze nie teraz", etap: 1 },
      { tekst: "Chcę zacząć w najbliższym miesiącu", etap: 2 },
      { tekst: "Już coś zmieniam", etap: 3 }
    ]
  },

  // Co przeszkadza (wielokrotny wybór)
  bariery: {
    pytanie: "Co jest dla Ciebie najtrudniejsze? Możesz wybrać kilka.",
    odpowiedzi: [
      { id: "leki", tekst: "Zapominam o lekach" },
      { id: "pomiar", tekst: "Nie mierzę ciśnienia w domu" },
      { id: "sol", tekst: "Jem słono lub dużo gotowych produktów" },
      { id: "ruch", tekst: "Mało się ruszam" },
      { id: "stres", tekst: "Dużo stresu albo źle śpię" },
      { id: "start", tekst: "Nie wiem, od czego zacząć" }
    ]
  },

  pomiaryDom: {
    pytanie: "Czy mierzysz ciśnienie w domu?",
    odpowiedzi: [
      { id: "tak", tekst: "Tak, regularnie" },
      { id: "czasem", tekst: "Czasem" },
      { id: "nie", tekst: "Nie" },
      { id: "brak", tekst: "Nie mam ciśnieniomierza" }
    ]
  },

  /*
   * Moduły. Pole `kiedy(p)` decyduje, czy moduł trafia do ścieżki pacjenta.
   * p = { wiedzaBledne: [id], etap: 0-3, bariery: [id], pomiary: id }
   * `priorytet`: im mniejszy, tym wcześniej. Pacjent dostaje 3–5 modułów.
   */
  moduly: [
    {
      id: "motywacja",
      tytul: "Po co mi to?",
      czas: "2 min",
      priorytet: 1,
      kiedy: (p) => p.etap <= 1,
      karty: [
        { naglowek: "Nie musisz zmieniać wszystkiego", tekst: "Nikt nie oczekuje rewolucji. Wystarczy jedna mała rzecz, którą naprawdę dasz radę zrobić." },
        { naglowek: "Twoje powody są najważniejsze", tekst: "Ludzie dbają o ciśnienie z różnych powodów. Wybierz te, które są bliskie Tobie.", wybor: { id: "powody", wielokrotny: true, opcje: ["Chcę mieć siłę dla rodziny", "Chcę dłużej być samodzielny", "Chcę uniknąć zawału lub udaru", "Chcę lepiej się czuć na co dzień", "Chcę brać mniej leków w przyszłości"] } },
        { naglowek: "Co może przeszkadzać?", tekst: "To normalne, że coś przeszkadza. Na końcu wybierzesz cel tak mały, żeby przeszkody nie wygrały." }
      ],
      cele: ["Zapiszę na kartce jeden powód, dla którego chcę dbać o ciśnienie, i powieszę ją w widocznym miejscu"]
    },
    {
      id: "podstawy",
      tytul: "Czym jest nadciśnienie",
      czas: "2 min",
      priorytet: 2,
      kiedy: (p) => p.wiedzaBledne.length >= 1 || p.bariery.includes("start"),
      karty: [
        { naglowek: "Ciśnienie to siła, z jaką krew naciska na naczynia", tekst: "Gdy przez długi czas jest za wysokie, naczynia, serce, nerki i mózg pracują pod większym obciążeniem." },
        { naglowek: "Cicho, ale nie bez skutków", tekst: "Nadciśnienie często nie boli. Można czuć się dobrze, a mimo to mieć za wysokie ciśnienie." },
        { naglowek: "Dobra wiadomość", tekst: "Regularne pomiary, leki zalecone przez lekarza i kilka nawyków naprawdę obniżają ryzyko powikłań." },
        { sprawdz: { pytanie: "Ktoś czuje się świetnie. Czy to znaczy, że ma prawidłowe ciśnienie?", odpowiedzi: ["Tak", "Niekoniecznie, trzeba zmierzyć"], poprawna: 1, wyjasnienie: "Samopoczucie nie mówi, jakie jest ciśnienie. Mówi o tym tylko pomiar." } }
      ],
      cele: ["Zapytam lekarza lub pielęgniarkę, jakie ciśnienie jest moim celem, i zapiszę tę wartość"]
    },
    {
      id: "pomiar",
      tytul: "Jak mierzyć ciśnienie w domu",
      czas: "3 min",
      priorytet: 3,
      kiedy: (p) => p.pomiary !== "tak" || p.bariery.includes("pomiar"),
      karty: [
        { naglowek: "Przygotowanie", tekst: "Przed pomiarem usiądź i odpocznij 5 minut. Nie pij kawy i nie pal przez 30 minut wcześniej." },
        { naglowek: "Pozycja", tekst: "Plecy oparte, stopy na podłodze, ręka na stole na wysokości serca. Mankiet na gołym ramieniu. Nie rozmawiaj w trakcie." },
        { naglowek: "Kiedy mierzyć", tekst: "Najlepiej rano i wieczorem, po 2 pomiary w odstępie minuty, przez 7 dni przed wizytą. Zapisuj wszystkie wyniki." },
        { sprawdz: { pytanie: "Kiedy najlepiej zmierzyć ciśnienie?", odpowiedzi: ["Zaraz po wejściu po schodach", "Po 5 minutach spokojnego siedzenia", "W trakcie rozmowy przez telefon"], poprawna: 1, wyjasnienie: "Ruch, rozmowa i kawa podnoszą wynik. Pomiar po odpoczynku pokazuje prawdziwy obraz." } }
      ],
      cele: [
        "Przez 7 dni przed następną wizytą zmierzę ciśnienie rano i wieczorem i zapiszę wyniki",
        "Do końca tygodnia zdobędę ciśnieniomierz naramienny i nauczę się go używać"
      ]
    },
    {
      id: "leki",
      tytul: "Leki: codziennie, nawet gdy jest dobrze",
      czas: "2 min",
      priorytet: 4,
      kiedy: (p) => p.bariery.includes("leki"),
      karty: [
        { naglowek: "Lek działa, gdy jest brany regularnie", tekst: "Dobre wyniki często oznaczają, że lek działa, a nie że można go odstawić. Zmiany zawsze z lekarzem." },
        { naglowek: "Przypięcie do nawyku", tekst: "Połóż leki obok szczoteczki do zębów albo ekspresu do kawy. Stała pora i stałe miejsce pomagają najbardziej." },
        { naglowek: "Przypomnienie", tekst: "Ustaw codzienny alarm w telefonie albo użyj pudełka na tabletki z dniami tygodnia." },
        { sprawdz: { pytanie: "Wyniki są dobre od miesiąca. Co zrobić z lekiem?", odpowiedzi: ["Odstawić samodzielnie", "Brać dalej i porozmawiać z lekarzem"], poprawna: 1, wyjasnienie: "Dobre wyniki to zwykle zasługa leku. Decyzję o zmianie podejmuje lekarz." } }
      ],
      cele: [
        "Przez 2 tygodnie będę brać leki o stałej porze, z przypomnieniem w telefonie",
        "Kupię pudełko na tabletki z dniami tygodnia i zacznę go używać od jutra"
      ]
    },
    {
      id: "sol",
      tytul: "Sól: gdzie się chowa",
      czas: "2 min",
      priorytet: 5,
      kiedy: (p) => p.bariery.includes("sol") || p.wiedzaBledne.includes("w_sol"),
      karty: [
        { naglowek: "Najwięcej soli nie pochodzi z solniczki", tekst: "Dużo soli jest w pieczywie, wędlinach, serach żółtych, zupach z torebki, przekąskach i gotowych daniach." },
        { naglowek: "Mniej niż łyżeczka dziennie", tekst: "Zalecenie to mniej niż 5 g soli na dobę. Smak przyzwyczaja się do mniejszej ilości w kilka tygodni." },
        { naglowek: "Zamiany, które działają", tekst: "Zioła, czosnek, cytryna i pieprz zamiast soli. Etykieta: porównaj zawartość soli w dwóch podobnych produktach i wybierz tę z mniejszą." },
        { sprawdz: { pytanie: "Który produkt ma zwykle najwięcej ukrytej soli?", odpowiedzi: ["Jabłko", "Wędlina", "Surowa marchew"], poprawna: 1, wyjasnienie: "Wędliny, sery żółte i gotowe dania to główne źródła ukrytej soli." } }
      ],
      cele: [
        "Przez 2 tygodnie nie będę dosalać potraw przy stole",
        "Zamienię jedną słoną przekąskę dziennie na owoc lub warzywo"
      ]
    },
    {
      id: "ruch",
      tytul: "Ruch, który się liczy",
      czas: "2 min",
      priorytet: 6,
      kiedy: (p) => p.bariery.includes("ruch"),
      karty: [
        { naglowek: "Nie trzeba siłowni", tekst: "Szybki spacer, rower, pływanie, prace w ogrodzie. Liczy się ruch, przy którym lekko przyspiesza oddech." },
        { naglowek: "Cel na tydzień", tekst: "Dla dorosłych zaleca się co najmniej 150 minut umiarkowanego ruchu w tygodniu. Można zacząć od 10 minut dziennie." },
        { naglowek: "Bezpiecznie", tekst: "Jeśli masz choroby serca lub bardzo wysokie ciśnienie, zapytaj lekarza, jaki wysiłek jest dla Ciebie odpowiedni." }
      ],
      cele: [
        "Będę chodzić na 15-minutowy spacer 5 dni w tygodniu przez najbliższe 2 tygodnie",
        "Raz dziennie wybiorę schody zamiast windy"
      ]
    },
    {
      id: "stres",
      tytul: "Stres i spokojny oddech",
      czas: "3 min",
      priorytet: 7,
      zawsze: true, // moduł NCNI: dokładany, jeśli zostało miejsce w ścieżce
      kiedy: (p) => p.bariery.includes("stres"),
      karty: [
        { naglowek: "Stres podnosi ciśnienie", tekst: "W stresie serce bije szybciej, a naczynia się zwężają. Gdy stres trwa długo, ciało rzadko ma czas odpocząć." },
        { naglowek: "Oddech to najprostszy hamulec", tekst: "Powolny oddech, około 6 oddechów na minutę, uspokaja układ nerwowy. Spróbujmy teraz przez minutę." },
        { oddech: { sekundy: 60, wdech: 4, wydech: 6 } },
        { naglowek: "Jak się czujesz?", tekst: "Wiele osób czuje się spokojniej już po minucie. Takie ćwiczenie można robić codziennie, np. przed snem." }
      ],
      cele: [
        "Codziennie przed snem zrobię 3 minuty spokojnego oddechu",
        "Gdy poczuję napięcie, zatrzymam się na 5 powolnych oddechów"
      ]
    }
  ]
};

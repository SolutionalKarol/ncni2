# Google: wdrożenie i kontrola pomiarów ncni.pl

Zakres tych zmian jest techniczny. Nie zmieniają układu, kolorów, zdjęć ani widocznych tekstów strony.

## Istniejące integracje

- Google Analytics 4: identyfikator pomiaru `G-56VR40VHHV`.
- Google Ads: zachowany istniejący tag `AW-18029740902`.
- Consentmanager: zachowana istniejąca konfiguracja `93e58d8b2275d`.
- Search Console: istniejąca usługa `https://ncni.pl/`, połączona z GA4 30.10.2026.
- Profil Firmy: istniejąca wizytówka NCNI; adres, telefon i godziny powinny odpowiadać danym na stronie.

Nie zakładać nowych usług GA4 ani nowych wizytówek dla tych samych celów.

## Co zawierają poprawki

1. Usunięcie podwójnej inicjalizacji GA4 w `migrena.html` i `dcd.html`.
2. Uzupełnienie brakujących tagów oraz obsługi zgód w dokumentach, w których ich brakowało.
3. Domyślne odmowy dla `analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization` ustawione przed tagami. Aktualizacje decyzji obsługuje istniejący consentmanager.
4. Sobotnie godziny placówki w JSON-LD: 10:00–14:00; poniedziałek–piątek 09:00–20:00. Są to godziny placówki, nie odrębne godziny konsultacji online.
5. Odnośnik do istniejącej lokalizacji w Mapach w JSON-LD.
6. Pomiar zamiaru kontaktu we wspólnym `assets/ncni-runtime.js`.

## Wgranie na hosting

Commit na GitHubie nie oznacza automatycznie aktualizacji OVH. Właściwe pliki muszą zostać skopiowane do katalogu obsługującego ncni.pl. Wdrożenie hostingu wykonuje administrator hostingu.

Zmiany dotyczą pełnych dokumentów HTML oraz `assets/ncni-runtime.js`. Nie wymagają zmiany CSS ani obrazów. Zachować istniejące ustawienia serwera, pozostałe zasoby i działającą konfigurację consentmanager.

Parametr wersji wspólnego skryptu to `v=20261030-analytics`. Pozwala pobrać nową wersję mimo wcześniejszego cache przeglądarki.

## Zdarzenia kontaktu

- `contact_phone_click`: kliknięcie linku `tel:`.
- `contact_email_click`: kliknięcie linku `mailto:`.

Warunki wysyłania:

- właściwa domena: `ncni.pl` lub `www.ncni.pl`;
- dostępne funkcje `gtag` i `__cmp`;
- aktualna, jawna zgoda dostawcy Google Analytics (`s26`) odczytana przez `__cmp('getCMPData')`;
- działanie użytkownika nie zostało anulowane.

Nie buforujemy kliknięć wykonanych przed zgodą. Kod nie wysyła jako parametrów numeru telefonu, adresu e-mail, tematu wiadomości ani opisu linku. URL strony i referrer dla tych zdarzeń są pozbawiane query i fragmentu.

Kliknięcie nie oznacza przeprowadzonej rozmowy, wysłanego e-maila ani umówionej wizyty. Nie importować takich zdarzeń automatycznie jako potwierdzonych rezerwacji lub sprzedaży do Google Ads.

## Konwersje

W GA4 wyłączono oznaczenie kluczowego zdarzenia `ads_conversion_Przes_anie_formularza_k_1`, ponieważ reguła mierzyła samo wyświetlenie `/o-nas.html`. Zachowano historię zdarzenia. Nie odtwarzać tej reguły jako konwersji formularza.

Po wdrożeniu i potwierdzeniu odbioru nowych zdarzeń można analizować zamiar kontaktu w raportach. Pomiar faktycznie umówionych wizyt wymaga osobnego źródła potwierdzenia.

## Profil Firmy i wejścia do strony

Docelowy link w wizytówce:

`https://ncni.pl/?utm_source=google&utm_medium=organic&utm_campaign=profil_firmy`

Google może sprawdzać zmianę przed publikacją. W GA4 sprawdzać kampanię sesji `profil_firmy`; dane wymagają poprawnego wdrożenia tagu oraz decyzji odwiedzającego dotyczącej zgód. Nie traktować liczby kliknięć w profilu jako liczby sesji GA4 — to różne pomiary.

## Kontrola po wdrożeniu

- Na publicznym adresie strony technologii widoczny jest właściwy tag GA4 i CMP.
- Każdy pełny dokument ma jedną konfigurację tego identyfikatora GA4.
- Domyślne zgody są ustawione przed tagami.
- W nowej sesji bez zgody kliknięcia telefonu i e-maila nie wywołują nowych zdarzeń kontaktu.
- Po akceptacji Google Analytics kliknięcia są widoczne w GA4 Realtime / DebugView; po cofnięciu zgody przestają być wysyłane przez kod kontaktowy.
- Telefon i e-mail nadal działają normalnie.
- Wygląd witryny pozostał taki sam.
- JSON-LD zawiera sobotnie godziny, a canonical nadal wskazuje właściwe publiczne adresy.
- `robots.txt` i `sitemap.xml` są dostępne; status mapy w istniejącym Search Console jest prawidłowy.

Indeksowanie i agregacja statystyk wymagają czasu. Poprawna konfiguracja nie gwarantuje pozycji w wynikach wyszukiwania.

## Dokumentacja źródłowa

- [Google Consent Mode](https://developers.google.com/tag-platform/security/guides/consent)
- [Zdarzenia GA4](https://developers.google.com/analytics/devguides/collection/ga4/events)
- [Odczyt zgody dostawcy w consentmanager](https://www.consentmanager.net/en/help/developer-reference/checking-consent-for-a-vendor/)
- [Lokalne wyniki Google i kompletność Profilu Firmy](https://support.google.com/business/answer/7091?hl=pl)

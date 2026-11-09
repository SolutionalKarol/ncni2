<?php
/*
 * NCNI Krok – API (JSON). Każde wywołanie wymaga zalogowanej sesji.
 * Personel (admin): lista/zakładanie/usuwanie pacjentów, wyniki, dane przykładowe.
 * Pacjent: tylko własne dane.
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';
nk_security_headers();
header('Content-Type: application/json; charset=utf-8');

function out($data, int $code = 200): void {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

$user = nk_user();
if (!$user) out(['blad' => 'Sesja wygasła. Zaloguj się ponownie.'], 401);
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || ($_SERVER['HTTP_X_NK'] ?? '') !== '1') out(['blad' => 'Niedozwolone żądanie.'], 400);

$in = json_decode((string)file_get_contents('php://input'), true) ?: [];
$a = (string)($in['akcja'] ?? '');
$db = nk_db();
$isAdmin = ($user['rola'] ?? '') === 'admin';

function row_out(array $r): array {
  return [
    'id' => $r['id'], 'imie' => $r['imie'], 'nazwisko' => $r['nazwisko'], 'sciezka' => $r['sciezka'],
    'utworzono' => (int)$r['utworzono'], 'demo' => (bool)$r['demo'],
    'start' => $r['start'] ? json_decode($r['start'], true) : null,
    'kontrola' => $r['kontrola'] ? json_decode($r['kontrola'], true) : null,
  ];
}

function clean_json($v, int $max = 20000): ?string {
  if ($v === null) return null;
  $s = json_encode($v, JSON_UNESCAPED_UNICODE);
  if ($s === false || strlen($s) > $max) out(['blad' => 'Nieprawidłowe dane.'], 400);
  return $s;
}

switch ($a) {
  case 'ja':
    if ($user['typ'] === 'pacjent') {
      $st = $db->prepare('SELECT * FROM pacjenci WHERE id = ?');
      $st->execute([$user['id']]);
      $r = $st->fetch();
      if (!$r) { nk_logout(); out(['blad' => 'Konto nie istnieje.'], 401); }
      out(['user' => $user, 'pacjent' => row_out($r)]);
    }
    out(['user' => $user]);

  case 'zapisz': // pacjent zapisuje postęp
    if ($user['typ'] !== 'pacjent') out(['blad' => 'Tylko dla pacjenta.'], 403);
    $db->prepare('UPDATE pacjenci SET start = ?, kontrola = ? WHERE id = ?')
      ->execute([clean_json($in['start'] ?? null), clean_json($in['kontrola'] ?? null), $user['id']]);
    out(['ok' => true]);

  case 'pacjenci':
    if (!$isAdmin) out(['blad' => 'Brak uprawnień.'], 403);
    $rows = $db->query('SELECT * FROM pacjenci ORDER BY utworzono DESC')->fetchAll();
    out(['pacjenci' => array_map('row_out', $rows)]);

  case 'dodaj':
    if (!$isAdmin) out(['blad' => 'Brak uprawnień.'], 403);
    $imie = trim((string)($in['imie'] ?? ''));
    $nazwisko = trim((string)($in['nazwisko'] ?? ''));
    $sciezka = preg_replace('/[^a-z0-9_-]/', '', (string)($in['sciezka'] ?? 'nadcisnienie'));
    if ($imie === '' || $nazwisko === '' || mb_strlen($imie) > 40 || mb_strlen($nazwisko) > 60) out(['blad' => 'Podaj imię i nazwisko.'], 400);
    $pw = nk_random_password();
    $id = 'p' . bin2hex(random_bytes(6));
    $db->prepare('INSERT INTO pacjenci (id, imie, nazwisko, nazwisko_norm, hash, sciezka, utworzono) VALUES (?,?,?,?,?,?,?)')
      ->execute([$id, $imie, $nazwisko, nk_norm($nazwisko), password_hash($pw, PASSWORD_DEFAULT), $sciezka, time() * 1000]);
    out(['ok' => true, 'haslo' => $pw, 'nazwisko' => $nazwisko]);

  case 'nowe_haslo':
    if (!$isAdmin) out(['blad' => 'Brak uprawnień.'], 403);
    $pw = nk_random_password();
    $st = $db->prepare('UPDATE pacjenci SET hash = ? WHERE id = ?');
    $st->execute([password_hash($pw, PASSWORD_DEFAULT), (string)($in['id'] ?? '')]);
    out(['ok' => $st->rowCount() > 0, 'haslo' => $pw]);

  case 'usun':
    if (!$isAdmin) out(['blad' => 'Brak uprawnień.'], 403);
    $db->prepare('DELETE FROM pacjenci WHERE id = ?')->execute([(string)($in['id'] ?? '')]);
    out(['ok' => true]);

  case 'demo':
    if (!$isAdmin) out(['blad' => 'Brak uprawnień.'], 403);
    $day = 86400000; $now = time() * 1000;
    $demo = [
      ['Anna', 'Przykładowa', 1, 3, 'Przez 7 dni przed następną wizytą zmierzę ciśnienie rano i wieczorem i zapiszę wyniki', 8, 'tak', 3],
      ['Jan', 'Testowy', 0, 1, 'Przez 2 tygodnie nie będę dosalać potraw przy stole', 7, 'czesciowo', 2],
      ['Maria', 'Demo', 2, 2, 'Codziennie przed snem zrobię 3 minuty spokojnego oddechu', 9, 'tak', 3],
      ['Piotr', 'Wzorcowy', 1, 0, 'Będę chodzić na 15-minutowy spacer 5 dni w tygodniu przez najbliższe 2 tygodnie', 6, 'nie', 2],
      ['Ewa', 'Pokazowa', 2, 2, 'Przez 2 tygodnie będę brać leki o stałej porze, z przypomnieniem w telefonie', 8, null, null],
    ];
    $db->exec('DELETE FROM pacjenci WHERE demo = 1');
    $ins = $db->prepare('INSERT INTO pacjenci (id, imie, nazwisko, nazwisko_norm, hash, sciezka, utworzono, demo, start, kontrola) VALUES (?,?,?,?,?,?,?,1,?,?)');
    $hash = password_hash(nk_random_password(16), PASSWORD_DEFAULT); // konta przykładowe bez możliwości logowania
    foreach ($demo as $i => [$imie, $nazwisko, $wp, $etap, $cel, $pewnosc, $cs, $wpo]) {
      $t = $now - (20 - $i * 2) * $day;
      $start = ['data' => $t, 'wiedzaPrzed' => ['odp' => new stdClass(), 'wynik' => $wp, 'max' => 3], 'etap' => $etap, 'bariery' => ['pomiar', 'stres'],
        'pomiary' => 'czasem', 'moduly' => ['podstawy', 'pomiar', 'stres'], 'ukonczoneModuly' => ['podstawy', 'pomiar', 'stres'], 'powody' => [],
        'cel' => $cel, 'pewnosc' => $pewnosc, 'ukonczono' => $t + 900000];
      $k = $cs ? ['data' => $t + 14 * $day, 'cel' => $cs, 'wiedzaPo' => ['odp' => new stdClass(), 'wynik' => $wpo, 'max' => 3]] : null;
      $ins->execute(['demo' . $i, $imie, $nazwisko, nk_norm($nazwisko), $hash, 'nadcisnienie', $t, json_encode($start, JSON_UNESCAPED_UNICODE), $k ? json_encode($k, JSON_UNESCAPED_UNICODE) : null]);
    }
    out(['ok' => true]);

  case 'usun_demo':
    if (!$isAdmin) out(['blad' => 'Brak uprawnień.'], 403);
    $db->exec('DELETE FROM pacjenci WHERE demo = 1');
    out(['ok' => true]);

  default:
    out(['blad' => 'Nieznana akcja.'], 400);
}

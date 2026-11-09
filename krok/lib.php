<?php
/*
 * NCNI Krok – wspólne funkcje serwera (hosting OVH, PHP 7.4+).
 * Dane w SQLite w katalogu krok/dane (zablokowany dla przeglądarki, poza repozytorium).
 */
declare(strict_types=1);

const NK_ADMIN_EMAIL = 'kontakt@ncni.pl';
const NK_ADMIN_NAME = 'Sebastian Kraszewski';
const NK_SESSION_HOURS = 10;
const NK_MAX_FAILS = 8;          // nieudane logowania z jednego IP
const NK_FAIL_WINDOW = 900;      // w ciągu 15 minut

function nk_dev(): bool { return getenv('KROK_DEV') === '1'; }

function nk_is_https(): bool {
  return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

function nk_session(): void {
  if (session_status() === PHP_SESSION_ACTIVE) return;
  session_name('nk_sesja');
  session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/krok/',
    'secure' => nk_is_https(),
    'httponly' => true,
    'samesite' => 'Strict',
  ]);
  ini_set('session.use_strict_mode', '1');
  ini_set('session.gc_maxlifetime', (string)(NK_SESSION_HOURS * 3600));
  session_start();
  if (!empty($_SESSION['exp']) && $_SESSION['exp'] < time()) {
    $_SESSION = [];
    session_regenerate_id(true);
  }
}

function nk_user(): ?array {
  nk_session();
  return $_SESSION['user'] ?? null;
}

function nk_login(array $user): void {
  nk_session();
  session_regenerate_id(true);
  $_SESSION['user'] = $user;
  $_SESSION['exp'] = time() + NK_SESSION_HOURS * 3600;
}

function nk_logout(): void {
  nk_session();
  $_SESSION = [];
  session_regenerate_id(true);
  session_destroy();
}

/* Dane najlepiej poza katalogiem strony (OVH: obok folderu www); w razie braku uprawnień krok/dane z blokadą .htaccess */
function nk_data_dir(): string {
  static $dir = null;
  if ($dir) return $dir;
  $root = rtrim((string)($_SERVER['DOCUMENT_ROOT'] ?? ''), '/');
  $outside = $root !== '' ? dirname($root) . '/ncni_krok_dane' : '';
  if (!nk_dev() && $outside !== '' && (is_dir($outside) || @mkdir($outside, 0700, true)) && is_writable($outside)) {
    return $dir = $outside;
  }
  $dir = __DIR__ . '/dane';
  if (!is_dir($dir)) { mkdir($dir, 0700, true); }
  return $dir;
}

function nk_db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  $dir = nk_data_dir();
  if (!file_exists($dir . '/.htaccess')) {
    file_put_contents($dir . '/.htaccess', "Require all denied\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n");
  }
  $pdo = new PDO('sqlite:' . $dir . '/krok.sqlite', null, null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
  $pdo->exec('PRAGMA journal_mode = WAL');
  $pdo->exec('CREATE TABLE IF NOT EXISTS ustawienia (klucz TEXT PRIMARY KEY, wartosc TEXT)');
  $pdo->exec('CREATE TABLE IF NOT EXISTS tokeny (skrot TEXT PRIMARY KEY, wygasa INTEGER, uzyty INTEGER DEFAULT 0)');
  $pdo->exec('CREATE TABLE IF NOT EXISTS proby (ip TEXT, czas INTEGER)');
  $pdo->exec('CREATE TABLE IF NOT EXISTS pacjenci (
    id TEXT PRIMARY KEY, imie TEXT, nazwisko TEXT, nazwisko_norm TEXT, hash TEXT,
    sciezka TEXT, utworzono INTEGER, demo INTEGER DEFAULT 0, start TEXT, kontrola TEXT)');
  return $pdo;
}

function nk_setting(string $k): ?string {
  $st = nk_db()->prepare('SELECT wartosc FROM ustawienia WHERE klucz = ?');
  $st->execute([$k]);
  $v = $st->fetchColumn();
  return $v === false ? null : (string)$v;
}

function nk_set_setting(string $k, string $v): void {
  nk_db()->prepare('INSERT OR REPLACE INTO ustawienia (klucz, wartosc) VALUES (?, ?)')->execute([$k, $v]);
}

function nk_ip(): string { return $_SERVER['REMOTE_ADDR'] ?? '0'; }

function nk_blocked(): bool {
  $db = nk_db();
  $db->prepare('DELETE FROM proby WHERE czas < ?')->execute([time() - NK_FAIL_WINDOW]);
  $st = $db->prepare('SELECT COUNT(*) FROM proby WHERE ip = ?');
  $st->execute([nk_ip()]);
  return (int)$st->fetchColumn() >= NK_MAX_FAILS;
}

function nk_fail(): void {
  nk_db()->prepare('INSERT INTO proby (ip, czas) VALUES (?, ?)')->execute([nk_ip(), time()]);
  usleep(900000);
}

function nk_norm(string $s): string {
  $s = mb_strtolower(trim($s), 'UTF-8');
  return strtr($s, ['ą' => 'a', 'ć' => 'c', 'ę' => 'e', 'ł' => 'l', 'ń' => 'n', 'ó' => 'o', 'ś' => 's', 'ź' => 'z', 'ż' => 'z']);
}

function nk_random_password(int $len = 8): string {
  $alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  $out = '';
  for ($i = 0; $i < $len; $i++) $out .= $alphabet[random_int(0, strlen($alphabet) - 1)];
  return $out;
}

function nk_base_url(): string {
  return (nk_is_https() ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'ncni.pl') . '/krok/';
}

/* Link do ustawienia hasła administratora: wysyłany tylko na kontakt@ncni.pl */
function nk_send_setup_link(): bool {
  $token = bin2hex(random_bytes(24));
  nk_db()->prepare('INSERT INTO tokeny (skrot, wygasa) VALUES (?, ?)')->execute([hash('sha256', $token), time() + 3600]);
  $link = nk_base_url() . '?haslo=' . $token;
  $subject = '=?UTF-8?B?' . base64_encode('NCNI Krok – ustawienie hasła administratora') . '?=';
  $body = "Dzień dobry,\n\nktoś poprosił o ustawienie hasła do aplikacji NCNI Krok dla konta " . NK_ADMIN_EMAIL . ".\n"
    . "Aby ustawić hasło, otwórz link (ważny 1 godzinę, jednorazowy):\n\n$link\n\n"
    . "Jeśli to nie Ty, zignoruj tę wiadomość. Hasło się nie zmieni.\n\nNCNI Krok";
  if (nk_dev()) {
    file_put_contents(nk_data_dir() . '/mail.log', date('c') . "\n" . $body . "\n\n", FILE_APPEND);
    return true;
  }
  $headers = "From: NCNI Krok <" . NK_ADMIN_EMAIL . ">\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit";
  return @mail(NK_ADMIN_EMAIL, $subject, $body, $headers);
}

function nk_use_token(string $token, bool $consume): bool {
  $db = nk_db();
  $st = $db->prepare('SELECT wygasa, uzyty FROM tokeny WHERE skrot = ?');
  $st->execute([hash('sha256', $token)]);
  $row = $st->fetch();
  if (!$row || (int)$row['uzyty'] === 1 || (int)$row['wygasa'] < time()) return false;
  if ($consume) $db->prepare('UPDATE tokeny SET uzyty = 1 WHERE skrot = ?')->execute([hash('sha256', $token)]);
  return true;
}

function nk_security_headers(): void {
  header('X-Robots-Tag: noindex, nofollow');
  header('X-Frame-Options: DENY');
  header('X-Content-Type-Options: nosniff');
  header('Referrer-Policy: no-referrer');
  header('Cache-Control: no-store');
}

function h(?string $s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

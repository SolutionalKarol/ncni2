<?php
/*
 * NCNI Krok – wejście do aplikacji. Bez zalogowania pokazuje tylko ekran logowania.
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';
nk_security_headers();
nk_session();

$err = '';
$info = '';
$mode = 'login';            // login | haslo
$tab = 'pacjent';
$token = (string)($_GET['haslo'] ?? $_POST['token'] ?? '');
$adminReady = nk_setting('admin_hash') !== null;

if (isset($_GET['wyloguj'])) {
  nk_logout();
  header('Location: ./');
  exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $action = (string)($_POST['akcja'] ?? '');

  if ($action === 'personel') {
    $tab = 'personel';
    $email = mb_strtolower(trim((string)($_POST['email'] ?? '')), 'UTF-8');
    $pw = (string)($_POST['haslo'] ?? '');
    $hash = nk_setting('admin_hash');
    if (nk_blocked()) {
      $err = 'Zbyt wiele nieudanych prób. Spróbuj ponownie za 15 minut.';
    } elseif ($hash && hash_equals(NK_ADMIN_EMAIL, $email) && password_verify($pw, $hash)) {
      nk_login(['typ' => 'personel', 'rola' => 'admin', 'imie' => NK_ADMIN_NAME, 'email' => NK_ADMIN_EMAIL]);
      header('Location: ./');
      exit;
    } else {
      nk_fail();
      $err = 'Nieprawidłowy e-mail lub hasło.';
    }
  }

  if ($action === 'pacjent') {
    $tab = 'pacjent';
    $n = nk_norm((string)($_POST['nazwisko'] ?? ''));
    $pw = (string)($_POST['haslo'] ?? '');
    $ok = null;
    if (nk_blocked()) {
      $err = 'Zbyt wiele nieudanych prób. Spróbuj ponownie za 15 minut.';
    } else {
      $st = nk_db()->prepare('SELECT id, imie, nazwisko, hash FROM pacjenci WHERE nazwisko_norm = ?');
      $st->execute([$n]);
      foreach ($st->fetchAll() as $p) {
        if (password_verify($pw, $p['hash'])) { $ok = $p; break; }
      }
      if ($ok) {
        nk_login(['typ' => 'pacjent', 'rola' => 'pacjent', 'id' => $ok['id'], 'imie' => $ok['imie'] . ' ' . $ok['nazwisko']]);
        header('Location: ./');
        exit;
      }
      nk_fail();
      $err = 'Nie znaleziono takiego nazwiska i hasła. Sprawdź pisownię albo zapytaj w przychodni.';
    }
  }

  if ($action === 'link') {
    $tab = 'personel';
    if (nk_blocked()) {
      $err = 'Zbyt wiele prób. Spróbuj ponownie za 15 minut.';
    } else {
      nk_fail(); // każde wysłanie linku liczy się jak próba, żeby nie dało się zasypać skrzynki
      $info = nk_send_setup_link()
        ? 'Wysłaliśmy link do ustawienia hasła na ' . NK_ADMIN_EMAIL . '. Sprawdź skrzynkę (także SPAM). Link działa 1 godzinę.'
        : 'Nie udało się wysłać maila. Spróbuj za chwilę.';
    }
  }

  if ($action === 'ustaw') {
    $mode = 'haslo';
    $p1 = (string)($_POST['haslo1'] ?? '');
    $p2 = (string)($_POST['haslo2'] ?? '');
    if (!nk_use_token($token, false)) {
      $mode = 'login'; $tab = 'personel';
      $err = 'Link wygasł albo został już użyty. Wyślij nowy.';
    } elseif (mb_strlen($p1) < 10) {
      $err = 'Hasło musi mieć co najmniej 10 znaków.';
    } elseif ($p1 !== $p2) {
      $err = 'Hasła różnią się. Wpisz je jeszcze raz.';
    } else {
      nk_use_token($token, true);
      nk_set_setting('admin_hash', password_hash($p1, PASSWORD_DEFAULT));
      nk_login(['typ' => 'personel', 'rola' => 'admin', 'imie' => NK_ADMIN_NAME, 'email' => NK_ADMIN_EMAIL]);
      header('Location: ./');
      exit;
    }
  }
} elseif ($token !== '') {
  if (nk_use_token($token, false)) { $mode = 'haslo'; }
  else { $tab = 'personel'; $err = 'Link wygasł albo został już użyty. Wyślij nowy.'; }
}

$user = nk_user();

/* ---------- zalogowany: aplikacja ---------- */
if ($user && $mode === 'login') {
  $shell = file_get_contents(__DIR__ . '/app.html');
  $boot = '<script>window.NK_USER = ' . json_encode($user, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE) . ';</script>';
  echo str_replace('<!--NK_USER-->', $boot, $shell);
  exit;
}

/* ---------- ekran logowania ---------- */
?><!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>NCNI Krok – logowanie</title>
<meta name="theme-color" content="#0f766e">
<link rel="manifest" href="manifest.json">
<link rel="icon" href="/assets/icon-192.png">
<link rel="apple-touch-icon" href="/assets/icon-180.png">
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
form[hidden]{display:none}
label{display:block;font-weight:500;margin:14px 0 6px}input{width:100%;font:inherit;padding:14px 16px;border:1.5px solid var(--line);border-radius:12px}
input:focus{outline:none;border-color:var(--teal);box-shadow:0 0 0 3px rgba(15,118,110,.15)}
.btn{margin-top:20px;width:100%;font:600 18px Lexend,sans-serif;color:#fff;background:var(--teal);border:0;border-radius:12px;padding:16px;cursor:pointer}
.link{background:none;border:0;color:var(--teal);font:500 15px Inter,sans-serif;margin-top:14px;cursor:pointer;padding:4px 0;text-decoration:underline}
.msg{border-radius:10px;padding:10px 14px;margin-top:14px;font-size:16px}.err{background:#fef2f2;color:var(--err)}.info{background:var(--teal-l);color:#0a5a54}
.data{margin-top:24px;padding-top:16px;border-top:1px solid var(--line);font-size:13px;color:var(--muted);line-height:1.6}
</style>
</head>
<body><main class="card">
  <div class="brand"><img src="/logo.webp" alt="Logo NCNI"><b>Naukowe Centrum<br>Neuroinnowacji sp. z o.o.</b></div>
  <h1>NCNI Krok</h1>

<?php if ($mode === 'haslo'): ?>
  <p class="sub">Ustaw hasło administratora dla konta <?= h(NK_ADMIN_EMAIL) ?>.</p>
  <form method="post" action="./" autocomplete="off">
    <input type="hidden" name="akcja" value="ustaw">
    <input type="hidden" name="token" value="<?= h($token) ?>">
    <label for="h1">Nowe hasło (min. 10 znaków)</label><input id="h1" name="haslo1" type="password" required minlength="10" autocomplete="new-password">
    <label for="h2">Powtórz hasło</label><input id="h2" name="haslo2" type="password" required minlength="10" autocomplete="new-password">
    <?php if ($err): ?><div class="msg err" role="alert"><?= h($err) ?></div><?php endif; ?>
    <button class="btn" type="submit">Zapisz hasło i wejdź</button>
  </form>
<?php else: ?>
  <p class="sub">Edukacja zdrowotna NCNI. Zaloguj się, aby kontynuować.</p>
  <div class="tabs" role="tablist">
    <button type="button" data-t="pacjent" class="<?= $tab === 'pacjent' ? 'on' : '' ?>">Pacjent</button>
    <button type="button" data-t="personel" class="<?= $tab === 'personel' ? 'on' : '' ?>">Personel</button>
  </div>

  <form method="post" action="./" data-f="pacjent" <?= $tab === 'pacjent' ? '' : 'hidden' ?> autocomplete="off">
    <input type="hidden" name="akcja" value="pacjent">
    <label for="pn">Nazwisko</label><input id="pn" name="nazwisko" type="text" required autocapitalize="words">
    <label for="pp">Hasło</label><input id="pp" name="haslo" type="password" required>
    <?php if ($err && $tab === 'pacjent'): ?><div class="msg err" role="alert"><?= h($err) ?></div><?php endif; ?>
    <button class="btn" type="submit">Zaloguj się</button>
  </form>

  <div data-f="personel" <?= $tab === 'personel' ? '' : 'hidden' ?>>
  <?php if ($adminReady): ?>
    <form method="post" action="./">
      <input type="hidden" name="akcja" value="personel">
      <label for="e">E-mail</label><input id="e" name="email" type="email" required autocomplete="username">
      <label for="p">Hasło</label><input id="p" name="haslo" type="password" required autocomplete="current-password">
      <?php if ($err && $tab === 'personel'): ?><div class="msg err" role="alert"><?= h($err) ?></div><?php endif; ?>
      <?php if ($info): ?><div class="msg info"><?= h($info) ?></div><?php endif; ?>
      <button class="btn" type="submit">Zaloguj się</button>
    </form>
    <form method="post" action="./"><input type="hidden" name="akcja" value="link"><button class="link" type="submit">Nie pamiętam hasła</button></form>
  <?php else: ?>
    <div class="msg info">Pierwsze uruchomienie: wyślemy link do ustawienia hasła administratora na <b><?= h(NK_ADMIN_EMAIL) ?></b>.</div>
    <?php if ($err && $tab === 'personel'): ?><div class="msg err" role="alert"><?= h($err) ?></div><?php endif; ?>
    <?php if ($info): ?><div class="msg info"><?= h($info) ?></div><?php endif; ?>
    <form method="post" action="./"><input type="hidden" name="akcja" value="link"><button class="btn" type="submit">Wyślij link na <?= h(NK_ADMIN_EMAIL) ?></button></form>
  <?php endif; ?>
  </div>
<?php endif; ?>

  <div class="data">Naukowe Centrum Neuroinnowacji sp. z o.o.<br>ul. Stefana Żeromskiego 60/5A, 50-312 Wrocław<br>tel. 600 608 333 · kontakt@ncni.pl</div>
</main>
<script>
document.querySelectorAll('.tabs button').forEach(function (b) {
  b.addEventListener('click', function () {
    document.querySelectorAll('.tabs button').forEach(function (x) { x.classList.toggle('on', x === b); });
    document.querySelectorAll('[data-f]').forEach(function (f) { f.hidden = f.getAttribute('data-f') !== b.getAttribute('data-t'); });
  });
});
</script>
</body>
</html>

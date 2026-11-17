'use strict';
// Formularz kontaktowy ncni.pl -> Formspree. Adres formularza jest tylko w atrybucie action w index.html.
(function () {
 const form = document.querySelector('#ncni-contact-form');
 if (!form) return;
 const msg = {
  sending: 'Wysyłanie wiadomości…',
  success: 'Dziękujemy za wiadomość. Skontaktujemy się z Tobą, żeby ustalić szczegóły.',
  limit: 'Za dużo prób wysłania. Spróbuj później lub napisz na kontakt@ncni.pl.',
  error: 'Nie udało się wysłać wiadomości. Sprawdź wpisane dane lub napisz na kontakt@ncni.pl.',
  network: 'Nie udało się potwierdzić wysłania. Nie wysyłaj ponownie od razu. Możesz napisać na kontakt@ncni.pl lub zadzwonić: 600 608 333.'
 };
 form.addEventListener('submit', async function (event) {
  event.preventDefault();
  const status = form.querySelector('[role=status]');
  const button = form.querySelector('button[type=submit]');
  if (button.disabled) return;
  button.disabled = true;
  status.textContent = msg.sending;
  const controller = new AbortController();
  const timeout = setTimeout(function () { controller.abort(); }, 20000);
  try {
   const response = await fetch(form.action, {
    method: 'POST', body: new FormData(form),
    headers: { Accept: 'application/json' }, signal: controller.signal
   });
   const result = await response.json().catch(function () { return {}; });
   if (!response.ok || result.ok !== true) {
    status.textContent = response.status === 429 ? msg.limit : msg.error;
    return;
   }
   status.textContent = msg.success;
   form.reset();
   if (typeof window.gtag === 'function') window.gtag('event', 'generate_lead', { form: 'kontakt_ncni' });
  } catch (e) {
   status.textContent = msg.network;
  } finally {
   clearTimeout(timeout);
   button.disabled = false;
  }
 });
})();

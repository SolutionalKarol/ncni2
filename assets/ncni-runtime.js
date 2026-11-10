/* Shared navigation and lightweight decorative background. */
(function () {
  'use strict';
  window.ncniBackground = function () {
    var host = document.getElementById('bg-canvas');
    if (!host || host.dataset.ready) return;
    host.dataset.ready = 'true';
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    var mobile = window.matchMedia('(max-width: 900px)');
    if (reduced.matches || mobile.matches || (navigator.connection && navigator.connection.saveData)) return;
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    host.appendChild(canvas);
    var width, height, frame = 0, last = 0;
    var dots = Array.from({length: 65}, function () {
      return {x: Math.random(), y: Math.random(), r: 1 + Math.random() * 2};
    });
    function resize() {
      width = window.innerWidth; height = window.innerHeight;
      var ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = width * ratio; canvas.height = height * ratio;
      canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    function draw(time) {
      if (time - last > 45) {
        ctx.clearRect(0, 0, width, height);
        dots.forEach(function (dot, i) {
          ctx.beginPath();
          ctx.fillStyle = i % 2 ? 'rgba(99,102,241,.30)' : 'rgba(15,118,110,.30)';
          ctx.arc(dot.x * width + Math.sin(time / 7000 + i) * 10, dot.y * height + Math.cos(time / 8000 + i) * 8, dot.r, 0, Math.PI * 2);
          ctx.fill();
        });
        last = time;
      }
      frame = requestAnimationFrame(draw);
    }
    function sync() {
      cancelAnimationFrame(frame);
      if (!document.hidden && !reduced.matches && !mobile.matches) frame = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, width, height);
    }
    resize(); sync();
    window.addEventListener('resize', function () { resize(); sync(); }, {passive: true});
    document.addEventListener('visibilitychange', sync);
    [reduced, mobile].forEach(function (query) {
      if (query.addEventListener) (query.addEventListener ? query.addEventListener.bind(query, "change") : query.addListener.bind(query))( sync);
      else query.addListener(sync);
    });
  };
  function init() {
    window.ncniBackground();
    var toggle = document.querySelector('.mobile-toggle');
    var menu = document.querySelector('.mobile-menu');
    if (!toggle || !menu) return;
    menu.id = menu.id || 'ncni-mobile-menu';
    toggle.setAttribute('aria-controls', menu.id);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Otwórz menu');
    var query = window.matchMedia('(max-width: 900px)');
    function setOpen(open, focus) {
      menu.classList.toggle('active', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
      menu.setAttribute('aria-hidden', String(!open));
      menu.inert = !open;
      if (focus) toggle.focus();
    }
    function position() {
      var header = document.querySelector('header');
      if (header) {
        var bottom = header.getBoundingClientRect().bottom;
        menu.style.top = bottom + 'px';
        menu.style.setProperty('--ncni-menu-top', bottom + 'px');
      }
    }
    setOpen(false);
    // Capture overrides older per-page handlers without duplicating their toggles.
    toggle.addEventListener('click', function (event) {
      event.stopImmediatePropagation(); position();
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    }, true);
    menu.addEventListener('click', function (event) {
      if (event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && menu.classList.contains('active')) setOpen(false, true);
    });
    document.addEventListener('click', function (event) {
      if (!menu.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
    });
    window.addEventListener('resize', function () {
      position(); if (!query.matches) setOpen(false);
    }, {passive: true});
    window.addEventListener('scroll', position, {passive: true});
    window.addEventListener('pageshow', function (event) { if (event.persisted) setOpen(false); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* Contact intent is counted only after consent for Google Analytics (CMP vendor s26). */
(function () {
  'use strict';
  var measurementId = 'G-56VR40VHHV';
  if (!/^(www\.)?ncni\.pl$/.test(window.location.hostname)) return;
  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || (typeof event.button === 'number' && event.button !== 0)) return;
    var link = event.target.closest && event.target.closest('a[href]');
    if (!link || typeof window.gtag !== 'function' || typeof window.__cmp !== 'function') return;
    var href = link.getAttribute('href') || '';
    var name = /^tel:/i.test(href) ? 'contact_phone_click' : /^mailto:/i.test(href) ? 'contact_email_click' : null;
    if (!name) return;
    var data;
    try { data = window.__cmp('getCMPData'); } catch (error) { return; }
    var accepted = data && data.vendorConsents && data.vendorConsents.s26;
    if (accepted !== true && accepted !== 1) return;
    // No phone number, email address, message subject or link label is sent.
    window.gtag('event', name, {
      send_to: measurementId,
      page_location: window.location.origin + window.location.pathname,
      page_referrer: document.referrer.split(/[?#]/)[0]
    });
  });
})();

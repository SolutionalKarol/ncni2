document.querySelectorAll('.ncni-video[data-video]').forEach(figure => {
    const button = figure.querySelector('.ncni-video-play');
    const stage = figure.querySelector('.ncni-video-stage');
    const source = figure.dataset.video;
    if (!['kosmos.mp4', 'google.ara.mp4', 'treningADHD.mp4'].includes(source)) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer, iframe, stop, inView = false, dismissed = false, automatic = false;
    function reset(focus = false) {
        clearTimeout(timer);
        iframe?.pause();
        iframe?.remove();
        iframe = null;
        stop?.remove();
        stage.append(button);
        if (focus) button.focus({preventScroll: true});
    }
    function play(auto = false) {
        clearTimeout(timer);
        if (iframe) return;
        automatic = auto;
        iframe = document.createElement('video');
        iframe.src = source;
        iframe.controls = true;
        iframe.playsInline = true;
        iframe.muted = auto;
        iframe.loop = auto;
        iframe.setAttribute('aria-label', button.getAttribute('aria-label').replace('Odtwórz: ', ''));
        iframe.addEventListener('error', () => { dismissed = true; reset(); }, {once: true});
        button.replaceWith(iframe);
        iframe.play().catch(() => { /* Native controls allow manual playback. */ });
        stop = document.createElement('button');
        stop.type = 'button';
        stop.className = 'ncni-video-stop';
        stop.textContent = 'Zatrzymaj i wróć do miniatury';
        stop.addEventListener('click', () => { dismissed = true; reset(true); });
        figure.querySelector('figcaption').append(stop);
        if (!auto) iframe.focus();
    }
    button.addEventListener('click', () => play());
    if (!figure.dataset.autoPreview || !window.IntersectionObserver) return;
    function schedule() {
        clearTimeout(timer);
        if (!inView || dismissed || iframe || reducedMotion.matches || navigator.connection?.saveData || document.hidden) return;
        timer = setTimeout(() => { if (inView && !document.hidden) play(true); }, Number(figure.dataset.autoPreview));
    }
    const observer = new IntersectionObserver(entries => {
        inView = entries[0].isIntersecting;
        if (inView) schedule();
        else { clearTimeout(timer); if (automatic && iframe) reset(); }
    }, {threshold: .5});
    observer.observe(figure);
    reducedMotion.addEventListener('change', () => {
        if (reducedMotion.matches) { clearTimeout(timer); if (automatic && iframe) reset(); }
        else schedule();
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { clearTimeout(timer); if (automatic && iframe) reset(); }
        else schedule();
    });
});

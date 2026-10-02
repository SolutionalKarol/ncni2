document.querySelectorAll('[data-concept-panel]').forEach(panel => {
    const scenes = {
        mindfulness: ['assets/adhd-preview.jpg', 'Scenariusz: uważność', 'Koncepcja podglądu scenariusza uważności przy ognisku'],
        cosmos: ['assets/kosmos-preview.jpg', 'Scenariusz: kosmos', 'Koncepcja podglądu scenariusza kosmicznego'],
        exposure: ['assets/arachnofobia-preview.jpg', 'Scenariusz: ekspozycja', 'Koncepcja podglądu scenariusza oswajania lęku']
    };
    panel.querySelectorAll('[data-scene]').forEach(button => {
        button.addEventListener('click', () => {
            const scene = scenes[button.dataset.scene];
            if (!scene) return;
            panel.querySelectorAll('[data-scene]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
            const image = panel.querySelector('[data-scene-image]');
            image.src = scene[0]; image.alt = scene[2];
            panel.querySelector('[data-scene-label]').textContent = scene[1];
        });
    });
    const toggle = panel.querySelector('[data-concept-motion]');
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
        const paused = panel.classList.toggle('is-paused');
        toggle.setAttribute('aria-pressed', String(paused));
        toggle.textContent = paused ? 'Wznów animację' : 'Wstrzymaj animację';
    });
    if (window.IntersectionObserver) new IntersectionObserver(entries => {
        panel.classList.toggle('is-offscreen', !entries[0].isIntersecting);
    }).observe(panel);
});

(() => {
 const figure = document.querySelector('[data-dys-film]');
 if (!figure) return;
 const button = figure.querySelector('button');
 const stage = figure.querySelector('.dys-film-stage');
 const poster = stage.querySelector('img');
 const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
 let video, timer, visible = false, started = false;
 function play() {
  clearTimeout(timer);
  if (video) {video.play().catch(() => {}); return;}
  started = true;
  video = document.createElement('video');
  video.src = 'dyskalkulia.mp4';
  video.poster = 'assets/dyskalkulia-vr-start.webp';
  video.controls = true;
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.loop = false;
  video.preload = 'none';
  video.setAttribute('aria-label', 'Dyskalkulia: poglądowa prezentacja koncepcji ćwiczeń VR');
  video.addEventListener('loadeddata', () => {poster.hidden = true; button.hidden = true;});
  video.addEventListener('error', () => {
   video.remove(); video = null; poster.hidden = false; button.hidden = false;
   button.textContent = 'Spróbuj ponownie odtworzyć film';
  });
  stage.append(video);
  video.play().catch(() => {button.hidden = false;});
 }
 function schedule() {
  clearTimeout(timer);
  if (visible && !started && !reduced.matches && !navigator.connection?.saveData && !document.hidden) timer = setTimeout(play, 2000);
 }
 button.addEventListener('click', play);
 if (window.IntersectionObserver) {
  new IntersectionObserver(entries => {
   visible = entries[0].isIntersecting;
   if (visible) schedule();
   else {clearTimeout(timer); video?.pause();}
  }, {threshold: .5}).observe(stage);
 }
 document.addEventListener('visibilitychange', () => {
  if (document.hidden) {clearTimeout(timer); video?.pause();} else schedule();
 });
 (reduced.addEventListener ? reduced.addEventListener.bind(reduced, "change") : reduced.addListener.bind(reduced))( schedule);
})();
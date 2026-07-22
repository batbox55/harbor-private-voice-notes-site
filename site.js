(() => {
  if (location.hash) {
    document.documentElement.classList.add('no-smooth');
    addEventListener('load', () => {
      document.querySelector(location.hash)?.scrollIntoView();
      requestAnimationFrame(() => document.documentElement.classList.remove('no-smooth'));
    }, { once: true });
  }

  const story = document.querySelector('.scroll-story');
  const stage = document.querySelector('.story-stage');
  const scenes = [...document.querySelectorAll('.scene')];
  const transitionVideos = [...document.querySelectorAll('.scene-video')];
  const panels = [...document.querySelectorAll('.story-panel')];
  const markers = [...document.querySelectorAll('.story-progress span')];
  const cue = document.querySelector('.scroll-cue');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!story || !stage || scenes.length === 0 || reduceMotion) return;

  let ticking = false;
  let currentIndex = 0;

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

  function render() {
    const rect = story.getBoundingClientRect();
    const travel = Math.max(1, story.offsetHeight - window.innerHeight);
    const progress = clamp(-rect.top / travel, 0, 1);
    const exact = progress * (scenes.length - 1);
    const index = Math.min(scenes.length - 1, Math.floor(exact + .5));
    const videosAreEnabled = transitionVideos.length > 0 && window.innerWidth > 900;
    const blend = .06;
    const videoOpacities = transitionVideos.map((_, i) => {
      if (!videosAreEnabled || exact < i - blend || exact > i + 1 + blend) return 0;
      const isFinalVideo = i === transitionVideos.length - 1;
      if (isFinalVideo && exact > i + 1 - blend * 2) {
        return clamp(((i + 1) - exact) / (blend * 2), 0, 1);
      }
      if (i > 0 && exact < i + blend) {
        return clamp((exact - (i - blend)) / (blend * 2), 0, 1);
      }
      if (exact > i + 1 - blend) {
        return clamp(((i + 1 + blend) - exact) / (blend * 2), 0, 1);
      }
      return 1;
    });
    const totalVideoOpacity = clamp(videoOpacities.reduce((sum, opacity) => sum + opacity, 0), 0, 1);
    const videoIsActive = totalVideoOpacity > 0;

    transitionVideos.forEach((video, i) => {
      const opacity = videoOpacities[i];
      const isActive = opacity > 0;
      video.style.opacity = String(opacity);
      if (isActive && video.readyState >= 1) {
        const segmentProgress = clamp(exact - i, 0, 1);
        const targetTime = segmentProgress * Math.max(0, video.duration - .04);
        if (Math.abs(video.currentTime - targetTime) > 1 / 48) {
          video.currentTime = targetTime;
        }
      }
    });

    scenes.forEach((scene, i) => {
      const distance = Math.abs(exact - i);
      const imageOpacity = clamp(1 - distance, 0, 1) * (1 - totalVideoOpacity);
      scene.style.opacity = String(imageOpacity);
      scene.style.transform = `scale(${1.045 - progress * .025}) translate3d(${(i - exact) * 1.35}%,0,0)`;
      scene.classList.toggle('is-active', i === index);
    });

    panels.forEach((panel, i) => {
      const offset = (i - exact) * 28;
      panel.style.opacity = i === index ? '1' : '0';
      panel.style.transform = window.innerWidth <= 900
        ? `translateY(${offset}px)`
        : `translateY(calc(-50% + ${offset}px))`;
      panel.style.pointerEvents = i === index ? 'auto' : 'none';
      panel.classList.toggle('is-active', i === index);
    });

    if (index !== currentIndex) {
      markers.forEach((marker, i) => marker.classList.toggle('is-active', i === index));
      currentIndex = index;
    }
    cue.style.opacity = String(clamp(1 - progress * 8, 0, 1));
    ticking = false;
  }

  function requestRender() {
    if (!ticking) { ticking = true; requestAnimationFrame(render); }
  }

  addEventListener('scroll', requestRender, { passive: true });
  addEventListener('resize', requestRender);
  transitionVideos.forEach(video => {
    video.addEventListener('loadedmetadata', requestRender, { once: true });
  });
  render();
})();

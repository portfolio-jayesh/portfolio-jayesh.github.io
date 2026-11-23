(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const themeKey = 'portfolio-theme';
  const icons = {
    moon: '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    'arrow-up-right': '<path d="M7 7h10v10M7 17 17 7"/>'
  };

  function icon(name) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-${name}" aria-hidden="true">${icons[name]}</svg>`;
  }

  function updateIcon(button, name) {
    for (const layer of button.querySelectorAll('.wave-icon-track > span')) {
      layer.innerHTML = icon(name);
    }
  }

  function savedTheme() {
    try {
      return localStorage.getItem(themeKey) ?? localStorage.getItem('jayesh-portfolio-theme');
    } catch {
      return root.dataset.theme;
    }
  }

  const themeToggle = document.querySelector('.theme-toggle');
  function setTheme(theme) {
    const dark = theme === 'dark';
    root.dataset.theme = dark ? 'dark' : 'light';
    if (themeToggle) {
      themeToggle.setAttribute('aria-pressed', String(dark));
      updateIcon(themeToggle, dark ? 'sun' : 'moon');
    }
  }

  setTheme(savedTheme());
  themeToggle?.addEventListener('click', () => {
    const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(theme);
    try {
      localStorage.setItem(themeKey, theme);
    } catch {
      // The current document can still switch themes without storage.
    }
    window.dispatchEvent(new Event(themeKey));
  });
  window.addEventListener('storage', event => {
    if (event.key === themeKey || event.key === null) setTheme(savedTheme());
  });

  function sectionFromLink(href) {
    const url = new URL(href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return null;
    try {
      return document.getElementById(decodeURIComponent(url.hash.slice(1)));
    } catch {
      return null;
    }
  }

  function sectionAnchor(section) {
    return section.matches('section') ? section.querySelector('[data-scroll-anchor]') ?? section : section;
  }

  let scrollFrame = 0;
  let finishScroll;

  function cancelScroll() {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    finishScroll = undefined;
  }

  function scrollToAnchor(anchor, { block = 'start', immediate = false } = {}) {
    cancelScroll();
    const viewport = document.scrollingElement;
    if (immediate || reducedMotion.matches || !viewport) {
      anchor.scrollIntoView({ behavior: 'instant', block });
      return;
    }

    const origin = scrollY;
    const bounds = anchor.getBoundingClientRect();
    const padding = getComputedStyle(viewport);
    const margin = getComputedStyle(anchor);
    const start = bounds.top - (parseFloat(padding.scrollPaddingTop) || 0) - (parseFloat(margin.scrollMarginTop) || 0);
    let offset = start;
    if (block === 'nearest') {
      const end = bounds.bottom - viewport.clientHeight + (parseFloat(padding.scrollPaddingBottom) || 0) + (parseFloat(margin.scrollMarginBottom) || 0);
      // Leave the viewport in place if the anchor fits in it or already spans it.
      if (start * end <= 0) return;
      offset = Math.abs(start) <= Math.abs(end) ? start : end;
    }

    const destination = Math.min(Math.max(0, viewport.scrollHeight - viewport.clientHeight), Math.max(0, origin + offset));
    const distance = destination - origin;
    if (!distance) return;
    const duration = Math.min(1350, 220 + 16 * Math.sqrt(Math.abs(distance)));
    const startedAt = performance.now();

    function finish() {
      cancelScroll();
      window.scrollTo({ top: destination, behavior: 'instant' });
    }

    function step(now) {
      const progress = Math.max(0, (now - startedAt) / duration);
      if (progress >= 1) {
        finish();
        return;
      }
      // Speed peaks a third of the way through and eases to zero at arrival.
      const position = 1 - (1 + 3 * progress) * (1 - progress) ** 3;
      window.scrollTo({ top: origin + distance * position, behavior: 'instant' });
      scrollFrame = requestAnimationFrame(step);
    }

    finishScroll = finish;
    scrollFrame = requestAnimationFrame(step);
  }

  window.scrollPortfolioAnchor = scrollToAnchor;
  for (const event of ['wheel', 'pointerdown']) {
    window.addEventListener(event, cancelScroll, { capture: true, passive: true });
  }
  const scrollKeys = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Tab']);
  window.addEventListener('keydown', event => {
    if (scrollKeys.has(event.key)) cancelScroll();
  }, { capture: true });
  window.addEventListener('pagehide', cancelScroll);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) finishScroll?.();
  });

  function slideToSection(section, immediate = false) {
    if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
    if (section.id === 'about') window.dispatchEvent(new Event('portfolio:hero-return'));
    scrollToAnchor(sectionAnchor(section), { immediate });
  }

  function focusSection(section) {
    const anchor = sectionAnchor(section);
    const destination = anchor === section ? section : anchor.querySelector('h2') ?? anchor;
    if (!destination.hasAttribute('tabindex')) {
      destination.tabIndex = -1;
      destination.addEventListener('blur', () => destination.removeAttribute('tabindex'), { once: true });
    }
    destination.focus({ preventScroll: true });
  }

  function scrollToSection(href, immediate = false) {
    const section = sectionFromLink(href);
    if (!section) return false;
    slideToSection(section, immediate);
    focusSection(section);
    return true;
  }

  function onlyPrimaryClick(event) {
    return event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;
  }

  const collaborationUrl = new URL('research/', document.currentScript.src);
  let collaborationPrefetched = false;
  let collaborationPendingTimer;

  function isCollaborationLink(link) {
    return link.origin === collaborationUrl.origin && link.pathname === collaborationUrl.pathname &&
      location.pathname !== collaborationUrl.pathname;
  }

  function prefetchCollaboration() {
    if (collaborationPrefetched || reducedMotion.matches || navigator.connection?.saveData) return;
    const prefetch = document.createElement('link');
    prefetch.rel = 'prefetch';
    prefetch.href = collaborationUrl.href;
    document.head.append(prefetch);
    collaborationPrefetched = true;
  }

  function clearCollaborationPending() {
    clearTimeout(collaborationPendingTimer);
    root.removeAttribute('data-collaboration-pending');
  }

  function showCollaborationPending() {
    if (reducedMotion.matches) return;
    clearTimeout(collaborationPendingTimer);
    root.setAttribute('data-collaboration-pending', '');
    collaborationPendingTimer = setTimeout(clearCollaborationPending, 10000);
  }

  window.addEventListener('pageshow', event => {
    if (event.persisted) clearCollaborationPending();
  });

  document.addEventListener('click', event => {
    if (event.defaultPrevented || !onlyPrimaryClick(event)) return;
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    if (scrollToSection(link.href)) event.preventDefault();
    else if (isCollaborationLink(link)) showCollaborationPending();
  });
  window.addEventListener('hashchange', () => scrollToSection(location.href, true));
  if (location.hash) scrollToSection(location.href, true);

  const trigger = document.querySelector('.nav-menu-trigger');
  const dialog = document.getElementById('navigation-panel');

  if (trigger && dialog) {
    const panel = dialog.querySelector('.nav-panel');
    const closeButton = dialog.querySelector('.nav-panel-close');
    const closeIcon = closeButton?.querySelector('.nav-close-circle');
    const menuLinks = [...dialog.querySelectorAll('.nav-panel-links a[href]')];
    const sectionIds = ['about', 'skills', 'projects', 'experience', 'contact'];
    const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);
    const progress = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const link of menuLinks) {
          const matchesSection = link.hash === `#${entry.target.id}` && link.pathname === location.pathname;
          if (matchesSection) link.setAttribute('aria-current', 'location');
          else if (link.getAttribute('aria-current') === 'location') link.removeAttribute('aria-current');
        }
      }
    }, { rootMargin: '-15% 0px -65% 0px' });
    sections.forEach(section => progress.observe(section));

    for (const text of dialog.querySelectorAll('.nav-menu-text')) {
      const accessible = text.querySelector('.sr-only');
      const visual = text.querySelector('[aria-hidden="true"]');
      if (!accessible || !visual) continue;
      visual.replaceChildren(...Array.from(accessible.textContent.trim(), character => {
        const piece = document.createElement('span');
        piece.className = 'nav-menu-piece';
        piece.textContent = character === ' ' ? '\u00a0' : character;
        return piece;
      }));
    }

    let previousOverflow = '';
    let afterClose;
    let slideFrame;
    const menuAnimations = [];
    const AudioEngine = window.AudioContext ?? window.webkitAudioContext;
    const menuSoundUrl = new URL('assets/menu-ball-drop.wav', document.currentScript.src);
    let menuAudio;
    let menuClip;
    let menuSound;

    async function prepareMenuSound() {
      if (!AudioEngine || reducedMotion.matches) return;
      try {
        menuAudio ??= new AudioEngine();
        const ready = menuAudio.state === 'running' ? undefined : menuAudio.resume();
        menuClip ??= fetch(menuSoundUrl).then(response => {
          if (!response.ok) throw new Error('Could not load the menu sound');
          return response.arrayBuffer();
        }).then(bytes => menuAudio.decodeAudioData(bytes)).catch(() => {
          menuClip = undefined;
        });
        const [, clip] = await Promise.all([ready, menuClip]);
        return clip;
      } catch {
        // The menu remains usable if audio is blocked or unavailable.
      }
    }

    async function playMenuSound(animation) {
      try {
        const [clip] = await Promise.all([prepareMenuSound(), animation.ready]);
        if (!clip || menuAudio.state !== 'running' || !dialog.open || animation.playState !== 'running' || document.hidden || reducedMotion.matches) return;
        const offset = Math.max(0, animation.currentTime / 1000);
        // The cue starts after 340 ms of silence. Skip playback if loading missed the start.
        if (offset >= 0.34) return;
        const source = menuAudio.createBufferSource();
        source.buffer = clip;
        source.connect(menuAudio.destination);
        source.addEventListener('ended', () => {
          source.disconnect();
          if (menuSound === source) menuSound = undefined;
        }, { once: true });
        source.start(0, offset);
        menuSound = source;
      } catch {
        // Audio cannot delay or prevent the close animation.
      }
    }

    function stopMenuSound() {
      menuSound?.stop();
      menuSound = undefined;
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopMenuSound();
    });
    window.addEventListener('pagehide', stopMenuSound);

    function closeMenu(onClosed, beforeClose) {
      if (!dialog.open || dialog.dataset.motion === 'closing') return;
      const iconTransform = closeIcon && !reducedMotion.matches ? getComputedStyle(closeIcon).transform : 'none';
      afterClose = onClosed;
      dialog.dataset.motion = 'closing';
      if (reducedMotion.matches) {
        dialog.close();
        return;
      }

      const bounds = dialog.getBoundingClientRect();
      const buttonBounds = trigger.getBoundingClientRect();
      const pieces = [...dialog.querySelectorAll('.nav-menu-piece')];
      const distances = pieces.map(piece => bounds.bottom - piece.getBoundingClientRect().top + 80);
      const dropDelay = 220;
      const stagger = 180 / Math.max(1, pieces.length - 1);
      pieces.forEach((piece, index) => {
        const distance = distances[index];
        const sideways = (index * 29) % 83 - 41;
        const angle = (index * 37) % 97 - 48;
        const position = ((index * 37) % pieces.length) * stagger;
        const startTransform = piece === closeIcon ? iconTransform : 'none';
        menuAnimations.push(piece.animate([
          { transform: startTransform },
          { transform: `translate(${sideways}px, ${distance}px) rotate(${angle}deg)` }
        ], { delay: dropDelay + position, duration: 700, fill: startTransform === 'none' ? 'forwards' : 'both', easing: 'cubic-bezier(.55,.055,.675,.19)' }));
        menuAnimations.push(piece.animate({ opacity: [1, 0] }, {
          delay: 760 + index * stagger, duration: 160, fill: 'forwards', easing: 'ease-in'
        }));
      });

      const x = buttonBounds.right - bounds.right;
      const y = buttonBounds.top - bounds.top;
      const scaleX = buttonBounds.width / bounds.width;
      const scaleY = buttonBounds.height / bounds.height;
      const shrinkTiming = { delay: 1220, duration: 460, fill: 'forwards', easing: 'cubic-bezier(.645,.045,.355,1)' };
      const shrink = dialog.animate([
        { transform: 'none', transformOrigin: 'top right', opacity: 1 },
        { transform: `translate(${x}px, ${y}px) scale(${scaleX}, ${scaleY})`, transformOrigin: 'top right', opacity: 0 }
      ], shrinkTiming);
      menuAnimations.push(shrink);
      playMenuSound(shrink);
      const animatesBackdrop = 'pseudoElement' in KeyframeEffect.prototype;
      if (animatesBackdrop) {
        // Ease out the live blur before the falling letters start moving.
        dialog.dataset.releaseBackdrop = '';
        menuAnimations.push(dialog.animate({ backdropFilter: ['blur(5px)', 'none'] }, {
          duration: dropDelay, fill: 'backwards', easing: 'ease-out', pseudoElement: '::backdrop'
        }));
        menuAnimations.push(dialog.animate({ opacity: [1, 0] }, { ...shrinkTiming, pseudoElement: '::backdrop' }));
      }
      if (beforeClose && animatesBackdrop) {
        const slideAt = shrinkTiming.delay + shrinkTiming.duration - 160;
        function followClose() {
          if (!dialog.open || shrink.playState !== 'running' || reducedMotion.matches) return;
          if (shrink.currentTime >= slideAt) beforeClose();
          else slideFrame = requestAnimationFrame(followClose);
        }
        slideFrame = requestAnimationFrame(followClose);
      }
      shrink.finished.then(() => dialog.close(), () => {});
    }

    trigger.addEventListener('click', () => {
      if (dialog.open || dialog.dataset.motion === 'closing') return;
      cancelScroll();
      prepareMenuSound();
      previousOverflow = document.body.style.overflow;
      dialog.dataset.motion = 'open';
      dialog.showModal();
      trigger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      panel?.scrollTo(0, 0);
    });
    closeButton?.addEventListener('click', () => closeMenu());
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      closeMenu();
    });
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches && dialog.dataset.motion === 'closing') dialog.close();
    });
    dialog.addEventListener('close', () => {
      stopMenuSound();
      cancelAnimationFrame(slideFrame);
      for (const animation of menuAnimations) animation.cancel();
      menuAnimations.length = 0;
      delete dialog.dataset.motion;
      delete dialog.dataset.releaseBackdrop;
      trigger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = previousOverflow;
      trigger.focus({ preventScroll: true });
      const action = afterClose;
      afterClose = undefined;
      action?.();
    });
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const focusable = [...dialog.querySelectorAll('a[href],button:not([disabled])')];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    });
    dialog.addEventListener('click', event => {
      if (event.target === dialog) {
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeMenu();
        return;
      }
      const link = event.target.closest('a[href]');
      if (!link || !onlyPrimaryClick(event) || (link.target && link.target !== '_self')) return;
      if (link.hasAttribute('download')) {
        closeMenu();
        return;
      }
      event.preventDefault();
      const section = sectionFromLink(link.href);
      const opensCollaboration = isCollaborationLink(link);
      if (opensCollaboration) prefetchCollaboration();

      let slideStartedFrom;
      const startProjectsSlide = section?.id === 'projects' ? () => {
        slideStartedFrom = scrollY;
        section.dispatchEvent(new Event('portfolio:section-navigation', { bubbles: true }));
        slideToSection(section);
      } : undefined;

      closeMenu(() => {
        if (section) {
          // Some browsers wait for the modal to close before allowing page scroll.
          if (slideStartedFrom === undefined || (scrollFrame && scrollY === slideStartedFrom) || reducedMotion.matches) slideToSection(section);
          focusSection(section);
          return;
        }
        if (opensCollaboration) showCollaborationPending();
        location.assign(link.href);
      }, startProjectsSlide);
    });
  }

  const wordmark = document.querySelector('.wordmark');
  const wordmarkText = wordmark?.querySelector('.wordmark-text');
  if (wordmarkText) {
    let spin;
    let idleTimer;
    let hovering = false;

    function rotate() {
      if (spin || reducedMotion.matches || document.hidden) return;
      spin = wordmarkText.animate([
        { transform: 'rotate(0deg)', easing: 'linear' },
        { transform: 'rotate(126deg)', offset: .21, easing: 'cubic-bezier(.33,.66,.66,1)' },
        { transform: 'rotate(360deg)' }
      ], { duration: 566 });
      wordmarkText.dataset.spinning = 'true';
      spin.onfinish = () => {
        spin = undefined;
        wordmarkText.dataset.spinning = 'false';
      };
    }

    function scheduleIdle() {
      clearInterval(idleTimer);
      if (reducedMotion.matches || document.hidden) {
        hovering = false;
        spin?.cancel();
        spin = undefined;
        wordmarkText.dataset.spinning = 'false';
      } else if (!hovering && document.activeElement !== wordmark) {
        idleTimer = setInterval(() => {
          if (!spin) rotate();
        }, 3000);
      }
    }

    wordmark.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch') return;
      hovering = true;
      clearInterval(idleTimer);
      rotate();
    });
    wordmark.addEventListener('pointerleave', () => {
      hovering = false;
      scheduleIdle();
    });
    wordmark.addEventListener('focus', () => {
      clearInterval(idleTimer);
      if (!hovering && wordmark.matches(':focus-visible')) rotate();
    });
    wordmark.addEventListener('blur', scheduleIdle);
    reducedMotion.addEventListener('change', scheduleIdle);
    document.addEventListener('visibilitychange', scheduleIdle);
    scheduleIdle();
  }

  const contact = document.getElementById('contact');
  const emailLink = contact?.querySelector('.email-link');
  const copyButton = contact?.querySelector('.copy-email');
  const copyStatus = contact?.querySelector('.copy-status');
  if (emailLink && copyButton && copyStatus) {
    let resetCopy;
    copyButton.addEventListener('click', async () => {
      const email = emailLink.getAttribute('href').slice('mailto:'.length);
      try {
        await navigator.clipboard.writeText(email);
        copyStatus.textContent = 'Email copied';
        copyButton.setAttribute('aria-label', 'Email copied');
        updateIcon(copyButton, 'check');
      } catch {
        copyStatus.textContent = 'Please use the email link';
      }
      clearTimeout(resetCopy);
      resetCopy = setTimeout(() => {
        copyStatus.textContent = '';
        copyButton.setAttribute('aria-label', 'Copy email address');
        updateIcon(copyButton, 'copy');
      }, 3000);
    });
  }

  const contactForm = contact?.querySelector('.contact-form');
  if (contactForm) {
    const draftReady = document.createElement('div');
    draftReady.className = 'draft-ready';
    draftReady.setAttribute('role', 'status');
    draftReady.hidden = true;
    draftReady.innerHTML = `<p>Your draft is ready.</p><a class="draft-link wave-target"><span class="wave-text"><span class="sr-only">Open in email app</span><span class="wave-words" aria-hidden="true"><span class="wave-window"><span class="wave-glyph" data-char="Open">Open</span></span> <span class="wave-window"><span class="wave-glyph" data-char="in">in</span></span> <span class="wave-window"><span class="wave-glyph" data-char="email">email</span></span> <span class="wave-window"><span class="wave-glyph" data-char="app">app</span></span></span></span>${icon('arrow-up-right')}</a>`;
    contactForm.insertBefore(draftReady, contactForm.querySelector('noscript'));
    const draftLink = draftReady.querySelector('a');

    contactForm.addEventListener('submit', event => {
      event.preventDefault();
      if (!contactForm.reportValidity()) return;
      const fields = new FormData(contactForm);
      const name = String(fields.get('name') ?? '').trim();
      const email = String(fields.get('email') ?? '').trim();
      const message = String(fields.get('project') ?? fields.get('message') ?? '').trim();
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
      const to = contactForm.getAttribute('action') || emailLink?.getAttribute('href');
      if (!to?.startsWith('mailto:')) return;
      draftLink.href = `${to}?subject=${encodeURIComponent('Portfolio inquiry')}&body=${body}`;
      draftReady.hidden = false;
    });
    contactForm.addEventListener('input', () => {
      draftReady.hidden = true;
      draftLink.removeAttribute('href');
    });
  }
})();

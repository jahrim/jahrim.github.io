/*
 * Panel: opens and closes the games, and wires the page to the engine.
 * It slides over the sidebar from the left on desktop and tablet, and drops down from the top as a
 * full screen on phones, where the sidebar is the hamburger menu.
 */

export function initPanel(ui, engine) {
  var phone = window.matchMedia('(max-width: 767px)'); // the theme's smartphone layout
  var lastOpener = null;
  var inerted = [];

  function isOpen() {
    return ui.panel.classList.contains('is-open');
  }

  function setExpanded(value) {
    ui.openButtons.forEach(function (button) { button.setAttribute('aria-expanded', String(value)); });
  }

  // what the panel covers can't be used meanwhile: the sidebar on desktop and tablet,
  // the whole page on phones (where the panel is full screen)
  function blockBackground() {
    var covered = phone.matches
      ? Array.prototype.filter.call(document.body.children, function (el) { return el !== ui.panel && el.tagName !== 'SCRIPT'; })
      : [document.querySelector('body > header')].filter(Boolean);
    covered.forEach(function (el) { el.inert = true; });
    inerted = covered;
    document.documentElement.classList.toggle('relax-locked', phone.matches);
  }

  function unblockBackground() {
    inerted.forEach(function (el) { el.inert = false; });
    inerted = [];
    document.documentElement.classList.remove('relax-locked');
  }

  // the theme's hamburger menu toggles on a click of the mobile header
  function closeMobileMenu() {
    var hamburger = document.querySelector('.hamburger');
    var header = document.querySelector('.mobile-header');
    if (hamburger && header && hamburger.classList.contains('cross')) header.click();
  }

  function open(opener) {
    if (isOpen()) return;
    lastOpener = opener || null;
    if (phone.matches) closeMobileMenu(); // the game drops down over the page, not over the menu
    ui.panel.classList.add('is-open');
    ui.panel.setAttribute('aria-hidden', 'false');
    setExpanded(true);
    blockBackground();
    engine.resize();
    engine.run();
    ui.overlay.hidden ? ui.canvas.focus({ preventScroll: true }) : ui.overlayHint.focus({ preventScroll: true });
  }

  function close() {
    if (!isOpen()) return;
    engine.pause();
    ui.panel.classList.remove('is-open');
    ui.panel.setAttribute('aria-hidden', 'true');
    setExpanded(false);
    unblockBackground();
    engine.halt();
    // back to the entry that opened the panel, if it is still visible (the phone menu is closed by now)
    if (lastOpener && lastOpener.offsetParent !== null) lastOpener.focus({ preventScroll: true });
  }

  // the entries are links (to look like the other menu links): open the panel instead of jumping
  ui.openButtons.forEach(function (button) {
    button.addEventListener('click', function (event) { event.preventDefault(); open(button); });
  });
  ui.closeButton.addEventListener('click', close);
  ui.restartButton.addEventListener('click', engine.start);
  // leave the current run and go back to the game's start screen, where games can be switched
  ui.menuButton.addEventListener('click', function () { engine.load(engine.index()); ui.overlayHint.focus(); });
  ui.prevButton.addEventListener('click', function () { engine.load(engine.index() - 1); ui.overlayHint.focus(); });
  ui.nextButton.addEventListener('click', function () { engine.load(engine.index() + 1); ui.overlayHint.focus(); });
  ui.prevButton.disabled = ui.nextButton.disabled = engine.gameCount < 2;

  // only the overlay's button starts or resumes: clicks elsewhere on the overlay are ignored
  ui.overlayHint.addEventListener('click', function () {
    if (engine.status() === 'paused') engine.resume();
    else engine.start();
  });

  // follow the input actually in use for the controls icon (touch or mouse)
  document.addEventListener('pointerdown', function (event) {
    if (event.pointerType === '') return;
    engine.setTouch(event.pointerType === 'touch' || event.pointerType === 'pen');
  }, true);

  ui.canvas.tabIndex = -1;
  ui.canvas.addEventListener('pointerdown', function (event) {
    var rect = ui.canvas.getBoundingClientRect();
    if (engine.pointerDown(event.clientX - rect.left, event.clientY - rect.top, event.button, event.pointerType)) {
      event.preventDefault();
    }
  });
  ui.canvas.addEventListener('contextmenu', function (event) { event.preventDefault(); });

  document.addEventListener('keydown', function (event) {
    if (!isOpen()) return;
    if (event.key === 'Escape') {
      close();
    } else if (engine.keyDown(event.key)) {
      event.preventDefault();
    }
  });

  // pause when the page is hidden, and close when switching between the phone and the larger layouts
  document.addEventListener('visibilitychange', function () { if (document.hidden) engine.pause(); });
  phone.addEventListener('change', close);
  // keep the canvas resolution in sync with the stage, whatever changes its size (window, zoom, layout)
  if ('ResizeObserver' in window) {
    new ResizeObserver(engine.resize).observe(ui.stage);
  } else {
    window.addEventListener('resize', engine.resize);
  }
}
